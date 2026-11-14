/* Solo rounds: strokes gained from a few taps a hole, and the trends that fall out of them.

   Benchmarks
   - Tour baseline (average strokes to hole out by distance and lie): Mark Broadie, "Assessing Golfer Performance
     on the PGA TOUR" (2012), Table B.1, PGA TOUR ShotLink 2003 to 2010. Yards.
   - Tour putting baseline (average putts by distance): PGA TOUR "Strokes Gained - Putting" 2010 baseline. Feet.
   - Handicap benchmark: an ESTIMATE, not a published table. A handicap-H golfer is taken to average
     4.3 + 1.08 x H strokes a round more than the tour baseline, split 20% tee shots, 45% approach, 19% short game,
     16% putting. That follows Broadie's finding (about two thirds long game, about 15% putting), with the tee share
     trimmed because without drive distances this model can only see part of what a tee shot costs.
   The app has no hole lengths or shot positions, so every hole uses a typical length for its par and the middle of
   each distance band. Good for spotting patterns over a few rounds; not shot-tracker precision. */

const YD = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 120, 140, 160, 180, 200, 220, 240, 260, 280, 300, 320, 340, 360, 380, 400, 420, 440, 460, 480, 500, 520, 540, 560, 580, 600];
const LONG = {
  tee: [2.92, 2.99, 2.97, 2.99, 3.05, 3.12, 3.17, 3.25, 3.45, 3.65, 3.71, 3.79, 3.86, 3.92, 3.96, 3.99, 4.02, 4.08, 4.17, 4.28, 4.41, 4.54, 4.65, 4.74, 4.79, 4.82],
  fwy: [2.18, 2.40, 2.52, 2.60, 2.66, 2.70, 2.72, 2.75, 2.77, 2.80, 2.85, 2.91, 2.98, 3.08, 3.19, 3.32, 3.45, 3.58, 3.69, 3.78, 3.84, 3.88, 3.95, 4.03, 4.11, 4.19, 4.27, 4.34, 4.42, 4.50, 4.58, 4.66, 4.74, 4.82, 4.89],
  rgh: [2.34, 2.59, 2.70, 2.78, 2.87, 2.91, 2.93, 2.96, 2.99, 3.02, 3.08, 3.15, 3.23, 3.31, 3.42, 3.53, 3.64, 3.74, 3.83, 3.90, 3.95, 4.02, 4.11, 4.21, 4.30, 4.40, 4.49, 4.58, 4.68, 4.77, 4.87, 4.96, 5.06, 5.15, 5.25],
  rec: [3.45, 3.51, 3.57, 3.71, 3.79, 3.83, 3.84, 3.84, 3.82, 3.80, 3.78, 3.80, 3.81, 3.82, 3.87, 3.92, 3.97, 4.03, 4.10, 4.20, 4.31, 4.44, 4.56, 4.66, 4.75, 4.84, 4.94, 5.03, 5.13, 5.22, 5.32, 5.41, 5.51, 5.60, 5.70],
};
const PUTT = [[1, 1.001], [2, 1.009], [3, 1.053], [4, 1.147], [5, 1.256], [6, 1.357], [7, 1.443], [8, 1.515], [9, 1.575], [10, 1.626], [12, 1.705], [15, 1.790], [20, 1.878], [25, 1.934], [30, 1.978], [40, 2.055], [50, 2.135], [60, 2.218], [75, 2.324], [90, 2.379]];
const lerp = (pts, x) => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const [a, va] = pts[i - 1], [b, vb] = pts[i]; return va + ((vb - va) * (x - a)) / (b - a); }
  return pts[pts.length - 1][1];
};
/** Tour average strokes to hole out from `yd` yards on a lie: tee, fwy, rgh or rec (recovery). */
export function expStrokes(lie, yd) {
  const v = LONG[lie]; const off = YD.length - v.length; // the tee table starts at 100 yards
  return lerp(v.map((s, i) => [YD[i + off], s]), yd);
}
/** Tour average putts from `ft` feet. */
export const expPutts = ft => lerp(PUTT, ft);

