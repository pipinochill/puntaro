// Strokes gained engine: benchmarks, one hole, a round, and the trends. Run: node tests/live/sg_unit.mjs
import { strokesFor, ptsFor, pointsOf, expStrokes, expPutts, holeSG, roundSG, insights, roundNotes, caddieNote, perRound, gapFor, AP, FP } from "../../src/sg.js";
let pass = 0, n = 0; const check = (name, ok, d = "") => { n++; if (ok) pass++; console.log((ok ? "PASS " : "FAIL ") + name + (ok || d === "" ? "" : `  [${d}]`)); };
const near = (a, b, e = 0.011) => Math.abs(a - b) <= e;
const HOLES = [4, 4, 3, 4, 5, 4, 3, 4, 5, 4, 4, 3, 4, 5, 4, 3, 4, 5].map((par, i) => ({ par, si: ((i * 7) % 18) + 1 }));
const mk = (f, o = {}) => ({ at: o.at || 1, course: { name: o.course || "Test GC" }, holes: HOLES, ch: o.ch ?? 18, h: HOLES.map((h, i) => f(h.par, i)) });

check("Tour baseline: 400 yards off the tee is 3.99", near(expStrokes("tee", 400), 3.99));
check("...140 from the fairway 2.91, rough 3.15", near(expStrokes("fwy", 140), 2.91) && near(expStrokes("rgh", 140), 3.15));
check("...between table rows it draws a straight line (130 fairway = 2.88)", near(expStrokes("fwy", 130), 2.88));
check("...8 feet is 1.515 putts, 33 feet about 2.0", near(expPutts(8), 1.515) && near(expPutts(33), 2.0, 0.01));

// Par 4: fairway, 125 m in, green hit, two putts from 4.5 m
const e1 = { s: 4, tee: "F", ap: 2, gr: true, p: 2, fp: 2 }; const g1 = holeSG(4, e1);
const a1 = expStrokes("fwy", AP[2].yd), p1 = expPutts(FP[2].ft);
check("A hole: tee = start - 1 - where it finished", near(g1.tee, expStrokes("tee", 385) - 1 - a1, 1e-9));
check("...approach = fairway value - 1 - first putt value", near(g1.app, a1 - 1 - p1, 1e-9));
check("...putting = expected putts - putts taken", near(g1.putt, p1 - 2, 1e-9));
check("...the four parts add up to the hole total", near(g1.tee + g1.app + g1.short + g1.putt, g1.total, 1e-9) && near(g1.total, expStrokes("tee", 385) - 4, 1e-9));
const g2 = holeSG(4, { s: 4, tee: "R", ap: 2, gr: false, p: 1, fp: 1 });
check("Missed green, chip and a putt: short game = 2.5 - 1 - putt value", near(g2.short, 2.5 - 1 - expPutts(FP[1].ft), 1e-9) && near(g2.tee + g2.app + g2.short + g2.putt, g2.total, 1e-9));
check("...missing right from the same spot is worse than the fairway", g2.tee < g1.tee);
check("Trouble off the tee costs most of a stroke", holeSG(4, { s: 6, tee: "T", ap: 2, gr: true, p: 2, fp: 2 }).tee < -0.7);
check("A chip-in (0 putts) is credited to the short game, not putting", (g => g.putt === 0 && g.short > 0.4)(holeSG(4, { s: 3, tee: "F", ap: 2, gr: false, p: 0 })));
check("Score only: just the total", (g => g.total != null && g.tee === null && g.app === null && g.putt === null)(holeSG(4, { s: 5 })));
check("Putts only: putting is known, the rest isn't", (g => g.putt != null && g.app === null && g.short === null)(holeSG(3, { s: 4, p: 2 })));
check("More putts than strokes allow is capped", holeSG(3, { s: 2, p: 3, gr: true, fp: 1 }).putt === expPutts(FP[1].ft) - 1);

