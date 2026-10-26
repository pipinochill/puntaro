/* ───────────── PUNTARO HANDICAPS ─────────────
   For players without an official handicap: a starting estimate from their usual score, then a handicap
   worked out from their own rounds the World Handicap System way. Not an official GA handicap.
   Kinds: "ga" = an official handicap the player entered, "est" = estimated from their usual score,
          "app" = worked out from their Puntaro rounds. */

export const DEF_PAR = [4, 4, 3, 5, 4, 4, 3, 4, 5, 4, 3, 5, 4, 4, 3, 4, 5, 4];
export const DEF_SI = [7, 11, 15, 1, 9, 5, 17, 3, 13, 8, 16, 2, 12, 6, 18, 10, 4, 14];
export const MAX_INDEX = 54;   // the most strokes the World Handicap System allows
export const ROUNDS_NEEDED = 3; // 54 holes, the WHS minimum for a first handicap
export const MAX_RISE = 1.0;    // per round: a handicap drops straight away but only creeps up

// "What do you usually shoot?" A handicap reflects your better rounds, so it sits about 3 under your usual score over par.
export const USUAL_SCORES = [
  { key: "u80", label: "Under 80", hi: 4 },
  { key: "80s", label: "80 to 89", hi: 11 },
  { key: "90s", label: "90 to 99", hi: 20 },
  { key: "100s", label: "100 to 109", hi: 30 },
  { key: "110s", label: "110 to 119", hi: 40 },
  { key: "120", label: "120 or more", hi: 50 },
  { key: "new", label: "I don't really play yet", hi: MAX_INDEX },
];

const round1 = x => Math.round(x * 10) / 10;

// Score differential for one finished 18-hole round. null if any hole is missing or the course has no slope/rating.
// Each hole is capped at net double bogey (par + 2 + strokes received), as WHS does.
export function differential(round, id) {
  const sc = round.scores && round.scores[id]; const c = round.course || {};
  if (!sc || sc.length < 18 || sc.some(v => v == null) || !c.slope || c.rating == null) return null;
  const par = round.holes ? round.holes.map(h => h.par) : DEF_PAR;
  const si = round.holes ? round.holes.map(h => h.si) : DEF_SI;
  const ch = Math.max(0, (round.hcp && round.hcp[id]) || 0);
  let ags = 0;
  for (let h = 0; h < 18; h++) {
    const strokes = Math.floor(ch / 18) + (si[h] <= ch % 18 ? 1 : 0);
    ags += Math.min(sc[h], par[h] + 2 + strokes);
  }
  return round1((113 / c.slope) * (ags - c.rating));
}

// WHS: how many of your lowest differentials count, and any adjustment, by how many rounds you have (up to 20).
const TABLE = { 3: [1, -2], 4: [1, -1], 5: [1, 0], 6: [2, -1], 7: [2, 0], 8: [2, 0], 9: [3, 0], 10: [3, 0], 11: [3, 0], 12: [4, 0], 13: [4, 0], 14: [4, 0], 15: [5, 0], 16: [5, 0], 17: [6, 0], 18: [6, 0], 19: [7, 0], 20: [8, 0] };

// diffs: newest last. Returns null until there are enough rounds.
export function indexFrom(diffs) {
  const recent = diffs.filter(d => typeof d === "number").slice(-20);
  if (recent.length < ROUNDS_NEEDED) return null;
  const [n, adj] = TABLE[recent.length];
  const best = [...recent].sort((a, b) => a - b).slice(0, n);
  const avg = best.reduce((t, d) => t + d, 0) / n + adj;
  return Math.min(MAX_INDEX, Math.max(-10, Math.floor(avg * 10) / 10));
}

// The handicap to use after a new round: lower straight away, higher by at most MAX_RISE.
export function nextIndex(current, computed) {
  if (computed == null) return current;
  if (current == null || computed <= current) return computed;
  return round1(Math.min(computed, current + MAX_RISE));
}

// Short tag shown after a handicap: EST or APP. Entered official handicaps show no tag (yet: GA verification later).
export const hcpTag = kind => (kind === "est" ? "EST" : kind === "app" ? "APP" : "");