const M = 1.0936; // yards in a metre
export const AP = [["Under 50", 30], ["50–100", 75], ["100–150", 125], ["150–200", 175], ["200+", 215]].map(([label, m]) => ({ label, m, yd: m * M }));
export const FP = [["Under 1 m", 0.6], ["1–3 m", 2], ["3–6 m", 4.5], ["6–10 m", 8], ["10 m+", 13]].map(([label, m]) => ({ label, m, ft: m * 3.281 }));
export const TEE = [["L", "Left"], ["F", "Fairway"], ["R", "Right"], ["T", "Trouble"]];
export const CATS = [["tee", "Off the tee"], ["app", "Approach"], ["short", "Short game"], ["putt", "Putting"]];
export const CAT_NAME = Object.fromEntries(CATS);
const LEN = { 3: 160, 4: 385, 5: 515, 6: 620 }; // typical hole length by par, yards
const SHORT = 2.5; // tour average from about 20 yards off the green (fairway 2.40, rough 2.59)
export const SHARE = { tee: 0.2, app: 0.45, short: 0.19, putt: 0.16 };
/** Strokes a round a handicap-H golfer gives up to the tour baseline (estimate). */
export const gapFor = H => 4.3 + 1.08 * H;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

/** One hole against the tour baseline. e = { s, tee, ap, gr, p, fp }. Parts are null when the answer needed is missing. */
export function holeSG(par, e) {
  if (!e || e.s == null) return null;
  const S = e.s; const drive = par >= 4;
  const P = e.p == null ? null : Math.min(e.p, S - 1);
  const L = !drive && e.ap != null ? AP[e.ap].yd : LEN[par] || LEN[4];
  const total = expStrokes("tee", L) - S;
  const out = { total, tee: null, app: null, short: null, putt: null };
  if (P == null || e.pu) return out; // a picked-up hole counts for the total only
  const pen = e.pen || 0;
  const ft = e.fp != null ? FP[e.fp].ft : e.gr === false ? 8 : e.gr === true ? 26 : 16; // no answer: a typical first putt
  const onGreen = P === 0 ? 0 : expPutts(ft);
  out.putt = P === 0 ? 0 : onGreen - P;
  let teeV = 0;
  if (drive) {
    const R = par === 4 && e.ap != null ? AP[e.ap].yd : L - 230;
    const after = e.tee === "F" ? expStrokes("fwy", R) : e.tee === "L" || e.tee === "R" ? expStrokes("rgh", R) : e.tee === "T" ? expStrokes("rec", L - 200) : (expStrokes("fwy", R) + expStrokes("rgh", R)) / 2;
    teeV = expStrokes("tee", L) - 1 - after - (e.tee === "T" ? Math.min(pen, 2) : 0); // penalties after a tee shot in trouble belong to the tee shot
    if (e.tee) out.tee = teeV;
  }
  if (e.gr == null) return out;
  out.short = e.gr ? 0 : SHORT - clamp(S - P - pen - Math.max(1, par - 2), 1, 2) - onGreen;
  out.app = total - out.putt - out.short - teeV;
  return out;
}

const played = r => r.h.map((e, i) => (e && e.s != null ? i : -1)).filter(i => i >= 0);
export const holesPlayed = r => played(r).length;
export const grossOf = r => played(r).reduce((a, i) => a + r.h[i].s, 0);
export const parOf = r => played(r).reduce((a, i) => a + r.holes[i].par, 0);
const girOf = (par, e) => (e.p == null || e.pu ? null : e.s - Math.min(e.p, e.s - 1) <= par - 2);
const upDown = (par, e) => (e.gr !== false || e.p == null || e.pu ? null : e.p <= 1 && e.s - e.p <= par - 1);

