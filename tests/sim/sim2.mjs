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

// ---- comeback ideas, applied to each hole's points
const VARIANTS = {
  "Now (as built)": null,
  "Closing holes x2 (16-18)": (r, id, h) => (h >= 15 ? 2 : 1),
  "18th x3": (r, id, h) => (h === 17 ? 3 : 1),
  "Underdog x2 from 13 (last place only)": (() => { let key = null, last = null; return (r, id, h, S, ids) => {
    if (h < 12) return 1;
    const k = r.playerIds.join() + h + JSON.stringify(r.scores[r.playerIds[0]].slice(0, h));
    if (k !== key) { key = k; const t = ids.map(m => S[m].banked + S[m].pot); const lo = Math.min(...t), hi = Math.max(...t); last = hi > lo ? ids.filter((m, i) => t[i] === lo) : []; }
    return last.includes(id) ? 2 : 1; }; })(),
  "Chasers x1.5 from 13 (everyone but the leader)": (() => { let key = null, lead = null; return (r, id, h, S, ids) => {
    if (h < 12) return 1;
    const k = r.playerIds.join() + h + JSON.stringify(r.scores[r.playerIds[0]].slice(0, h));
    if (k !== key) { key = k; const t = ids.map(m => S[m].banked + S[m].pot); const hi = Math.max(...t); lead = ids.filter((m, i) => t[i] === hi); }
    return lead.includes(id) ? 1 : 1.5; }; })(),
};

const N = +(process.argv[2] || 4000);
const out = {};
const mixed = s => [4, 12, 20, 28].map(hi => ({ hi, style: s }));
out.calibration = (() => { const rng = mulberry32(7); return [0, 5, 10, 15, 20, 25, 30, 36].map(hi => {
  const ch = courseHcp(hi, COURSE); let g = 0, nd = 0; const R = 3000;
  for (let n = 0; n < R; n++) for (let h = 0; h < 18; h++) { const s = holeScore(ch, h, rng); g += s; const st = Math.floor(ch / 18) + (SI[h] <= ch % 18 ? 1 : 0); if (s - st - PAR[h] >= 2) nd++; }
  return { hi, courseHcp: ch, avgGross: +(g / R).toFixed(1), netDoublesPerRound: +(nd / R).toFixed(2) }; }); })();
out.handicapFairness = {};
for (const [vn, fn] of Object.entries(VARIANTS)) { globalThis.HOLEX = fn; out.handicapFairness[vn] = run(vn, mixed("smart"), N); }
globalThis.HOLEX = null;
out.handicapFairnessFlatVariance = run("same swing for every handicap", mixed("smart"), N, { flat: true });
out.handicapFairnessCasual = run("casual bankers", mixed("casual"), N);
out.styles = run("styles, all 14 handicap", ["never", "always", "steady", "greedy", "smart", "casual"].map(style => ({ hi: 14, style })), N);
const U = VARIANTS["Underdog x2 from 13 (last place only)"];
out.more = {};
globalThis.NTPPTS = 2; out.more.a = run("NTP +2", mixed("smart"), N); globalThis.NTPPTS = 3;
globalThis.BUSTAT = (r, id) => (r.hcp[id] >= 18 ? 3 : 2); out.more.b = run("bust at net triple if course hcp 18+", mixed("smart"), N);
globalThis.NTPPTS = 2; out.more.c = run("net triple 18+ and NTP +2", mixed("smart"), N);
globalThis.HOLEX = U; out.more.d = run("package: underdog x2 + triple 18+ + NTP +2", mixed("smart"), N);
globalThis.HOLEX = (r, id, h, S, ids) => U(r, id, h, S, ids) * (h === 17 ? 2 : 1); out.more.e = run("package + 18th x2", mixed("smart"), N);
globalThis.BUSTAT = null; globalThis.NTPPTS = 3; globalThis.HOLEX = null;
console.log(JSON.stringify(out, null, 1));
