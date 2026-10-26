import { differential, indexFrom, nextIndex, DEF_PAR } from '../../src/hcp.js';
let pass = 0, fail = 0; const eq = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : `  got ${JSON.stringify(got)} want ${JSON.stringify(want)}`)); };
const rnd = (scores, ch = 0, slope = 113, rating = 72) => ({ course: { slope, rating }, holes: null, hcp: { me: ch }, scores: { me: scores } });
// 1. par every hole on a neutral course: differential 0
eq('Par round, slope 113, rating 72 -> 0.0', differential(rnd(DEF_PAR.slice()), 'me'), 0);
// 2. bogey every hole (90) with 18 strokes: 18 over -> 18.0
eq('Bogey round (90) -> 18.0', differential(rnd(DEF_PAR.map(p => p + 1), 18), 'me'), 18);
// 3. a 12 on one hole for a scratch player is capped at net double (par+2)
const blow = DEF_PAR.slice(); blow[0] = 12;
eq('A 12 on a par 4, scratch: capped at 6 -> 2.0', differential(rnd(blow, 0), 'me'), 2);
// 4. with 20 strokes, the hardest two holes (SI 1, 2) allow par+4
const hard = DEF_PAR.slice(); hard[3] = 15; // SI 1, par 5
eq('20 strokes: SI 1 hole capped at par+2+2 = 9 -> 4.0', differential(rnd(hard, 20), 'me'), 4);
// 5. slope adjusts: 18 over on slope 140 -> 113/140*18 = 14.5
eq('Slope 140, 18 over -> 14.5', differential(rnd(DEF_PAR.map(p => p + 1), 18, 140), 'me'), 14.5);
// 6. incomplete round
const inc = DEF_PAR.slice(); inc[17] = null;
eq('A missing hole -> no differential', differential(rnd(inc), 'me'), null);
// WHS table
eq('2 rounds: not enough', indexFrom([20, 22]), null);
eq('3 rounds: lowest minus 2', indexFrom([20, 22, 25]), 18);
eq('4 rounds: lowest minus 1', indexFrom([20, 22, 25, 30]), 19);
eq('5 rounds: lowest', indexFrom([20, 22, 25, 30, 21]), 20);
eq('6 rounds: average of lowest 2, minus 1', indexFrom([20, 22, 25, 30, 21, 40]), 19.5);
eq('8 rounds: average of lowest 2', indexFrom([20, 22, 25, 30, 21, 40, 33, 35]), 20.5);
eq('20 rounds: average of lowest 8', indexFrom(Array.from({ length: 20 }, (_, i) => 10 + i)), 13.5);
eq('Only the latest 20 count', indexFrom([1, 1, 1, ...Array.from({ length: 20 }, (_, i) => 10 + i)]), 13.5);
eq('Capped at 54', indexFrom([70, 75, 80]), 54);
// fast down, slow up
eq('Lower: takes effect at once', nextIndex(20, 15.2), 15.2);
eq('Higher: rises at most 1.0', nextIndex(20, 26), 21);
eq('No change', nextIndex(20, null), 20);
console.log(`\n${pass}/${pass + fail} passed`);