/** A whole round. H: the handicap to compare with (null = the round's own course handicap). */
export function roundSG(r, H = null) {
  const hcp = H == null ? r.ch || 0 : H; const gap = gapFor(hcp);
  const nDrive = r.holes.filter(h => h.par >= 4).length || 1;
  const per = { tee: (gap * SHARE.tee) / nDrive, app: (gap * SHARE.app) / 18, short: (gap * SHARE.short) / 18, putt: (gap * SHARE.putt) / 18 };
  const cats = {}; const pro = {};
  ["tee", "app", "short", "putt"].forEach(c => { cats[c] = { sg: 0, n: 0 }; pro[c] = { sg: 0, n: 0 }; });
  const tot = { sg: 0, n: 0 }; const st = { fw: [0, 0], gir: [0, 0], ud: [0, 0], putts: 0, puttHoles: 0, three: 0, one: 0, trouble: 0, left: 0, right: 0, green: [0, 0], pen: 0, pu: 0 };
  const holes = [];
  played(r).forEach(i => {
    const par = r.holes[i].par; const e = r.h[i]; const g = holeSG(par, e);
    tot.sg += g.total + gap / 18; tot.n++;
    ["tee", "app", "short", "putt"].forEach(c => { if (g[c] != null) { cats[c].sg += g[c] + per[c]; cats[c].n++; pro[c].sg += g[c]; pro[c].n++; } });
    if (par >= 4 && e.tee) { st.fw[1]++; if (e.tee === "F") st.fw[0]++; if (e.tee === "T") st.trouble++; if (e.tee === "L") st.left++; if (e.tee === "R") st.right++; }
    st.pen += e.pen || 0; if (e.pu) st.pu++;
    const gir = girOf(par, e); if (gir != null) { st.gir[1]++; if (gir) st.gir[0]++; }
    if (e.gr != null) { st.green[1]++; if (e.gr) st.green[0]++; }
    const ud = upDown(par, e); if (ud != null) { st.ud[1]++; if (ud) st.ud[0]++; }
    if (e.p != null) { st.putts += e.p; st.puttHoles++; if (e.p >= 3) st.three++; if (e.p === 1) st.one++; }
    holes.push({ i, par, e, g });
  });
  // "Plays like": the handicap whose benchmark this part of the game matched, scaled up to a full round.
  const like = {};
  ["tee", "app", "short", "putt"].forEach(c => { const full = c === "tee" ? nDrive : 18; like[c] = pro[c].n >= 6 ? clamp((-(pro[c].sg / pro[c].n) * full / SHARE[c] - 4.3) / 1.08, -5, 54) : null; });
  return { hcp, n: tot.n, gross: grossOf(r), par: parOf(r), total: tot, cats, pro, like, st, holes, nDrive };
}

/* ───────── Trends ───────── */
const avg = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const f1 = x => (Math.round(x * 10) / 10).toFixed(1);
const sgn = x => (x > 0 ? "+" : x < 0 ? "−" : "") + f1(Math.abs(x));
const outOf10 = (a, b) => { const k = Math.round((a / b) * 10); return k <= 0 ? "almost none" : k >= 10 ? "nearly all" : `${k} in 10`; };
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
const LOW = { tee: "tee shots", app: "approach shots", short: "short game", putt: "putting" };
const PLAY = { tee: "are", app: "are", short: "is", putt: "is" };
const hcpWord = h => (h <= 0.5 ? "a scratch golfer" : `a ${Math.round(h)} handicapper`);
const FIX = {
  tee: "Pick the club that finds the fairway, not the longest one.",
  app: "Aim at the middle of the green and take one more club.",
  short: "Practise the plain chip that lands a few steps on and rolls out.",
  putt: "Spend ten minutes on pace before you play: long putts to tap-in range.",
};

/** Every hole of every round, flattened, with what's needed to slice it. rounds: oldest first. */
function flat(rounds) {
  const out = [];
  rounds.forEach((r, ri) => played(r).forEach(i => { const e = r.h[i]; const par = r.holes[i].par; out.push({ ri, i, par, si: r.holes[i].si, e, over: e.s - par, course: r.course.name }); }));
  return out;
}
/** Strokes gained per full round for each part of the game, one row per round (null where there's too little to go on). */
export function perRound(rounds, H = null) {
  return rounds.map(r => {
    const g = roundSG(r, H); const row = { at: r.at, n: g.n, over18: g.n ? ((g.gross - g.par) / g.n) * 18 : null, gross: g.gross, total: g.n >= 9 ? (g.total.sg / g.n) * 18 : null };
    ["tee", "app", "short", "putt"].forEach(c => { const full = c === "tee" ? g.nDrive : 18; row[c] = g.cats[c].n >= 6 ? (g.cats[c].sg / g.cats[c].n) * full : null; });
    return row;
  });
}