check("Picked-up hole: counts for the total only", (g => g.total != null && g.tee === null && g.putt === null)(holeSG(4, { s: 7, pu: true, tee: "T", p: 2 })));
check("Penalty after a tee shot in trouble is charged to the tee shot", near(holeSG(4, { s: 6, tee: "T", pen: 1, ap: 2, gr: true, p: 2, fp: 2 }).tee, holeSG(4, { s: 6, tee: "T", ap: 2, gr: true, p: 2, fp: 2 }).tee - 1, 1e-9));
check("...and a penalty isn't mistaken for a chip", near(holeSG(4, { s: 6, tee: "F", pen: 1, ap: 2, gr: false, p: 2, fp: 1 }).short, 2.5 - 1 - expPutts(FP[1].ft), 1e-9));
const penR = mk((par, i) => ({ s: par + 2, tee: par >= 4 ? "T" : undefined, pen: i % 4 === 0 ? 1 : 0, pu: i === 5, p: 2 }));
check("Round counts penalty shots and pick-ups", roundSG(penR).st.pen === 5 && roundSG(penR).st.pu === 1);
check("Trends and notes mention penalties", insights([penR]).some(x => x.id === "pens") && roundNotes([penR]).some(x => /penalty/.test(x.title)));
const st21 = mk((par) => ({ s: par + 1 }), { ch: 21 });
check("Strokes: playing off 21, every hole gets one and index 1 to 3 get two", HOLES.every((h, i) => strokesFor(st21, i) === (h.si <= 3 ? 2 : 1)));
check("Stableford: a bogey with one stroke is 2 points, with two strokes 3", HOLES.every((h, i) => ptsFor(st21, i) === (h.si <= 3 ? 3 : 2)) && pointsOf(st21) === 39);
check("...a pick-up scores 0, and a blow-up can't go below 0", ptsFor(mk(() => ({ s: 6, pu: true })), 0) === 0 && ptsFor(mk(() => ({ s: 12 })), 0) === 0);
const p3r = mk((par, i) => (par === 3 ? { s: 3, gr: i !== 2, p: 2, fp: i === 6 ? 0 : 3 } : { s: par + 1 }));
check("Par 3s: greens hit from the tee and the closest one", (g => g.st.p3.join() === "3,4" && g.st.closest.i === 6 && g.st.p3close === 1)(roundSG(p3r)), JSON.stringify(roundSG(p3r).st));
check("...the round notes call out the closest", roundNotes([p3r]).some(x => /Closest on a par 3: hole 7, under 1 m/.test(x.title)), JSON.stringify(roundNotes([p3r]).map(x => x.title)));
// A round of bogeys from an 18 handicap is about what the benchmark expects
const bogey = mk((par) => ({ s: par + 1, tee: par >= 4 ? "F" : undefined, ap: 2, gr: false, p: 2, fp: 1 }));
const rb = roundSG(bogey);
check("Handicap benchmark: 18 handicap gives up 4.3 + 1.08 x 18 to the tour", near(gapFor(18), 23.74, 1e-9));
check("90 on a par 72 is a little better than an 18's usual (about 93)", rb.gross === 90 && rb.total.sg > 2 && rb.total.sg < 5, rb.total.sg);
check("With every answer in, the four parts add up to the round total", near(rb.cats.tee.sg + rb.cats.app.sg + rb.cats.short.sg + rb.cats.putt.sg, rb.total.sg, 1e-6));
check("Against scratch the same round loses a lot", roundSG(bogey, 0).total.sg < -10);
check("Round stats: fairways 14/14, greens in regulation 0/18, 36 putts", rb.st.fw.join() === "14,14" && rb.st.gir.join() === "0,18" && rb.st.putts === 36);
const nine = mk((par, i) => (i < 9 ? { s: par } : null));
check("Nine holes: counted as nine", roundSG(nine).n === 9 && roundSG(nine).gross === 36);

// Trends
const rng = (seed => () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296))(7);
const slicer = k => mk((par, i) => ({ s: par + (i % 3 === 0 ? 2 : 1), tee: par >= 4 ? (i % 2 ? "R" : i % 4 === 0 ? "T" : "F") : undefined, ap: i % 2 ? 3 : 1, gr: i % 2 === 0 && i % 3 !== 0, p: i % 6 === 0 ? 3 : 2, fp: i % 6 === 0 ? 4 : 2 }), { at: k });
const many = [1, 2, 3, 4].map(slicer); const ins = insights(many); const ids = ins.map(x => x.id);
check("Trends: spots a one-sided miss", ids.includes("side") && /right/.test(ins.find(x => x.id === "side").title), ids.join());
check("...trouble off the tee, three-putts and big numbers", ["trouble", "three", "blow"].every(k => ids.includes(k)), ids.join());
check("...a scoring zone and a hard distance", ids.includes("zone") && ids.includes("farzone") && /50–100/.test(ins.find(x => x.id === "zone").title));
check("...names the weakest part of the game first", ins[0].id === "weak", ins[0].id);
check("Every trend has a title, a sentence and a tone", ins.every(x => x.title && x.text && ["good", "bad", "info"].includes(x.tone)));
check("No undefined or NaN in any wording", !/undefined|NaN/.test(JSON.stringify(ins)), JSON.stringify(ins).match(/.{20}(undefined|NaN).{20}/));
const improving = [0, 0, 0, 0, 1, 1].map((better, k) => mk((par, i) => ({ s: par + (better ? (i % 3 ? 1 : 0) : (i % 3 ? 1 : 2)), tee: par >= 4 ? "F" : undefined, ap: 2, gr: false, p: better ? (i % 3 ? 2 : 1) : (i % 3 ? 2 : 3), fp: 2 }), { at: k }));
const ti = insights(improving);
check("Trend over time: putting getting better across the last rounds", ti.some(x => x.id === "up-putt"), ti.map(x => x.id).join());
check("...and scores coming down", ti.some(x => x.id === "scores" && x.tone === "good"));
check("One round is enough for a few trends, none claiming a history", insights([slicer(1)]).length >= 3 && !insights([slicer(1)]).some(x => /^up-|^down-|scores|best/.test(x.id)));
check("No rounds: no trends", insights([]).length === 0);
const notes = roundNotes(many);
check("Round notes: best and worst part, with detail", notes.length >= 2 && notes.every(x => x.title && x.text) && !/undefined|NaN/.test(JSON.stringify(notes)), JSON.stringify(notes));
check("Round notes compare with earlier rounds", roundNotes(improving.slice(0, 5)).some(x => /of your last|than your usual/.test(x.title)), JSON.stringify(roundNotes(improving.slice(0, 5)).map(x => x.title)));
const cur = mk((par, i) => (i < 6 ? { s: par + 1, tee: par >= 4 ? "R" : undefined, p: 2 } : null));
check("Caddie note: three misses the same way", /right/.test(caddieNote(cur, 7, []) || ""), caddieNote(cur, 7, []));
check("Caddie note: your history on this hole", /averages|par or better/.test(caddieNote(mk(() => null), 0, many) || ""), caddieNote(mk(() => null), 0, many));
check("Caddie note: nothing to say on a first round's first hole", caddieNote(mk(() => null), 0, []) === null);
check("perRound scales nine holes up to a full round", near(perRound([nine])[0].over18, 0));
console.log(`${pass}/${n} passed`); process.exit(pass === n ? 0 : 1);
