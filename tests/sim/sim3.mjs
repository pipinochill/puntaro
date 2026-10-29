// Balance simulation for Puntaro, using the app's own scoring code (game.mjs is pulled from src/app.jsx).
import { puntCalc, drawCards, courseHcp, mulberry32, cardHole, PAR, SI } from "./game.mjs";
const COURSE = { slope: 125, rating: 72.0, par: 72 };
const OPTS = { cards: true, catchup: true, bonuses: false, penalties: false, ntp: true, cushion: true };

// ---- score model: strokes over par on a hole for a course handicap ch.
// Higher handicaps average more over par (as their handicap says) AND swing more hole to hole, with more blow-ups.
function gauss(rng) { let u = 0, v = 0; while (!u) u = rng(); while (!v) v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function holeScore(ch, h, rng, flat) {
  // average round = course rating + course handicap + about 2.5 (how handicaps work out in practice)
  const pb = flat ? 0.04 : 0.015 + 0.002 * ch;
  const mu = (ch + 2.5) / 18 - 2 * pb + (9.5 - SI[h]) * 0.02 * (1 + ch / 18);
  const sd = flat ? 0.95 : 0.8 + 0.015 * ch;
  let x = mu + sd * gauss(rng);
  if (rng() < pb) x += 2; // blow-up hole
  const over = Math.max(-2, Math.round(x));
  return Math.max(1, PAR[h] + over);
}

// ---- banking styles. Called after each hole with that hole's result; true = bank now.
const STYLES = {
  never: () => false,
  always: s => s.pot > 0,
  greedy: s => s.pot >= 15,
  steady: s => s.pot >= 8,
  smart: (s, h, lead) => s.pot > 0 && ((s.pot >= 8 && s.streak < 2) || s.pot >= 20 || cardHole(h + 1) && s.pot >= 5 || (lead && h >= 14)),
  casual: (s, h, lead, rng) => s.pot > 0 && rng() < 0.3,
};

function playRound(players, rng, opts = {}) {
  const ids = players.map((_, i) => "p" + i);
  const r = { playerIds: ids, scores: {}, bank: {}, events: {}, draws: {}, ntp: {}, opts: OPTS, useHcp: true, hcp: {}, mode: "ffa" };
  ids.forEach((id, i) => { r.scores[id] = Array(18).fill(null); r.bank[id] = Array(18).fill(false); r.events[id] = {}; r.hcp[id] = courseHcp(players[i].hi, COURSE); });
  const at12 = {};
  for (let h = 0; h < 18; h++) {
    if (OPTS.cards && cardHole(h)) r.draws[h] = drawCards(r, h, rng);
    ids.forEach((id, i) => { r.scores[id][h] = holeScore(r.hcp[id], h, rng, opts.flat); });
    if (opts.ntp === "off") r.ntp[h] = "none";
    else if (PAR[h] === 3 && rng() < 0.7) { // someone hits the green closest: lower handicaps more often
      const w = ids.map(id => (opts.ntp === "equal" ? 1 : Math.exp(-r.hcp[id] / 14))); const t = w.reduce((a, b) => a + b); let x = rng() * t;
      r.ntp[h] = ids.find((id, k) => (x -= w[k]) <= 0) || ids[0];
    } else if (PAR[h] === 3) r.ntp[h] = "none";
    const pc = puntCalc(r, h + 1);
    const best = Math.max(...ids.map(id => pc[id].total));
    if (h < 17) ids.forEach((id, i) => { r.bank[id][h] = STYLES[players[i].style](pc[id], h, pc[id].total === best, rng); });
    if (h === 11) { const p2 = puntCalc(r, 12); ids.forEach(id => (at12[id] = p2[id].total)); }
  }
  const pc = puntCalc(r);
  return { ids, pc, at12, busts: ids.map(id => pc[id].busts), r };
}

function run(name, players, N, opts = {}) {
  const rng = mulberry32(12345);
  const wins = players.map(() => 0), pts = players.map(() => 0), busts = players.map(() => 0);
  let lastWins = 0, lastCount = 0, leadWins = 0, leadCount = 0, margin = 0, close = 0, lastTop2 = 0;
  for (let n = 0; n < N; n++) {
    const g = playRound(players, rng, opts);
    const tot = g.ids.map(id => g.pc[id].total); const best = Math.max(...tot);
    const winners = g.ids.filter((id, i) => tot[i] === best);
    g.ids.forEach((id, i) => { if (tot[i] === best) wins[i] += 1 / winners.length; pts[i] += tot[i]; busts[i] += g.busts[i]; });
    const s12 = g.ids.map(id => g.at12[id]); const lo = Math.min(...s12), hi = Math.max(...s12);
    const sorted = [...tot].sort((a, b) => b - a); margin += sorted[0] - sorted[1]; if (sorted[0] - sorted[1] <= 5) close++;
    g.ids.forEach((id, i) => {
      if (s12[i] === lo && hi > lo) { lastCount++; if (tot[i] === best) lastWins++; if (tot[i] >= sorted[1]) lastTop2++; }
      if (s12[i] === hi && hi > lo) { leadCount++; if (tot[i] === best) leadWins++; }
    });
  }
  return { name, players: players.map((p, i) => ({ ...p, win: wins[i] / N, pts: pts[i] / N, busts: busts[i] / N })),
    lastAfter12Wins: lastWins / lastCount, lastAfter12Top2: lastTop2 / lastCount, leaderAfter12Wins: leadWins / leadCount, avgMargin: margin / N, closeFinish: close / N };
}


// ---- 2v2: teams 0 and 1, team total = both players' points added up
function runTeams(name, players, teams, N, holex) {
  globalThis.HOLEX = holex ? holex(teams) : null;
  const rng = mulberry32(999);
  let w0 = 0, w1 = 0, ties = 0, trailN = 0, trailWins = 0, close = 0, margin = 0;
  for (let n = 0; n < N; n++) {
    const g = playRound(players, rng);
    const tot = [0, 0], at12 = [0, 0];
    g.ids.forEach((id, i) => { tot[teams[i]] += g.pc[id].total; at12[teams[i]] += g.at12[id]; });
    if (tot[0] > tot[1]) w0++; else if (tot[1] > tot[0]) w1++; else ties++;
    margin += Math.abs(tot[0] - tot[1]); if (Math.abs(tot[0] - tot[1]) <= 5) close++;
    if (at12[0] !== at12[1]) { trailN++; const t = at12[0] < at12[1] ? 0 : 1; if (tot[t] > tot[1 - t]) trailWins++; }
  }
  globalThis.HOLEX = null;
  return { name, team1: w0 / N, team2: w1 / N, ties: ties / N, trailingAfter12Wins: trailWins / trailN, close: close / N, margin: margin / N };
}
// standings at the start of a hole (cached per hole), from the scoring state
const standings = () => { let key = null, val = null; return (r, h, S, ids, f) => { const k = r.playerIds.join() + h + JSON.stringify(r.scores[r.playerIds[0]].slice(0, h)); if (k !== key) { key = k; val = f(ids.map(m => S[m].banked + S[m].pot)); } return val; }; };
const RULES = {
  "Now": null,
  "Proposed as-is (last PLAYER x2 from 13, 18th x2)": teams => { const st = standings(); return (r, id, h, S, ids) => {
    const last = h < 12 ? [] : st(r, h, S, ids, t => { const lo = Math.min(...t), hi = Math.max(...t); return hi > lo ? ids.filter((m, i) => t[i] === lo) : []; });
    return (last.includes(id) ? 2 : 1) * (h === 17 ? 2 : 1); }; },
  "Team version (trailing TEAM x2 from 13, 18th x2)": teams => { const st = standings(); return (r, id, h, S, ids) => {
    const trail = h < 12 ? null : st(r, h, S, ids, t => { const tt = [0, 0]; t.forEach((v, i) => (tt[teams[i]] += v)); return tt[0] === tt[1] ? null : tt[0] < tt[1] ? 0 : 1; });
    return (trail !== null && teams[ids.indexOf(id)] === trail ? 2 : 1) * (h === 17 ? 2 : 1); }; },
};
const teamRule = (from, x) => teams => { const st = standings(); return (r, id, h, S, ids) => {
  const trail = h < from ? null : st(r, h, S, ids, t => { const tt = [0, 0]; t.forEach((v, i) => (tt[teams[i]] += v)); return tt[0] === tt[1] ? null : tt[0] < tt[1] ? 0 : 1; });
  return (trail !== null && teams[ids.indexOf(id)] === trail ? x : 1) * (h === 17 ? 2 : 1); }; };
RULES["Trailing team x1.5 from 13, 18th x2"] = teamRule(12, 1.5);
RULES["Trailing team x2 from 16, 18th x2"] = teamRule(15, 2);
RULES["Just 18th x2"] = () => (r, id, h) => (h === 17 ? 2 : 1);
const N = +(process.argv[2] || 5000);
const setups = {
  "Even teams (4+28 vs 12+20, what Auto-balance picks)": { players: [{ hi: 4, style: "smart" }, { hi: 28, style: "smart" }, { hi: 12, style: "smart" }, { hi: 20, style: "smart" }], teams: [0, 0, 1, 1] },
  "Lopsided teams (4+12 vs 20+28)": { players: [{ hi: 4, style: "smart" }, { hi: 12, style: "smart" }, { hi: 20, style: "smart" }, { hi: 28, style: "smart" }], teams: [0, 0, 1, 1] },
  "Four 14s (pure luck, should be 50/50)": { players: [14, 14, 14, 14].map(hi => ({ hi, style: "smart" })), teams: [0, 0, 1, 1] },
};
const out = {};
for (const [sn, su] of Object.entries(setups)) { out[sn] = {}; for (const [rn, fn] of Object.entries(RULES)) out[sn][rn] = runTeams(rn, su.players, su.teams, N, fn); }
console.log(JSON.stringify(out, null, 1));