/** Patterns across rounds. Returns [{ id, tone: good | bad | info, title, text, w }], most useful first. */
export function insights(rounds, H = null) {
  const out = []; const add = (id, tone, title, text, w) => out.push({ id, tone, title, text, w });
  if (!rounds.length) return out;
  const last = rounds.slice(-8); const rows = perRound(last, H); const all = flat(last); const nR = last.length;
  const span = nR === 1 ? "this round" : `your last ${nR} rounds`;
  const full = rows.filter(r => r.n === 18);

  // Where the shots go: weakest and strongest part of the game
  const cat = {}; ["tee", "app", "short", "putt"].forEach(c => { const v = rows.map(r => r[c]).filter(x => x != null); if (v.length) cat[c] = avg(v); });
  const ranked = Object.keys(cat).sort((a, b) => cat[a] - cat[b]);
  if (ranked.length >= 2) {
    const worst = ranked[0], best = ranked[ranked.length - 1];
    if (cat[worst] <= -0.5) add("weak", "bad", `Work on this: ${LOW[worst]}`, `${sgn(cat[worst])} a round over ${span}, your biggest leak. ${FIX[worst]}`, 100);
    if (cat[best] >= 0.5) add("strong", "good", `Your strength: ${LOW[best]}`, `${sgn(cat[best])} a round over ${span}. Lean on it.`, 90);
  }
  // Plays like
  const like = {}; { const sum = {}; const n = {}; last.forEach(r => { const g = roundSG(r, H); ["tee", "app", "short", "putt"].forEach(c => { if (g.like[c] != null) { sum[c] = (sum[c] || 0) + g.like[c]; n[c] = (n[c] || 0) + 1; } }); }); Object.keys(sum).forEach(c => (like[c] = sum[c] / n[c])); }
  const lk = Object.keys(like).sort((a, b) => like[a] - like[b]);
  if (lk.length >= 2 && like[lk[lk.length - 1]] - like[lk[0]] >= 6) add("like", "info", "Two different golfers", `Your ${LOW[lk[0]]} ${PLAY[lk[0]]} like ${hcpWord(like[lk[0]])}'s. Your ${LOW[lk[lk.length - 1]]} ${PLAY[lk[lk.length - 1]]} like ${hcpWord(like[lk[lk.length - 1]])}'s.`, 85);

  // Off the tee
  const tees = all.filter(x => x.par >= 4 && x.e.tee);
  const L = tees.filter(x => x.e.tee === "L").length, R = tees.filter(x => x.e.tee === "R").length, T = tees.filter(x => x.e.tee === "T").length;
  if (L + R >= 6 && Math.max(L, R) / (L + R) >= 0.65) { const side = R > L ? "right" : "left"; add("side", "bad", `Your miss is ${side}`, `${Math.max(L, R)} of your ${L + R} missed fairways went ${side}. Aim a little ${side === "right" ? "left" : "right"} of your target and let it drift back.`, 80); }
  if (tees.length >= 14) {
    const per = (T / tees.length) * 14;
    if (per >= 2) add("trouble", "bad", "Trouble off the tee", `About ${f1(per)} tee shots a round end up in trouble. Each one costs close to a full stroke.`, 78);
    else if (per <= 0.5) add("inplay", "good", "You keep it in play", `Only ${plural(T, "tee shot")} in trouble out of ${tees.length}.`, 40);
  }
  const hit = tees.filter(x => x.e.tee === "F"), miss = tees.filter(x => x.e.tee !== "F");
  if (hit.length >= 5 && miss.length >= 5) { const d = avg(miss.map(x => x.over)) - avg(hit.map(x => x.over)); if (d >= 0.3) add("fwcost", "info", "Fairways matter for you", `You score ${f1(d)} of a stroke worse on holes where you miss the fairway.`, 55); }

  if (all.length >= 18) {
    const pens = all.reduce((a, x) => a + (x.e.pen || 0), 0); const per = (pens / all.length) * 18;
    if (per >= 2) add("pens", "bad", "Penalty shots are expensive", `About ${f1(per)} a round over ${span}. That's ${f1(per)} strokes before you've hit a bad shot in play.`, 79);
    const pus = all.filter(x => x.e.pu).length; if ((pus / all.length) * 18 >= 2) add("pickups", "info", "A few holes get away", `You pick up about ${f1((pus / all.length) * 18)} holes a round. Each counts as a net double bogey.`, 56);
  }
  // Approach
  const aps = AP.map((b, k) => { const v = all.filter(x => x.e.ap === k && x.e.gr != null); return { k, label: b.label, n: v.length, hit: v.filter(x => x.e.gr).length }; }).filter(b => b.n >= 5);
  if (aps.length >= 2) {
    const s = [...aps].sort((a, b) => b.hit / b.n - a.hit / a.n); const top = s[0], bot = s[s.length - 1];
    if (top.hit / top.n - bot.hit / bot.n >= 0.2) {
      add("zone", "good", `Your scoring zone: ${top.label} m`, `You hit the green ${outOf10(top.hit, top.n)} times from there (${top.hit} of ${top.n}). Try to leave yourself that distance.`, 70);
      add("farzone", "bad", `${bot.label} m is hard work`, `Only ${bot.hit} of ${bot.n} greens hit from there. Play for the front edge or the fat side, not the flag.`, 62);
    }
  }
  const gir = all.filter(x => girOf(x.par, x.e) != null);
  if (gir.length >= 18) { const per = (gir.filter(x => girOf(x.par, x.e)).length / gir.length) * 18; if (per >= 8) add("gir", "good", "Lots of greens", `About ${f1(per)} greens in regulation a round.`, 35); else if (per <= 3) add("gir", "info", "Few greens in regulation", `About ${f1(per)} a round, so your chipping and putting carry the score.`, 45); }

  // Short game
  const uds = all.filter(x => upDown(x.par, x.e) != null);
  if (uds.length >= 8) { const ok = uds.filter(x => upDown(x.par, x.e)).length; const p = ok / uds.length; if (p >= 0.4) add("updown", "good", "Tidy around the greens", `You get up and down ${outOf10(ok, uds.length)} times (${ok} of ${uds.length}).`, 50); else if (p <= 0.15) add("updown", "bad", "Missed greens are costing two", `You got up and down ${ok} of ${uds.length} times. Getting the chip inside 3 m is the first goal.`, 66); }

  // Putting
  const pts = all.filter(x => x.e.p != null);
  if (pts.length >= 18) {
    const three = (pts.filter(x => x.e.p >= 3).length / pts.length) * 18;
    if (three >= 2) add("three", "bad", "Three-putts are adding up", `About ${f1(three)} a round over ${span}.`, 72);
    else if (three <= 0.5) add("three", "good", "Hardly any three-putts", `${plural(pts.filter(x => x.e.p >= 3).length, "three-putt")} in ${pts.length} holes.`, 38);
  }
  const shortP = all.filter(x => x.e.fp === 1 && x.e.p >= 1);
  if (shortP.length >= 8) { const made = shortP.filter(x => x.e.p === 1).length; add("short13", made / shortP.length >= 0.5 ? "good" : made / shortP.length <= 0.3 ? "bad" : "info", "From 1 to 3 metres", `You hole ${outOf10(made, shortP.length)} (${made} of ${shortP.length}). Tour players hole about 6 in 10 from there.`, made / shortP.length <= 0.3 ? 64 : 42); }
  const lag = all.filter(x => x.e.fp >= 3 && x.e.p >= 1);
  if (lag.length >= 8) { const bad = lag.filter(x => x.e.p >= 3).length; const p = bad / lag.length; if (p >= 0.25) add("lag", "bad", "Long putts: pace is the problem", `From 6 m and out you three-putt ${outOf10(bad, lag.length)} times (${bad} of ${lag.length}).`, 68); else if (p <= 0.08) add("lag", "good", "Good pace on long putts", `${plural(bad, "three-putt")} from ${lag.length} putts of 6 m or more.`, 36); }

  // Scoring shape
  const byPar = [3, 4, 5].map(p => { const v = all.filter(x => x.par === p); return { p, n: v.length, over: avg(v.map(x => x.over)) }; }).filter(x => x.n >= 6);
  if (byPar.length >= 2) { const s = [...byPar].sort((a, b) => b.over - a.over); if (s[0].over - s[s.length - 1].over >= 0.3) add("partype", "info", `Par ${s[0].p}s are your toughest`, `${sgn(s[0].over)} a hole on par ${s[0].p}s, ${sgn(s[s.length - 1].over)} on par ${s[s.length - 1].p}s.`, 58); }
  const r18 = last.filter(r => holesPlayed(r) === 18);
  if (r18.length >= 2) {
    const nine = (r, a, b) => r.h.slice(a, b).reduce((s, e, k) => s + e.s - r.holes[a + k].par, 0);
    const d = avg(r18.map(r => nine(r, 9, 18) - nine(r, 0, 9)));
    if (d >= 1.5) add("nines", "bad", "You fade on the back nine", `${f1(d)} shots worse than your front nine, on average. Eat and drink at the turn, and keep the same routine.`, 60);
    else if (d <= -1.5) add("nines", "info", "Slow starter", `Your front nine is ${f1(-d)} shots worse than your back nine. A proper warm-up could be worth a shot or two.`, 60);
    const seg = (a, b) => avg(r18.flatMap(r => r.h.slice(a, b).map((e, k) => e.s - r.holes[a + k].par)));
    const open = seg(0, 3) - seg(3, 18), close = seg(15, 18) - seg(0, 15);
    if (open >= 0.35) add("open", "bad", "The first three holes hurt", `${sgn(open)} a hole worse than the rest of your round.`, 52);
    if (close >= 0.35) add("close", "bad", "Shots slip away at the finish", `Holes 16 to 18 run ${sgn(close)} a hole worse than the rest.`, 52);
    else if (close <= -0.35) add("close", "good", "Strong finisher", `Holes 16 to 18 are ${f1(-close)} a hole better than the rest.`, 34);
  }
  if (all.length >= 18) {
    const blow = all.filter(x => x.over >= 2); const per = (blow.length / all.length) * 18;
    if (per >= 3) add("blow", "bad", "Big numbers", `About ${f1(per)} double bogeys or worse a round. Turning half of them into bogeys saves ${f1(per / 2)} shots.`, 74);
    else if (per <= 1) add("blow", "good", "You avoid the big numbers", `Under ${per < 0.5 ? "one double bogey every two rounds" : "one double bogey a round"}.`, 37);
    const next = blow.map(x => all.find(y => y.ri === x.ri && y.i === x.i + 1)).filter(Boolean);
    if (next.length >= 5) { const d = avg(next.map(x => x.over)) - avg(all.map(x => x.over)); if (d >= 0.4) add("bounce", "bad", "One bad hole becomes two", `After a double bogey or worse, your next hole is ${f1(d)} worse than usual. Take a breath on the next tee.`, 65); else if (d <= -0.2) add("bounce", "good", "You bounce back", `After a bad hole your next one is better than your usual.`, 44); }
    const hard = all.filter(x => x.si <= 6), easy = all.filter(x => x.si >= 13);
    if (hard.length >= 9 && easy.length >= 9) { const d = avg(hard.map(x => x.over)) - avg(easy.map(x => x.over)); if (d >= 1) add("hard", "info", "The hard holes bite", `Index 1 to 6 cost you ${f1(d)} a hole more than the easy ones. A bogey there is a fine score.`, 46); else if (d <= 0.2) add("hard", "good", "You handle the hard holes", `You score almost the same on the hardest six as the easiest six.`, 33); }
  }

  // Trends over time
  const withAll = rows.filter(r => r.total != null);
  if (withAll.length >= 4) {
    const k = withAll.length >= 6 ? 3 : 2; const recent = withAll.slice(-k), before = withAll.slice(0, -k);
    ["tee", "app", "short", "putt"].forEach(c => {
      const a = recent.map(r => r[c]).filter(x => x != null), b = before.map(r => r[c]).filter(x => x != null); if (a.length < k || b.length < 2) return;
      const d = avg(a) - avg(b);
      if (d >= 0.7) add("up-" + c, "good", `${CAT_NAME[c]} is getting better`, `${sgn(d)} a round over your last ${k} rounds compared with the ones before.`, 82);
      if (d <= -0.7) add("down-" + c, "bad", `${CAT_NAME[c]} has slipped`, `${sgn(d)} a round over your last ${k} rounds compared with the ones before.`, 83);
    });
    const d = avg(recent.map(r => r.over18)) - avg(before.map(r => r.over18));
    if (d <= -1.5) add("scores", "good", "Scores are coming down", `Your last ${k} rounds average ${f1(-d)} shots better than the ones before.`, 88);
    else if (d >= 1.5) add("scores", "bad", "Scores have crept up", `Your last ${k} rounds average ${f1(d)} shots worse than the ones before.`, 76);
  }
  if (full.length >= 4 && rows[rows.length - 1].n === 18 && rows[rows.length - 1].over18 === Math.min(...full.map(r => r.over18)) && full.filter(r => r.over18 === rows[rows.length - 1].over18).length === 1) add("best", "good", "Best round yet", `${rows[rows.length - 1].gross} is your lowest of ${full.length} full solo rounds.`, 95);

  // Holes with your number, on a course you've played a few times
  const lastCourse = last[last.length - 1].course.name; const here = all.filter(x => x.course === lastCourse); const nHere = new Set(here.map(x => x.ri)).size;
  if (nHere >= 3) {
    const base = avg(here.map(x => x.over));
    const hs = Array.from({ length: 18 }, (_, i) => { const v = here.filter(x => x.i === i); return { i, n: v.length, over: avg(v.map(x => x.over)) }; }).filter(x => x.n >= 3);
    if (hs.length) {
      const bad = [...hs].sort((a, b) => b.over - a.over)[0], good = [...hs].sort((a, b) => a.over - b.over)[0];
      if (bad.over - base >= 0.8) add("bogeyhole", "bad", `Hole ${bad.i + 1} at ${lastCourse} has your number`, `${sgn(bad.over)} on average over ${bad.n} rounds. Play it as a par ${here.find(x => x.i === bad.i).par + 1} and take the big number out.`, 67);
      if (base - good.over >= 0.8) add("bankerhole", "good", `Hole ${good.i + 1} at ${lastCourse} suits you`, `${good.over === 0 ? "Level par" : sgn(good.over)} on average over ${good.n} rounds.`, 32);
    }
  }
  return out.sort((a, b) => b.w - a.w);
}

/** What stood out in one round (the last of `rounds`), including how it compares with the ones before. */
export function roundNotes(rounds, H = null) {
  const r = rounds[rounds.length - 1]; const g = roundSG(r, H); const out = []; const add = (tone, title, text) => out.push({ tone, title, text });
  const st = g.st; const cs = Object.keys(g.cats).filter(c => g.cats[c].n >= 4).sort((a, b) => g.cats[b].sg - g.cats[a].sg);
  const detail = {
    putt: () => `${plural(st.putts, "putt")}${st.one ? `, ${plural(st.one, "one-putt")}` : ""}${st.three ? `, ${plural(st.three, "three-putt")}` : ", no three-putts"}.`,
    tee: () => `${st.fw[0]} of ${st.fw[1]} fairways${st.trouble ? `, ${st.trouble} in trouble` : ""}${st.left + st.right ? ` (${st.left} left, ${st.right} right)` : ""}.`,
    app: () => `${st.green[0]} of ${st.green[1]} greens hit with your approach.`,
    short: () => (st.ud[1] ? `Up and down ${st.ud[0]} of ${st.ud[1]} times.` : "Not many chips needed."),
  };
  const GOOD = { putt: "Putter was hot", tee: "Driving set you up", app: "Approach play was sharp", short: "Short game saved you" };
  const BAD = { putt: "Putting cost you", tee: "Tee shots cost you", app: "Approach shots cost you", short: "Short game cost you" };
  if (cs.length) {
    const best = cs[0], worst = cs[cs.length - 1];
    if (g.cats[best].sg >= 0.5) add("good", `${GOOD[best]}: ${sgn(g.cats[best].sg)}`, detail[best]());
    if (worst !== best && g.cats[worst].sg <= -0.5) add("bad", `${BAD[worst]}: ${sgn(g.cats[worst].sg)}`, detail[worst]());
  }
  if (st.pen >= 2) add("bad", `${st.pen} penalty shots`, `Without them this was a ${g.gross - st.pen}.`);
  // Against your own earlier rounds
  const rows = perRound(rounds.slice(-9), H); const me = rows[rows.length - 1]; const prev = rows.slice(0, -1);
  if (prev.length >= 2) {
    ["tee", "app", "short", "putt"].forEach(c => { const v = prev.map(x => x[c]).filter(x => x != null); if (me[c] == null || v.length < 2) return; if (me[c] > Math.max(...v)) add("good", `Best ${LOW[c]} of your last ${v.length + 1} rounds`, `${sgn(me[c])} against your usual ${sgn(avg(v))}.`); else if (me[c] < Math.min(...v)) add("bad", `Toughest ${LOW[c]} of your last ${v.length + 1} rounds`, `${sgn(me[c])} against your usual ${sgn(avg(v))}.`); });
    const f = prev.filter(x => x.n === 18); if (me.n === 18 && f.length >= 2) { const d = me.over18 - avg(f.map(x => x.over18)); if (Math.abs(d) >= 2) add(d < 0 ? "good" : "bad", d < 0 ? `${f1(-d)} shots better than your usual` : `${f1(d)} shots over your usual`, `Your last ${f.length} full rounds averaged ${Math.round(avg(f.map(x => x.gross)))}.`); }
  }
  // Inside the round
  const hs = g.holes;
  if (st.left + st.right >= 3 && Math.max(st.left, st.right) / (st.left + st.right) >= 0.75) add("info", `Every miss went ${st.right > st.left ? "right" : "left"}`, `${Math.max(st.left, st.right)} of ${st.left + st.right} missed fairways.`);
  if (g.n === 18) { const nine = (a, b) => hs.filter(x => x.i >= a && x.i < b).reduce((s, x) => s + x.e.s - x.par, 0); const d = nine(9, 18) - nine(0, 9); if (Math.abs(d) >= 4) add("info", d > 0 ? "A round of two halves: the back nine got away" : "A round of two halves: strong finish", `Front nine ${sgn(nine(0, 9))}, back nine ${sgn(nine(9, 18))}.`.replace(/\.0/g, "")); }
  let run = 0, bestRun = 0, at = 0;
  hs.forEach((x, k) => { if (x.e.s > x.par) { run = 0; return; } run = k > 0 && hs[k - 1].i === x.i - 1 ? run + 1 : 1; if (run > bestRun) { bestRun = run; at = x.i - run + 2; } });
  if (bestRun >= 4) add("good", `${bestRun} holes in a row at par or better`, `From hole ${at}.`);
  const blow = hs.filter(x => x.e.s - x.par >= 3);
  if (blow.length) add("bad", blow.length === 1 ? `One big number: hole ${blow[0].i + 1}` : `${blow.length} big numbers`, `${blow.length === 1 ? "It" : "They"} cost ${blow.reduce((s, x) => s + x.e.s - x.par - 1, 0)} shots more than bogeys would have.`);
  return out;
}

/** A short note for the hole you're about to play, from this round so far and your earlier rounds. */
export function caddieNote(r, i, earlier = []) {
  const par = r.holes[i].par; const mine = played(r).filter(k => k !== i).map(k => ({ par: r.holes[k].par, e: r.h[k] }));
  const same = earlier.filter(x => x.course.name === r.course.name && x.h[i] && x.h[i].s != null);
  if (same.length >= 2) { const o = avg(same.map(x => x.h[i].s - x.holes[i].par)); const ok = same.filter(x => x.h[i].s <= x.holes[i].par).length; if (o >= 1.5) return `This hole averages ${sgn(o)} for you over ${same.length} rounds. Bogey is a good score here.`; if (ok / same.length >= 0.5) return `You've made par or better here ${ok} of ${same.length} times.`; }
  if (par >= 4) { const m = mine.filter(x => x.par >= 4 && (x.e.tee === "L" || x.e.tee === "R")).slice(-3); if (m.length === 3 && m.every(x => x.e.tee === m[0].e.tee)) return `Your last three misses off the tee all went ${m[0].e.tee === "R" ? "right" : "left"}.`; }
  const three = mine.filter(x => x.e.p >= 3).length; if (three >= 2) return `${three} three-putts so far. Roll the first one to tap-in range.`;
  const old = flat(earlier.slice(-8)).filter(x => x.par === par);
  if (old.length >= 8) { const others = flat(earlier.slice(-8)).filter(x => x.par !== par); const d = avg(old.map(x => x.over)) - avg(others.map(x => x.over)); if (others.length >= 8 && d >= 0.3) return `Par ${par}s are your toughest holes lately (${sgn(avg(old.map(x => x.over)))} a hole).`; }
  return null;
}
