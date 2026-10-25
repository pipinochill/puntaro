import { useState, useRef, useEffect } from "react";

/* ───────────── ICONS (inline, no library) ───────────── */
function Ico({ size = 24, color = "currentColor", children }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" aria-hidden="true" style={{ flex: "none" }}>{children}</svg>;
}
function HomeIcon(p) { return <Ico {...p}><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M9 22V12h6v10" /></Ico>; }
function UsersIcon(p) { return <Ico {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></Ico>; }
function UserIcon(p) { return <Ico {...p}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></Ico>; }
function Plus(p) { return <Ico {...p}><path d="M5 12h14" /><path d="M12 5v14" /></Ico>; }
function Minus(p) { return <Ico {...p}><path d="M5 12h14" /></Ico>; }
function Check(p) { return <Ico {...p}><path d="M20 6 9 17l-5-5" /></Ico>; }
function ChevronLeft(p) { return <Ico {...p}><path d="m15 18-6-6 6-6" /></Ico>; }
function ChevronRight(p) { return <Ico {...p}><path d="m9 18 6-6-6-6" /></Ico>; }
function Search(p) { return <Ico {...p}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></Ico>; }
function UserPlus(p) { return <Ico {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6" /><path d="M22 11h-6" /></Ico>; }
function X(p) { return <Ico {...p}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></Ico>; }
function LinkIcon(p) { return <Ico {...p}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></Ico>; }
function Sparkles(p) { return <Ico {...p}><path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" /></Ico>; }
function MapPin(p) { return <Ico {...p}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></Ico>; }

/* ───────────── DATA ───────────── */
const APP_NAME = "Puntaro"; // working title, change here only
const APP_VERSION = "0.3";
const DEF_PAR = [4,4,3,5,4,4,3,4,5, 4,3,5,4,4,3,4,5,4];
const DEF_SI  = [7,11,15,1,9,5,17,3,13, 8,16,2,12,6,18,10,4,14];
// PAR and SI are the holes of the course being played. applyHoles swaps them in place when a round starts.
const PAR = [...DEF_PAR];
const SI = [...DEF_SI];
const applyHoles = holes => range18.forEach(i => { PAR[i] = holes ? holes[i].par : DEF_PAR[i]; SI[i] = holes ? holes[i].si : DEF_SI[i]; });
// Made-up sample courses. Real courses come from the finder.
const COURSES = [
  { id: "pebble", name: "Pebble Hollow", source: "sample", par: 72, holes: null, tees: [{ name: "White", slope: 131, rating: 71.8 }] },
  { id: "sunrise", name: "Sunrise Links", source: "sample", par: 72, holes: null, tees: [{ name: "White", slope: 118, rating: 69.9 }] },
  { id: "cedar", name: "Cedar Ridge", source: "sample", par: 72, holes: null, tees: [{ name: "White", slope: 140, rating: 73.4 }] },
];
const TRASH_MS = 5 * 60 * 1000;
const STATE_KEY = "puntaro.state.v1";
const loadAppState = () => { try { const s = JSON.parse(localStorage.getItem(STATE_KEY)); return s && typeof s === "object" ? s : null; } catch (e) { return null; } };
const SAVED_KEY = "puntaro.courses.v1";
const loadSaved = () => { try { const v = JSON.parse(localStorage.getItem(SAVED_KEY) || "[]"); return Array.isArray(v) ? v : []; } catch (e) { return []; } };
const storeSaved = v => { try { localStorage.setItem(SAVED_KEY, JSON.stringify(v)); } catch (e) { /* private mode: fine */ } };
const PEOPLE = {
  me:    { id: "me", name: "You", hi: 14.2, color: "#4F7A5A" },
  sam:   { id: "sam", name: "Sam", hi: 8.4, color: "#8B6B4A" },
  priya: { id: "priya", name: "Priya", hi: 19.0, color: "#A5543A" },
  jake:  { id: "jake", name: "Jake", hi: 11.6, color: "#6F7F73" },
  maya:  { id: "maya", name: "Maya", hi: 5.2, color: "#9A7650" },
  leo:   { id: "leo", name: "Leo", hi: 23.5, color: "#5E4636" },
  dani:  { id: "dani", name: "Dani", hi: 13.1, color: "#3F5F4B" },
  omar:  { id: "omar", name: "Omar", hi: 21.8, color: "#7A7A72" },
};
const STATS = {
  me:    { month: { avg: 73.4, bird: 3, wins: 5, rounds: 6 }, season: { avg: 74.1, bird: 19, wins: 31, rounds: 38 } },
  sam:   { month: { avg: 71.9, bird: 5, wins: 4, rounds: 5 }, season: { avg: 72.6, bird: 27, wins: 29, rounds: 34 } },
  priya: { month: { avg: 74.8, bird: 2, wins: 6, rounds: 7 }, season: { avg: 75.2, bird: 11, wins: 38, rounds: 41 } },
  jake:  { month: { avg: 73.9, bird: 4, wins: 3, rounds: 4 }, season: { avg: 74.0, bird: 16, wins: 22, rounds: 27 } },
  maya:  { month: { avg: 70.6, bird: 8, wins: 5, rounds: 6 }, season: { avg: 71.2, bird: 34, wins: 30, rounds: 36 } },
  leo:   { month: { avg: 76.2, bird: 1, wins: 2, rounds: 3 }, season: { avg: 76.8, bird: 9, wins: 15, rounds: 19 } },
  dani:  { month: { avg: 72.7, bird: 4, wins: 4, rounds: 5 }, season: { avg: 73.1, bird: 21, wins: 24, rounds: 28 } },
  omar:  { month: { avg: 75.5, bird: 2, wins: 1, rounds: 4 }, season: { avg: 75.9, bird: 12, wins: 12, rounds: 22 } },
};
const METRICS = [
  { id: "avg", label: "Avg net score", low: true, fmt: v => v.toFixed(1) },
  { id: "bird", label: "Birdies", fmt: v => v },
  { id: "wins", label: "Puntaro wins", fmt: v => v },
  { id: "rounds", label: "Rounds", fmt: v => v },
];
const GAMES = [
  { id: "punt", name: "Puntaro", blurb: "Bank it or bust it. Net scores, so every handicap has a shot.", hero: true },
];
const RECENT = [
  { course: "Cedar Ridge", when: "Sat", gross: 88, net: 74, note: "Banked 31 on the back 9" },
  { course: "Pebble Hollow", when: "Last Sun", gross: 84, net: 71, note: "Busted a 14 point pot on 15" },
  { course: "Sunrise Links", when: "2 weeks ago", gross: 91, net: 77, note: "Streak hit x3 on the 6th" },
];
const STAKES = [0, 5, 10, 20];
const SPLITS = [["win", "Winner takes all"], ["603010", "60/30/10"], ["spoon", "Wooden spoon pays"]];

/* Puntaro cards. They only ever move game points, never how a shot is played or counted. */
const CARDS = {
  dd:    { name: "Double dip",  kind: "bless", text: "This hole's points count double." },
  safe:  { name: "Safety net",  kind: "bless", text: "Your next bust is cancelled." },
  vault: { name: "Bank vault",  kind: "bless", text: "Your next bank keeps your streak." },
  hot:   { name: "Hot hand",    kind: "bless", text: "Your streak jumps to x2 this hole. Needs net par or better." },
  life:  { name: "Lifeline",    kind: "bless", text: "+3 points straight into your pot." },
  tax:   { name: "Taxman",      kind: "curse", text: "Lose 2 points from your pot after this hole." },
  heavy: { name: "Heavy pot",   kind: "curse", text: "You must bank straight after this hole, and your streak resets." },
  leaky: { name: "Leaky pot",   kind: "curse", text: "Lose 1 point from your pot at the start of each of the next 3 holes." },
  shout: { name: "Your shout",  kind: "curse", text: "Give 1 point to each mate, out of your pot." },
  mine:  { name: "Landmine",    kind: "curse", text: "On this hole, a net bogey busts you." },
};
/* Optional bonuses and penalties, logged per player per hole. They only ever move game points. */
const EVENTS = {
  sandy:    { kind: "bonus",   name: "Sandy",       tag: "Sandy x2",        hint: "Up and down from a bunker. This hole's points count double." },
  updown:   { kind: "bonus",   name: "Up and down", tag: "Up and down +2",  hint: "Chip or pitch, then one putt." },
  chipin:   { kind: "bonus",   name: "Chip-in",     tag: "Chip-in +4",      hint: "Holed it from off the green." },
  barkie:   { kind: "bonus",   name: "Barkie",      tag: "Barkie +2",       hint: "Hit a tree and still made par." },
  lost:     { kind: "penalty", name: "Lost ball",   tag: "Lost ball -3",    hint: "Lost it off the tee." },
  water:    { kind: "penalty", name: "Wet one",     tag: "Wet one -2",      hint: "Found the water." },
  fourputt: { kind: "penalty", name: "Four putt",   tag: "Four putt: half pot", hint: "Four putts or worse." },
};
const BLESSINGS = ["dd", "safe", "vault", "hot", "life"];
const CURSES = ["tax", "heavy", "leaky", "shout", "mine"];

/* 8-bit sprites. Each row is a line of pixels; letters map to the palette below. */
const PAL = { o: "#14150F", w: "#EDE8DD", g: "#D9B07A", r: "#B4472E", l: "#8FAE8B", d: "#3E6B4B", m: "#CFC9B8", n: "#7A5232", c: "#4A4D45", s: "#E6D3AE" };
const SPRITES = {
  flag: [".w......", ".wrr....", ".wrrrr..", ".wrr....", ".w......", ".w......", ".w......", ".w......", "dlllllld", "dddddddd"],
  crown: ["g.g.g.g", "ggggggg", "gwgrgwg", "ooooooo"],
  ball: ["..ooo..", ".owwwo.", "owmwwwo", "owwwmwo", "owmwwwo", ".owwwo.", "..ooo.."],
  skull: ["..oooo..", ".owwwwo.", "owwwwwwo", "owrwwrwo", "owwwwwwo", ".owwwwo.", ".owowwo.", "..oooo.."],
  flame: ["...r...", "..rr...", "..rrr..", ".rrrgr.", ".rrggr.", "rrrggrr", "rrrgggr", ".rrrgr.", "..rrr.."],
  star: ["...g...", "..ggg..", "ggggggg", ".ggggg.", "..ggg..", ".gg.gg.", ".g...g."],
  c_dd: ["......oooo..", ".....osssso.", "....osssssso", "..ooossmssso", ".owwwwssssso", "owwmwwwsssso", "owwwwwwssso.", "owwwmwwooo..", "owwwwwwo....", ".owwwwo.....", "..oooo......", "............"],
  c_safe: ["..oooooooo..", ".oddddddddo.", ".odlllllldo.", ".odlwwwwldo.", ".odwwwwwwdo.", ".odwmwwwwdo.", ".odwwwmwwdo.", ".odlwwwwldo.", ".odlllllldo.", "..odlllldo..", "...oddddo...", "....oooo...."],
  c_vault: ["....oooo....", "..oommmmoo..", ".ommoooommo.", ".ommo..ommo.", ".ommoooommo.", "oggggggggggo", "oggggwwggggo", "ogggwmwwgggo", "ogggwwwmgggo", "oggggwwggggo", "oggggggggggo", ".oooooooooo."],
  c_hot: ["..o..o..o...", ".ogoogoogo..", ".ogrogrogro.", ".orrorrorro.", ".owwowwowwo.", ".owwowwowwo.", "owwwwwwwwwo.", "owwwwwwwwwo.", ".owwwwwwwwo.", ".occcccccco.", ".ocmmmmmmco.", "..oooooooo.."],
  c_life: ["...oooooo...", "..oggwwggo..", ".owwggggwwo.", "owwwggggwwwo", "ogggoooogggo", "ogggowwogggo", "ogggowwogggo", "ogggoooogggo", "owwwggggwwwo", ".owwggggwwo.", "..oggwwggo..", "...oooooo..."],
  c_tax: ["....oooo....", "...occcco...", "..occcccco..", ".oorrrrrroo.", "occcccccccco", ".owwowwowwo.", ".owmwwwwmwo.", ".owwoooowwo.", "..owwwwwwo..", "...owwwwo...", "....oooo....", "............"],
  c_heavy: [".oo.oo.oo...", "ommonnoggo..", ".omoonoogo..", ".omoonoogo..", ".occcccccco.", ".ocrrrrrrco.", ".occcccccco.", ".occcgcccco.", ".occcccccco.", "..occcccco..", "..occcccco..", "...oooooo..."],
  c_leaky: ["....oooo....", "...owwwwo...", "..owmwwwwo..", ".owwwwrwwwo.", ".owwwrrwwwo.", ".owmwrwwmwo.", "..owwwwwwo..", "...owwwwo...", "....ooolo...", ".......o....", "......olo...", ".......o...."],
  c_shout: [".oooooooooo.", "ommmmmmmmmmo", "ommrmmmwwmmo", "ommrmmwwwwmo", "ommrmmwwwwmo", "ommmmmmwwmmo", "ommrmmmmmmmo", "ommmmmmmmmmo", ".ooommmmooo.", "....ommo....", ".....oo.....", "............"],
  c_ball: ["....oooo....", "...owwwwo...", "..owwwwwwo..", ".owwmwwmwwo.", ".owwwwwwwwo.", ".owmwwwwmwo.", ".owwwmwwwwo.", "..owwwwwwo..", "...owwwwo...", "....onno....", "....onno....", ".....oo....."],
  c_mine: [".....ooo....", "....orrro...", "....orro....", "...oomooo...", "..occcccco..", ".ocmccccmco.", "omcccrrcccmo", "omcmcrrcccmo", ".occcccccco.", "..occcccco..", "...occcco...", "....oooo...."],
  logo: [".oooooooooooooooo.", "oggggggggggggggggo", "ogrrrsssssssssssgo", "ogrsrsssssssssssgo", "ogrrrsssssssssssgo", "ogrsssssssssssssgo", "ogrsssssssssssssgo", "ogsssssoooosssssgo", "ogssssowwwwossssgo", "ogsssowwmwwwosssgo", "ogsssowwwwmwosssgo", "ogsssowmwwwwosssgo", "ogsssowwwwwwosssgo", "ogssssowwwwossssgo", "ogsssssoooosssssgo", "ogsssssnnnnsssssgo", "ogssssssnnssssssgo", "ogssssssnnsssssrgo", "ogsssslllllssssrgo", "ogsssdddddddsrrrgo", "ogsssssssssssrsrgo", "ogsssssssssssrrrgo", "oggggggggggggggggo", ".oooooooooooooooo."],
  rabbit: ["..ww..ww..", "..ww..ww..", "..ww..ww..", "..wwwwww..", ".wwwwwwww.", ".wowwwwow.", ".wwwwrwww.", "..wwwwww..", ".wwwwwwww.", ".ww....ww."],
};
function Sprite({ name, size = 4, className, style }) {
  const rows = SPRITES[name]; const w = rows[0].length, h = rows.length;
  return (
    <svg width={w * size} height={h * size} viewBox={`0 0 ${w} ${h}`} shapeRendering="crispEdges" className={className} style={{ display: "block", flex: "none", ...style }} aria-hidden="true">
      {rows.flatMap((row, y) => [...row].map((c, x) => (c === "." ? null : <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={PAL[c]} />)))}
    </svg>
  );
}

/* ───────────── SOUND (8-bit synth, no audio files) ───────────── */
// Original stately march in C major, written for Puntaro. Not a copy of any existing tune.
const THEME = (() => {
  const B = 0.55; // seconds per beat
  const mid = n => 440 * Math.pow(2, (n - 69) / 12);
  // [bass root, arpeggio triad, melody as [midi, startBeat, beats]]
  const bars = [
    [36, [48, 52, 55], [[64, 0, 1], [67, 1, 1], [72, 2, 2]]],
    [45, [48, 52, 57], [[72, 0, 1], [71, 1, 1], [69, 2, 2]]],
    [41, [48, 53, 57], [[69, 0, 1], [72, 1, 1], [77, 2, 2]]],
    [43, [50, 55, 59], [[76, 0, 1.5], [74, 1.5, 0.5], [71, 2, 2]]],
    [36, [48, 52, 55], [[64, 0, 1], [67, 1, 1], [72, 2, 1], [76, 3, 1]]],
    [41, [48, 53, 57], [[77, 0, 1], [76, 1, 1], [72, 2, 2]]],
    [43, [50, 55, 59], [[74, 0, 1], [76, 1, 1], [77, 2, 1], [74, 3, 1]]],
    [36, [48, 52, 55], [[72, 0, 4]]],
  ];
  return { B, mid, bars, len: bars.length * 4 * B };
})();

const SFX = (() => {
  let ctx = null; let master = null; let on = true; let last = 0;
  try { on = localStorage.getItem("puntaro.sound") !== "off"; } catch (e) { /* default on */ }
  const ac = () => {
    if (!on) return null;
    try {
      if (!ctx) {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        // Soften: roll off the harsh top end so squares stay chunky but not piercing.
        master = ctx.createBiquadFilter(); master.type = "lowpass"; master.frequency.value = 2200; master.Q.value = 0.5;
        const lo = ctx.createBiquadFilter(); lo.type = "highshelf"; lo.frequency.value = 1200; lo.gain.value = -4;
        master.connect(lo); lo.connect(ctx.destination);
      }
      if (ctx.state === "suspended") ctx.resume();
      return ctx;
    } catch (e) { return null; }
  };
  // Two slightly detuned voices make the chunky, wobbly chip sound.
  const tone = (a, f, t, d, o = {}) => {
    const { type = "square", vol = 0.07, to = null, det = 7, out = master || a.destination } = o;
    (det ? [0, det] : [0]).forEach((c, k) => {
      const osc = a.createOscillator(), g = a.createGain(), t0 = a.currentTime + t;
      osc.type = type; osc.detune.value = c; osc.frequency.setValueAtTime(f, t0);
      if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + d);
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol * (k ? 0.5 : 1), t0 + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
      osc.connect(g); g.connect(out); osc.start(t0); osc.stop(t0 + d + 0.03);
    });
  };
  const noise = (a, t, d, o = {}) => {
    const { vol = 0.08, from = 3000, to = 800, out = master || a.destination } = o;
    const n = Math.max(1, Math.floor(a.sampleRate * d)); const buf = a.createBuffer(1, n, a.sampleRate); const dat = buf.getChannelData(0);
    for (let i = 0; i < n; i++) dat[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = a.createBufferSource(); src.buffer = buf;
    const f = a.createBiquadFilter(); f.type = "bandpass"; f.Q.value = 0.9;
    f.frequency.setValueAtTime(from, a.currentTime + t); f.frequency.exponentialRampToValueAtTime(to, a.currentTime + t + d);
    const g = a.createGain(); g.gain.value = vol; src.connect(f); f.connect(g); g.connect(out); src.start(a.currentTime + t);
  };
  const run = (a, notes, step, o) => notes.forEach((f, i) => tone(a, f, i * step, step * 1.7, o));
  let song = null;
  const playBar = (a, out, bar, at) => {
    const [root, tri, mel] = THEME.bars[bar]; const B = THEME.B; const t = k => at + k * B - a.currentTime;
    [0, 2].forEach(k => tone(a, THEME.mid(root), t(k), B * 1.7, { vol: 0.07, det: 0, out }));
    [0, 1, 2, 1, 0, 1, 2, 1].forEach((i, k) => tone(a, THEME.mid(tri[i]), t(k / 2), B * 0.5, { type: "triangle", vol: 0.07, det: 0, out }));
    mel.forEach(([n, s, d]) => { tone(a, THEME.mid(n), t(s), d * B * 0.95, { vol: 0.06, out }); });
    [0, 2].forEach(k => tone(a, 150, t(k), 0.12, { type: "sine", vol: 0.16, to: 45, det: 0, out }));
    [1, 3].forEach(k => noise(a, t(k), 0.09, { vol: 0.07, from: 3200, to: 1600, out }));
    [0.5, 1.5, 2.5, 3.5].forEach(k => noise(a, t(k), 0.03, { vol: 0.025, from: 8000, to: 7000, out }));
  };
  const schedule = a => {
    if (!song) return;
    const at0 = song.next;
    for (let b = 0; b < THEME.bars.length; b++) playBar(a, song.out, b, at0 + b * 4 * THEME.B);
    song.next = at0 + THEME.len;
    song.timer = setTimeout(() => schedule(a), Math.max(200, (song.next - a.currentTime - 1) * 1000));
  };
  const startSong = a => {
    if (song) return;
    const out = a.createGain(); out.gain.value = 0.9; out.connect(master || a.destination);
    song = { out, next: a.currentTime + 0.1, timer: 0 }; schedule(a);
  };
  const mk = fn => () => { const a = ac(); if (!a) return; last = Date.now(); fn(a); };
  return {
    isOn: () => on,
    set: v => { on = v; if (!v) { try { if (song) { clearTimeout(song.timer); song.out.gain.value = 0; song = null; } } catch (e) { /* fine */ } } try { localStorage.setItem("puntaro.sound", v ? "on" : "off"); } catch (e) { /* fine */ } if (v) { const a = ac(); if (a) tone(a, 880, 0, 0.08, { type: "triangle" }); } },
    sinceSpecial: () => Date.now() - last,
    themePlaying: () => !!song,
    theme: () => { const a = ac(); if (a) { last = Date.now(); startSong(a); } },
    themeIfAllowed: () => { if (on && ctx && ctx.state === "running") startSong(ctx); else if (on && !ctx) { const a = ac(); if (a && a.state === "running") startSong(a); } },
    stopTheme: () => { if (!song) return; clearTimeout(song.timer); const s = song; song = null; try { s.out.gain.setTargetAtTime(0, ctx.currentTime, 0.04); } catch (e) { /* fine */ } },
    tap: () => { const a = ac(); if (a) tone(a, 587, 0, 0.05, { type: "triangle", vol: 0.06 }); },
    up: mk(a => { tone(a, 523, 0, 0.07); tone(a, 784, 0.06, 0.1); }),
    down: mk(a => { tone(a, 392, 0, 0.07); tone(a, 262, 0.06, 0.13, { type: "triangle", vol: 0.1 }); }),
    bank: mk(a => { tone(a, 988, 0, 0.07); tone(a, 1175, 0.07, 0.36, { vol: 0.05 }); tone(a, 988, 0.09, 0.26, { vol: 0.03, type: "triangle" }); }),
    bust: mk(a => { noise(a, 0, 0.38, { vol: 0.13, from: 1200, to: 120 }); tone(a, 220, 0, 0.55, { type: "sawtooth", vol: 0.07, to: 45 }); tone(a, 330, 0, 0.28, { vol: 0.04, to: 80 }); }),
    mult: mk(a => run(a, [523, 659, 784, 1047, 1319], 0.045, { vol: 0.06 })),
    flip: mk(a => { noise(a, 0, 0.07, { vol: 0.1, from: 5000, to: 1500 }); tone(a, 280, 0, 0.09, { to: 900, vol: 0.04 }); }),
    bless: mk(a => { run(a, [523, 659, 784, 1047], 0.07, { type: "triangle", vol: 0.1 }); tone(a, 1047, 0.3, 0.3, { type: "triangle", vol: 0.04 }); }),
    curse: mk(a => { run(a, [392, 370, 349, 311], 0.1, { type: "sawtooth", vol: 0.05 }); tone(a, 98, 0.1, 0.6, { vol: 0.05, to: 60 }); }),
    swing: mk(a => { noise(a, 0, 0.22, { vol: 0.12, from: 400, to: 5000 }); tone(a, 1047, 0.24, 0.12, { type: "triangle", vol: 0.08 }); tone(a, 784, 0.3, 0.2, { type: "triangle", vol: 0.06 }); }),
    start: mk(a => {
      noise(a, 0, 0.2, { vol: 0.1, from: 500, to: 6000 });
      [523, 659, 784, 1047].forEach((f, i) => tone(a, f, 0.18 + i * 0.075, 0.12, { vol: 0.06 }));
      [1047, 1319, 1568].forEach(f => tone(a, f, 0.52, 0.55, { type: "triangle", vol: 0.07 }));
      tone(a, 523, 0.52, 0.55, { vol: 0.04 });
    }),
  };
})();

function SoundChip() {
  const [on, setOn] = useState(SFX.isOn());
  return <button className="chip" onClick={() => { SFX.set(!on); setOn(!on); }} aria-pressed={on} style={{ padding: "1px 6px", fontSize: 11 }}>{on ? "Sound on" : "Sound off"}</button>;
}
function SoundRow() {
  const [on, setOn] = useState(SFX.isOn());
  return (
    <div className="card" style={{ padding: "8px 11px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 9 }}>
      <div><div style={{ fontWeight: 700, fontSize: 13 }}>Sound effects</div><div className="cap">Little 8-bit blips for scores, banks, busts and cards.</div></div>
      <Toggle on={on} onChange={v => { SFX.set(v); setOn(v); }} />
    </div>
  );
}

/* ───────────── LOGO AND SPLASH ───────────── */
function Wordmark({ size = 54, still }) {
  return (
    <div className={`wm${still ? " still" : ""}`} style={{ fontSize: size }} aria-label={APP_NAME} role="img">
      {[..."PUNTARO"].map((c, i) => <span key={i} aria-hidden="true" style={{ animationDelay: `${0.45 + i * 0.07}s, ${1.1 + i * 0.12}s` }}>{c}</span>)}
    </div>
  );
}

// Slow warped colour bands, drawn tiny and scaled up so the pixels stay chunky.
function SwirlBg() {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current; if (!cv) return undefined;
    const ctx = cv.getContext("2d"); if (!ctx) return undefined;
    const W = 72, H = 128; cv.width = W; cv.height = H;
    const img = ctx.createImageData(W, H);
    const cols = [[16, 18, 15], [27, 44, 33], [40, 68, 50], [92, 66, 40]];
    const still = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0; let lastT = -1; const t0 = performance.now();
    const draw = now => {
      const t = (now - t0) / 1000;
      if (still || t - lastT > 0.04) {
        lastT = t;
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const u0 = (x / W - 0.5) * 2 * (W / H) * 1.6, v0 = (y / H - 0.5) * 2;
          const r = Math.hypot(u0, v0), a = Math.atan2(v0, u0) + r * 2.6 + t * 0.35;
          let u = r * Math.cos(a), v = r * Math.sin(a);
          for (let i = 1; i < 4; i++) { u += (0.45 / i) * Math.sin(i * v * 2.1 + t * 0.6); v += (0.45 / i) * Math.cos(i * u * 2.1 + t * 0.45); }
          const s = (Math.sin(u * 3 + v * 2) + 0.5 * Math.sin(v * 4 - u)) / 1.5;
          const band = s < -0.35 ? 0 : s < 0.1 ? 1 : s < 0.55 ? 2 : 3;
          const dim = Math.max(0.35, 1 - r * 0.38);
          const o = (y * W + x) * 4; const c = cols[band];
          img.data[o] = c[0] * dim; img.data[o + 1] = c[1] * dim; img.data[o + 2] = c[2] * dim; img.data[o + 3] = 255;
        }
        ctx.putImageData(img, 0, 0);
      }
      if (!still) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} className="swirl" aria-hidden="true" />;
}

function Splash({ onDone }) {
  const [leaving, setLeaving] = useState(false);
  const [music, setMusic] = useState(false);
  useEffect(() => { SFX.themeIfAllowed(); setMusic(SFX.themePlaying()); }, []);
  const go = () => {
    if (leaving) return;
    if (SFX.isOn() && !SFX.themePlaying() && !music) { SFX.theme(); setMusic(true); return; }
    setLeaving(true); SFX.stopTheme(); SFX.start(); setTimeout(onDone, 300);
  };
  useEffect(() => {
    const k = e => { if (e.key === "Enter" || e.key === " ") go(); };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  });
  return (
    <div className={`splash${leaving ? " out" : ""}`} onPointerDown={go} role="button" tabIndex={0} aria-label={`${APP_NAME}. Tap to start`}>
      <SwirlBg />
      <div className="scan" aria-hidden="true" />
      <div className="stack">
        <div className="mark"><Sprite name="logo" size={9} /></div>
        <Wordmark size={56} />
        <div className="tag"><i /><span>BANK IT. OR BUST.</span><i /></div>
      </div>
      <div className="tapgo">{music || !SFX.isOn() ? "TAP TO TEE OFF" : "TAP TO START"}</div>
      <div className="ver">ALPHA {APP_VERSION}</div>
    </div>
  );
}


/* ───────────── LOGIC ───────────── */
const MINUS = "−";
const fmtPar = n => (n === 0 ? "E" : n > 0 ? `+${n}` : `${MINUS}${Math.abs(n)}`);
const money = n => "$" + (Number.isInteger(n) ? n : n.toFixed(2));
// c = { slope, rating, par }. WHS: index x slope/113 + (rating - par)
const courseHcp = (hi, c) => Math.max(0, Math.round(hi * c.slope / 113 + (c.rating - (c.par ?? 72))));
const strokesOn = (ch, h) => Math.floor(ch / 18) + (SI[h] <= ch % 18 ? 1 : 0);
const range18 = [...Array(18).keys()];

const netOf = (r, id, h) => {
  const s = r.scores[id][h];
  if (s == null) return null;
  return s - (r.useHcp ? strokesOn(r.hcp[id], h) : 0);
};
const holeDone = (r, h) => r.playerIds.every(id => r.scores[id][h] != null);
const lowestUnique = (r, h) => {
  const nets = r.playerIds.map(id => [id, netOf(r, id, h)]);
  const min = Math.min(...nets.map(n => n[1]));
  const w = nets.filter(n => n[1] === min);
  return w.length === 1 ? w[0][0] : null;
};
const totalsFor = (r, id) => {
  let thru = 0, gross = 0, net = 0, grossPar = 0, netPar = 0;
  range18.forEach(h => {
    const s = r.scores[id][h];
    if (s == null) return;
    thru++; gross += s; grossPar += s - PAR[h];
    const n = netOf(r, id, h); net += n; netPar += n - PAR[h];
  });
  return { thru, gross, net, grossPar, netPar };
};

function nassauCalc(r) {
  const t = {};
  r.playerIds.forEach(id => (t[id] = { front: 0, back: 0 }));
  range18.forEach(h => {
    if (!holeDone(r, h)) return;
    const w = lowestUnique(r, h);
    if (w) t[w][h < 9 ? "front" : "back"]++;
  });
  return t;
}
function bbbCalc(r) {
  const p = {};
  r.playerIds.forEach(id => (p[id] = 0));
  r.bbb.forEach(e => e && ["bingo", "bango", "bongo"].forEach(k => e[k] && p[e[k]]++));
  return p;
}
function wolfCalc(r) {
  const ids = r.playerIds; const pts = {}; const hole = {};
  ids.forEach(id => (pts[id] = 0));
  range18.forEach(h => {
    const c = r.wolf[h];
    if (!c || !holeDone(r, h)) return;
    const wolf = ids[h % 4];
    const team = c === "lone" ? [wolf] : [wolf, c];
    const others = ids.filter(i => !team.includes(i));
    const tb = Math.min(...team.map(i => netOf(r, i, h)));
    const ob = Math.min(...others.map(i => netOf(r, i, h)));
    if (tb < ob) {
      if (c === "lone") { pts[wolf] += 4; hole[h] = "Lone wolf wins 4"; }
      else { team.forEach(i => (pts[i] += 2)); hole[h] = "Wolf team wins 2 each"; }
    } else if (ob < tb) {
      others.forEach(i => (pts[i] += 2)); hole[h] = "Pack wins 2 each";
    } else hole[h] = "Halved";
  });
  return { pts, hole };
}
function sixesCalc(r) {
  const ids = r.playerIds;
  const pairs = [[[0, 1], [2, 3]], [[0, 2], [1, 3]], [[0, 3], [1, 2]]];
  return pairs.map((pr, s) => {
    const A = pr[0].map(i => ids[i]); const B = pr[1].map(i => ids[i]);
    let a = 0, b = 0, done = 0;
    for (let h = s * 6; h < s * 6 + 6; h++) {
      if (!holeDone(r, h)) continue;
      done++;
      const ba = Math.min(...A.map(i => netOf(r, i, h)));
      const bb = Math.min(...B.map(i => netOf(r, i, h)));
      if (ba < bb) a++; else if (bb < ba) b++;
    }
    return { A, B, a, b, done };
  });
}
function rabbitCalc(r) {
  let holder = null, atNine = null, atEighteen = null, current = null;
  for (let h = 0; h < 18; h++) {
    if (!holeDone(r, h)) break;
    const w = lowestUnique(r, h);
    if (w) holder = w;
    current = holder;
    if (h === 8) atNine = holder;
    if (h === 17) atEighteen = holder;
  }
  return { holder: current, atNine, atEighteen };
}

/* Puntaro: net Stableford points go into a pot. Bank to lock them in. Net double bogey or worse busts the pot. */
const cardHole = h => SI[h] === 1 || SI[h] === 18;
const cardHoleLabel = h => (SI[h] === 1 ? "Hardest hole on the card." : "Easiest hole on the card.");
/* seeded random, so a round's draws are fixed once made and can be replayed */
const mulberry32 = a => () => {
  a |= 0; a = (a + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
/* Everyone draws one card from the mixed deck. With catch-up odds on, the leader draws
   mostly curses (70%) and last place mostly blessings (70%). Everyone else, and ties, get 50/50. */
function drawCards(r, h, rng) {
  const pc = puntCalc(r, h);
  const totals = r.playerIds.map(id => pc[id].total);
  const hi = Math.max(...totals), lo = Math.min(...totals);
  const out = {};
  r.playerIds.forEach(id => {
    let pBless = 0.5;
    if (r.opts.catchup && hi > lo) {
      if (pc[id].total === hi) pBless = 0.3;
      else if (pc[id].total === lo) pBless = 0.7;
    }
    const deck = rng() < pBless ? BLESSINGS : CURSES;
    out[id] = deck[Math.floor(rng() * deck.length)];
  });
  return out;
}

/* Handicap cushion: on a bust you keep 2% of the pot per course handicap stroke, up to half, rounded down. */
const cushionRate = (r, id) => (r.opts.cushion && r.useHcp ? Math.min(0.5, 0.02 * (r.hcp[id] || 0)) : 0);
const cushionKeep = (r, id, pot) => Math.floor(pot * cushionRate(r, id));
function puntCalc(r, upTo = 18) {
  const ids = r.playerIds;
  const S = {};
  ids.forEach(id => (S[id] = { pot: 0, banked: 0, streak: 0, shields: 0, vaults: 0, leak: 0, busts: 0, alive: true,
    log: [], bustAt: [], multAt: [], evAt: [], potAt: [], streakAt: [] }));
  for (let h = 0; h < upTo; h++) {
    const gifts = {}; ids.forEach(id => (gifts[id] = 0));
    const played = [];
    ids.forEach(id => {
      const st = S[id];
      if (!st.alive) return;
      if (r.scores[id][h] == null) { st.alive = false; return; }
      played.push(id);
      const card = r.opts.cards && r.draws[h] ? r.draws[h][id] || null : null;
      const evs = (r.events[id] && r.events[id][h]) || {};
      const diff = netOf(r, id, h) - PAR[h];
      let bonus = 0, penalty = 0, note = "";
      /* a leaky pot drips 1 point at the start of each of the three holes after it was drawn */
      if (st.leak > 0) { if (st.pot > 0) { st.pot -= 1; note = "Leak -1. "; } st.leak--; }
      if (card === "safe") st.shields++;
      if (card === "vault") st.vaults++;
      if (card === "hot") st.streak = Math.max(st.streak, 2);
      if (diff >= (card === "mine" ? 1 : 2)) {
        if (st.shields > 0) { st.shields--; st.log[h] = note + "Safety net saved the pot"; }
        else {
          const kept = cushionKeep(r, id, st.pot);
          st.bustAt[h] = { lost: st.pot - kept, kept };
          st.log[h] = note + (st.pot > 0 ? `Bust. Lost ${st.pot - kept}${kept > 0 ? `, kept ${kept}` : ""}` : "Bust");
          st.banked += kept; st.pot = 0; st.streak = 0; st.busts++;
        }
      } else {
        const base = diff <= -2 ? 4 : diff === -1 ? 3 : diff === 0 ? 2 : 1;
        st.streak = diff <= 0 ? st.streak + 1 : 0;
        const mult = st.streak >= 5 ? 3 : st.streak >= 3 ? 2 : 1;
        st.multAt[h] = mult;
        const sandy = r.opts.bonuses && evs.sandy && diff <= 0 ? 2 : 1;
        const core = base * mult * (card === "dd" ? 2 : 1);
        const pts = core * sandy;
        let flat = 0;
        if (r.opts.bonuses) {
          if (evs.updown && diff <= 0) flat += 2;
          if (evs.barkie && diff <= 0) flat += 2;
          if (evs.chipin) flat += 4;
        }
        if (r.opts.ntp && PAR[h] === 3 && r.ntp[h] === id && r.ntpOk[h]) flat += 3;
        st.pot += pts + flat; bonus = pts - core + flat;
        st.log[h] = note + `+${pts + flat}` + (mult > 1 ? ` (x${mult} streak)` : "") + (card === "dd" ? " (double dip)" : "") + (sandy > 1 ? " (sandy x2)" : "") + (flat > 0 ? ` (bonus +${flat})` : "");
      }
      if (card === "life") { st.pot += 3; st.log[h] += ", lifeline +3"; }
      if (r.opts.penalties) {
        const before = st.pot;
        if (evs.lost) st.pot = Math.max(0, st.pot - 3);
        if (evs.water) st.pot = Math.max(0, st.pot - 2);
        if (evs.fourputt) st.pot = Math.floor(st.pot / 2);
        penalty = before - st.pot;
        if (penalty > 0) st.log[h] += `, penalty -${penalty}`;
      }
      if (bonus > 0 || penalty > 0) st.evAt[h] = { bonus, penalty };
      if (card === "shout") {
        let given = 0;
        ids.forEach(m => { if (m !== id && st.pot > 0 && r.scores[m][h] != null) { st.pot -= 1; gifts[m] += 1; given++; } });
        if (given > 0) st.log[h] += `, shouted ${given}`;
      }
      if (card === "tax") { st.pot = Math.max(0, st.pot - 2); st.log[h] += ", taxed 2"; }
      if (card === "leaky") st.leak = 3;
      st.potAt[h] = st.pot; st.streakAt[h] = st.streak;
      if (h === 17 || card === "heavy" || r.bank[id][h]) {
        if (st.pot > 0) {
          st.log[h] += `, banked ${st.pot}`;
          if (h !== 17) {
            if (st.vaults > 0) { st.vaults--; st.log[h] += ", vault kept your streak"; }
            else { st.streak = 0; st.log[h] += ", streak reset"; }
          }
        }
        st.banked += st.pot; st.pot = 0;
      }
    });
    played.forEach(id => { S[id].pot += gifts[id]; });
  }
  const out = {};
  ids.forEach(id => {
    const st = S[id];
    const mult = st.streak >= 5 ? 3 : st.streak >= 3 ? 2 : 1;
    out[id] = { pot: st.pot, banked: st.banked, total: st.banked + st.pot, streak: st.streak, mult, shields: st.shields, vaults: st.vaults, leak: st.leak,
      busts: st.busts, log: st.log, bustAt: st.bustAt, multAt: st.multAt, evAt: st.evAt, potAt: st.potAt, streakAt: st.streakAt };
  });
  return out;
}

function countEvents(r, id) {
  let b = 0, p = 0;
  (r.events[id] || []).forEach(e => {
    if (!e) return;
    Object.keys(e).forEach(k => { if (e[k]) { if (EVENTS[k].kind === "bonus") b++; else p++; } });
  });
  const ntpWins = r.opts.ntp ? r.ntp.filter((w, h) => w === id && PAR[h] === 3 && r.ntpOk[h]).length : 0;
  return { b: (r.opts.bonuses ? b : 0) + ntpWins, p: r.opts.penalties ? p : 0 };
}
const tally = (st, c) => [
  st.busts === 0 ? "No busts" : st.busts === 1 ? "1 bust" : `${st.busts} busts`,
  c.b ? `${c.b} bonus${c.b > 1 ? "es" : ""}` : null,
  c.p ? `${c.p} penalt${c.p > 1 ? "ies" : "y"}` : null,
].filter(Boolean).join(", ");

/* ranked is best first. score (optional) maps id to points: tied players split the money for the places they cover. Whole dollars only. */
function payouts(r, ranked, score) {
  const n = ranked.length; const pool = r.stake * n; const pay = {};
  ranked.forEach(id => (pay[id] = 0));
  if (r.stake === 0) return pay;
  const by = Array(n).fill(0);
  if (r.split === "win") by[0] = pool;
  else if (r.split === "603010") (n >= 3 ? [0.6, 0.3, 0.1] : [0.7, 0.3]).forEach((s, i) => (by[i] = pool * s));
  else { const share = r.stake + r.stake / (n - 1); for (let i = 0; i < n - 1; i++) by[i] = share; }
  if (score) {
    let i = 0;
    while (i < n) {
      let j = i; while (j + 1 < n && score[ranked[j + 1]] === score[ranked[i]]) j++;
      const avg = by.slice(i, j + 1).reduce((a, b) => a + b, 0) / (j - i + 1);
      for (let k = i; k <= j; k++) by[k] = avg;
      i = j + 1;
    }
  }
  /* whole dollars only: round every share down, then hand the leftover dollars to first place (and anyone tied with them) one at a time */
  ranked.forEach((id, i) => (pay[id] = Math.floor(by[i] + 1e-6)));
  let left = pool - ranked.reduce((a, id) => a + pay[id], 0);
  const top = score ? ranked.filter(id => score[id] === score[ranked[0]]) : [ranked[0]];
  for (let k = 0; left > 0; k++, left--) pay[top[k % top.length]] += 1;
  return pay;
}
// Bank hints. A guide built from simulating thousands of rounds: holding a big pot pays off until about 20 points.
const erf = x => { const s = Math.sign(x); x = Math.abs(x); const t = 1 / (1 + 0.3275911 * x); return s * (1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x)); };
const normCdf = z => 0.5 * (1 + erf(z / Math.SQRT2));
// Chance this player makes a net double bogey or worse on hole h. A rough model from handicap and hole difficulty.
function bustRisk(r, id, h) {
  const ch = r.useHcp ? r.hcp[id] : 0; const st = r.useHcp ? strokesOn(ch, h) : 0;
  const mu = ch / 18 + ((9.5 - SI[h]) / 18) * 0.5; const sd = 0.75 + ch / 70;
  return Math.min(0.6, Math.max(0.005, 1 - normCdf((1.5 + st - mu) / sd)));
}
function bankAdvice(r, id, h, s) {
  if (h >= 17) return null;
  const pot = s.potAt[h] != null ? s.potAt[h] : s.pot; if (pot < 4) return null;
  const risk = bustRisk(r, id, h + 1);
  const streak = s.streakAt[h] != null ? s.streakAt[h] : s.streak; const mult = streak + 1 >= 5 ? 3 : streak + 1 >= 3 ? 2 : 1;
  const cardNext = r.opts.cards && cardHole(h + 1);
  const eff = pot * (1 - cushionRate(r, id)); /* what a bust would really cost */
  const exposure = risk * eff; const gain = 1.7 * mult * (1 - risk);
  let level = "hold";
  if (eff >= 20 || (cardNext && eff >= 10) || (eff >= 8 && exposure >= gain * 1.5)) level = "bank";
  else if (eff >= 12 || exposure >= gain) level = "think";
  return { risk, level, pot, cardNext };
}
const teamRows = (r, pc) => [0, 1].map(k => { const ids = r.playerIds.filter(id => r.teams[id] === k); return { k, ids, total: ids.reduce((a, id) => a + pc[id].total, 0) }; });
// 2v2: winning team splits the pool. A tie hands every buy-in back.
function teamPayouts(r, pc) {
  const pay = {}; r.playerIds.forEach(id => (pay[id] = 0));
  if (r.stake === 0) return pay;
  const [a, b] = teamRows(r, pc);
  if (a.total === b.total) { r.playerIds.forEach(id => (pay[id] = r.stake)); return pay; }
  const w = a.total > b.total ? a : b; const pool = r.stake * r.playerIds.length;
  w.ids.forEach(id => (pay[id] = Math.round((pool / w.ids.length) * 100) / 100));
  return pay;
}
function settle(nets) {
  const d = [], c = [];
  Object.entries(nets).forEach(([id, v]) => {
    const x = Math.round(v * 100) / 100;
    if (x < 0) d.push([id, -x]); else if (x > 0) c.push([id, x]);
  });
  const out = []; let i = 0, j = 0;
  while (i < d.length && j < c.length) {
    const amt = Math.min(d[i][1], c[j][1]);
    out.push([d[i][0], c[j][0], Math.round(amt * 100) / 100]);
    d[i][1] = Math.round((d[i][1] - amt) * 100) / 100;
    c[j][1] = Math.round((c[j][1] - amt) * 100) / 100;
    if (d[i][1] === 0) i++;
    if (c[j][1] === 0) j++;
  }
  return out;
}

function summarize(r, people, gid) {
  const n = id => people[id].name;
  const top = pts => {
    const m = Math.max(...Object.values(pts));
    if (m === 0) return "No points yet";
    return Object.keys(pts).filter(k => pts[k] === m).map(n).join(" & ") + ` (${m})`;
  };
  if (gid === "nassau") {
    const t = nassauCalc(r);
    const f = {}, b = {}, o = {};
    r.playerIds.forEach(id => { f[id] = t[id].front; b[id] = t[id].back; o[id] = t[id].front + t[id].back; });
    return [["Front 9", top(f)], ["Back 9", top(b)], ["Overall", top(o)]];
  }
  if (gid === "bbb") return [["Most points", top(bbbCalc(r))]];
  if (gid === "wolf") return [["Most points", top(wolfCalc(r).pts)]];
  if (gid === "sixes")
    return sixesCalc(r).map((s, i) => [
      `Holes ${i * 6 + 1} to ${i * 6 + 6}`,
      s.a === s.b ? `Tied ${s.a} to ${s.b}` : `${(s.a > s.b ? s.A : s.B).map(n).join(" & ")} win ${Math.max(s.a, s.b)} to ${Math.min(s.a, s.b)}`,
    ]);
  if (gid === "rabbit") {
    const x = rabbitCalc(r);
    return [["Held at 9", x.atNine ? n(x.atNine) : "Nobody"], ["Held at 18", x.atEighteen ? n(x.atEighteen) : "Nobody"]];
  }
  return [];
}

function buildRound(cfg, people, seed) {
  let course = cfg.course;
  let holes = cfg.holes || null;
  if (!course) { // older callers pass courseId
    const c = COURSES.find(x => x.id === cfg.courseId);
    course = { name: c.name, tee: c.tees[0].name, slope: c.tees[0].slope, rating: c.tees[0].rating, par: c.par };
    holes = c.holes;
  }
  applyHoles(holes);
  const hcp = {}; const scores = {}; const bank = {}; const events = {};
  cfg.playerIds.forEach(id => {
    hcp[id] = courseHcp(people[id].hi, course);
    scores[id] = Array(18).fill(null);
    bank[id] = Array(18).fill(false);
    events[id] = Array(18).fill(null);
  });
  const r = {
    course, holes, mode: cfg.mode || "ffa", teams: cfg.teams || null, playerIds: cfg.playerIds, games: cfg.games, useHcp: cfg.useHcp, hcp, scores, bank, events,
    opts: cfg.opts || { cards: true, catchup: true, bonuses: true, penalties: true, ntp: true, cushion: true },
    draws: Array(18).fill(null), seen: Array(18).fill(false), drawSeed: seed ? 20241024 : Math.floor(Math.random() * 1e9),
    ntp: Array(18).fill(null),
    ntpOk: Array(18).fill(false),
    stake: cfg.stake ?? 0, split: cfg.split || "603010",
    wolf: Array(18).fill(null), bbb: Array(18).fill(null), hole: 0,
  };
  if (seed) {
    const off = { me: [0, 1, 0, -1, 1, 0], sam: [0, 0, 1, 0, 0, 1], priya: [1, 1, 0, 1, 2, 0], jake: [1, 0, 0, 0, 1, -1] };
    Object.keys(off).forEach(id => off[id].forEach((o, h) => (r.scores[id][h] = PAR[h] + o)));
    r.wolf = ["sam", "lone", "jake", "lone", "priya", "jake", ...Array(12).fill(null)];
    const B = (a, b, c) => ({ bingo: a, bango: b, bongo: c });
    r.bbb = [B("sam", "me", "sam"), B("me", "me", "jake"), B("priya", "priya", "priya"), B("jake", "sam", "me"), B("sam", "me", "priya"), B("jake", "jake", "jake"), ...Array(12).fill(null)];
    r.bank.sam[2] = true; r.bank.jake[4] = true;
    r.events.me[3] = { chipin: true }; r.events.sam[0] = { sandy: true }; r.events.priya[4] = { lost: true }; r.events.jake[1] = { water: true };
    r.ntp[2] = "me"; r.ntpOk[2] = true;
    r.hole = 6; r.seen[3] = true;
  }
  if (r.opts.cards) range18.forEach(h => { if (cardHole(h) && h <= r.hole) r.draws[h] = drawCards(r, h, mulberry32(r.drawSeed + h * 977)); });
  return r;
}

/* ───────────── SMALL PARTS ───────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@400;500;600;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Silkscreen:wght@400&text=0123456789&display=swap');
.sg{--ink:#242622;--muted:#6E6A5E;--chalk:#E7E2D5;--card:#F4F0E6;--sel:#D3DACB;--night:#2A2C28;--dk:#1B1C1A;--pine:#2F4A3A;--mint:#A9BFA3;--fair:#3E6B4B;--lime:#D9BE8E;--flag:#C69C6D;--red:#B84A32;--bogey:#B84A32;--line:#C7BFAB;--track:#E7E2D5;--water:#8B6B4A;--head1:#2F4A3A;--head2:#294133;--grid:rgba(36,38,34,.05);--on-bg:#2A2C28;--on-fg:#F4F0E6;--hi:#F1ECDF;}
.sg.dark{--ink:#E8E3D6;--muted:#9B968A;--chalk:#1B1C1A;--card:#252724;--sel:#2C4033;--night:#454841;--pine:#4F7A5A;--fair:#7FA886;--lime:#E0C799;--red:#CC5A3E;--bogey:#CC5A3E;--line:#383A35;--track:#1B1C1A;--head1:#2C4536;--head2:#27402F;--grid:rgba(232,227,214,.03);--on-bg:#C69C6D;--on-fg:#1B1C1A;}
.sg{font-family:'Silkscreen','Pixelify Sans',ui-monospace,monospace;font-size:13px;line-height:1.22;letter-spacing:-.01em;color:var(--ink);background-color:var(--chalk);
 background-image:linear-gradient(var(--grid) 1px,transparent 1px),linear-gradient(90deg,var(--grid) 1px,transparent 1px);background-size:8px 8px;
 font-variant-numeric:tabular-nums;max-width:430px;margin:0 auto;min-height:100vh;position:relative;display:flex;flex-direction:column;}
.sg *{box-sizing:border-box;border-radius:0 !important;}
.sg *{font-synthesis:none;}
.sg h1,.sg h2,.sg h3,.sg p{margin:0;}
.sg h1,.sg h2,.sg h3,.sg .px,.sg .cta{font-weight:700 !important;letter-spacing:0 !important;}
.sg h1{font-size:22px !important;line-height:1.15 !important;}
.sg h2,.sg .h2{font-size:15px !important;line-height:1.2 !important;}
.sg h3{font-size:13px !important;line-height:1.2 !important;}
.sg button{font:inherit;color:inherit;cursor:pointer;border:0;background:none;padding:0;-webkit-tap-highlight-color:transparent;}
.sg button:focus-visible{outline:3px solid var(--water);outline-offset:2px;}
.sg svg{shape-rendering:crispEdges;}
.sg svg *{stroke-linecap:square;stroke-linejoin:miter;}
.stripes{background:repeating-linear-gradient(90deg,var(--head1) 0 32px,var(--head2) 32px 64px);border-bottom:4px solid var(--night);color:var(--hi);}
.card{background:var(--card);border:3px solid var(--night);box-shadow:3px 3px 0 var(--night);}
.pill{display:inline-flex;align-items:center;gap:5px;padding:1px 7px;font-weight:600;font-size:11px;color:var(--dk);border:2px solid var(--night);}
.stripes .pill{color:var(--hi);}
.chip{border:2px solid var(--night);background:var(--card);color:var(--ink);padding:2px 8px;font-weight:600;font-size:13px;white-space:nowrap;box-shadow:2px 2px 0 var(--night);}
.chip.on{background:var(--on-bg);border-color:var(--on-bg);color:var(--on-fg);box-shadow:none;transform:translate(2px,2px);}
.cta{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:10px;font-size:15px !important;background:var(--on-bg);color:var(--on-fg);border:3px solid var(--on-bg);box-shadow:0 3px 0 var(--fair);}
.cta:active{transform:translateY(3px);box-shadow:none;}
.cta:disabled{opacity:.4;cursor:not-allowed;}
.cap{font-size:11.5px;color:var(--muted);line-height:1.22;}
.scrollx{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding:2px 16px 5px;margin:0 -16px;}
.scrollx::-webkit-scrollbar{display:none;}
.tile{width:40px;height:40px;background:var(--dk);display:grid;place-items:center;flex:none;}
.holdfill{position:absolute;left:0;top:0;bottom:0;background:var(--red);opacity:.35;pointer-events:none;animation:holdfill .6s steps(6) forwards;}
@keyframes holdfill{from{width:0}to{width:100%}}
.is-bust{color:#fff;}
.is-bust .cap{color:#fff;}
.hot{color:var(--dk);}
.hot .cap{color:var(--dk);}
.pop{display:inline-block;animation:pop .25s steps(4);}
@keyframes pop{0%{transform:scale(.6)}60%{transform:scale(1.25)}100%{transform:scale(1)}}
.sheet{animation:up .25s steps(5);}
@keyframes up{from{transform:translateY(40px)}to{transform:none}}
.splash{position:fixed;inset:0;z-index:100;background:#14150F;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;cursor:pointer;touch-action:manipulation;user-select:none;-webkit-user-select:none;}
.splash.out{animation:splout .3s steps(5) forwards;}
@keyframes splout{0%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1.12)}}
.splash .swirl{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;}
.splash .scan{position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(0,0,0,.22) 0 2px,transparent 2px 4px);mix-blend-mode:multiply;}
.splash .stack{position:relative;display:flex;flex-direction:column;align-items:center;gap:18px;padding:0 16px;}
.splash .mark{transform:rotate(-6deg);filter:drop-shadow(6px 6px 0 rgba(0,0,0,.55));animation:markin .55s steps(7) both,markbob 2.4s steps(6) .8s infinite;}
@keyframes markin{0%{transform:translateY(-70vh) rotate(-40deg)}70%{transform:translateY(14px) rotate(-3deg)}100%{transform:translateY(0) rotate(-6deg)}}
@keyframes markbob{0%,100%{transform:rotate(-6deg) translateY(0)}50%{transform:rotate(-4deg) translateY(-7px)}}
.wm{display:flex;font-family:'Pixelify Sans',ui-monospace,monospace;font-weight:700;letter-spacing:2px;line-height:1;transform:rotate(-2deg);}
.wm span{display:inline-block;color:#EDE8DD;text-shadow:1px 1px 0 #D9B07A,2px 2px 0 #D9B07A,3px 3px 0 #7A5232,4px 4px 0 #7A5232,5px 5px 0 #14150F,6px 6px 0 #14150F,7px 7px 0 #14150F;animation:wmpop .4s steps(5) both,wmbob 1.8s steps(4) infinite;}
.wm span:nth-child(5){color:#D9B07A;}
.wm.still span{animation:none;text-shadow:1px 1px 0 #7A5232,2px 2px 0 #14150F;}
.wm.still{letter-spacing:1px;transform:none;}
@keyframes wmpop{0%{opacity:0;transform:translateY(-34px) scale(1.5)}100%{opacity:1;transform:none}}
@keyframes wmbob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
.splash .tag{display:flex;align-items:center;gap:10px;color:#D9B07A;font-size:12px;letter-spacing:.28em;font-weight:600;animation:tagin .5s steps(4) 1.1s both;}
.splash .tag i{display:block;width:34px;height:2px;background:#D9B07A;}
@keyframes tagin{from{opacity:0}to{opacity:1}}
.splash .tapgo{position:absolute;bottom:calc(64px + env(safe-area-inset-bottom,0px));color:#EDE8DD;font-weight:700;font-size:15px;letter-spacing:.2em;animation:blink 1s steps(2) infinite;text-shadow:2px 2px 0 #14150F;}
@keyframes blink{0%{opacity:1}50%{opacity:.25}}
.splash .ver{position:absolute;bottom:calc(24px + env(safe-area-inset-bottom,0px));color:#9B968A;font-size:11px;letter-spacing:.2em;}
@media (prefers-reduced-motion:reduce){.splash .mark,.wm span,.splash .tapgo,.splash .tag{animation:none}}

@keyframes flip{from{transform:scaleY(0)}to{transform:scaleY(1)}}
.reveal{transform-origin:top;animation:flip .35s steps(5);}
@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-6px)}80%{transform:translateX(6px)}}
@keyframes bustflash{0%,100%{background:var(--red)}50%{background:var(--dk)}}
.bust{animation:shake .5s steps(8) 1,bustflash .3s steps(1) 5;}
@keyframes hotflash{0%{background:var(--flag)}50%{background:var(--lime)}}
.hot{animation:hotflash .7s steps(1) infinite;}
@keyframes beat{0%,100%{transform:scale(1)}50%{transform:scale(1.3)}}
.beat{display:inline-block;animation:beat .6s steps(2) infinite;}
@keyframes flick{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
.flick{animation:flick .5s steps(2) infinite;}
@keyframes blink{50%{opacity:0}}
.blink{animation:blink .8s steps(1) infinite;}
.pcard{--cw:76px;--n:calc(var(--cw)*.05);--rx:0deg;--ry:0deg;--edge:#D9B07A;--bg:#2F4A3A;--band:#1F3A2B;--art1:#3E6B4B;--art2:#365F44;
 position:relative;width:var(--cw);height:calc(var(--cw)*1.36);flex:none;perspective:700px;transform:rotate(var(--rot,0deg));}
.pcard.curse{--edge:#B4472E;--bg:#2A2C28;--band:#16110F;--art1:#3A302B;--art2:#2F2622;}
.pcard:not(.still){animation:bob 2.6s steps(4) infinite;animation-delay:var(--d,0s);}
@keyframes bob{0%,100%{translate:0 0}50%{translate:0 -3px}}
.pc-tilt{position:absolute;inset:0;transform:rotateX(var(--rx)) rotateY(var(--ry));transform-style:preserve-3d;transition:transform .15s steps(3);}
.pc-flip{position:absolute;inset:0;transform-style:preserve-3d;transition:transform .45s steps(6);}
.pcard.down .pc-flip{transform:rotateY(180deg);}
.pc-face,.pc-in{clip-path:polygon(var(--n) 0,calc(100% - var(--n)) 0,calc(100% - var(--n)) var(--n),100% var(--n),100% calc(100% - var(--n)),calc(100% - var(--n)) calc(100% - var(--n)),calc(100% - var(--n)) 100%,var(--n) 100%,var(--n) calc(100% - var(--n)),0 calc(100% - var(--n)),0 var(--n),var(--n) var(--n));}
.pc-face{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;background:var(--edge);}
.pc-back{transform:rotateY(180deg);}
.pc-in{position:absolute;inset:calc(var(--cw)*.045);display:flex;flex-direction:column;background:var(--bg);overflow:hidden;}
.pc-name{height:calc(var(--cw)*.2);flex:none;display:grid;place-items:center;background:var(--band);color:#EDE8DD;font-weight:700;font-size:calc(var(--cw)*.135);white-space:nowrap;line-height:1;}
.pc-art{flex:1;display:grid;place-items:center;background-color:var(--art1);background-image:linear-gradient(45deg,var(--art2) 25%,transparent 25%,transparent 75%,var(--art2) 75%),linear-gradient(45deg,var(--art2) 25%,transparent 25%,transparent 75%,var(--art2) 75%);background-size:calc(var(--cw)*.1) calc(var(--cw)*.1);background-position:0 0,calc(var(--cw)*.05) calc(var(--cw)*.05);}
.pc-art svg{filter:drop-shadow(0 calc(var(--cw)*.03) 0 rgba(0,0,0,.45));}
.pc-kind{height:calc(var(--cw)*.17);flex:none;display:grid;place-items:center;background:var(--edge);color:#14150F;font-weight:700;font-size:calc(var(--cw)*.105);line-height:1;}
.pcard.mini .pc-name,.pcard.mini .pc-kind{display:none;}
.pc-fx{position:absolute;inset:0;pointer-events:none;}
.pcard.bless .pc-fx{background:linear-gradient(105deg,transparent 42%,rgba(255,255,255,.38) 50%,transparent 58%);background-size:260% 100%;background-position:150% 0;animation:shine 3.2s steps(14) infinite;animation-delay:var(--d,0s);}
@keyframes shine{0%{background-position:150% 0}45%,100%{background-position:-60% 0}}
.pcard.curse .pc-fx{background:repeating-linear-gradient(0deg,rgba(0,0,0,.22) 0 1px,transparent 1px 3px);animation:glitch 3.4s steps(1) infinite;animation-delay:var(--d,0s);}
@keyframes glitch{0%,88%,100%{transform:translateX(0);opacity:1}90%{transform:translateX(-2px);opacity:.6}93%{transform:translateX(2px);opacity:1}}
.pc-back .pc-in{background-color:#2A4535;background-image:repeating-linear-gradient(45deg,#2F4A3A 0 4px,#294133 4px 8px);align-items:center;justify-content:center;box-shadow:inset 0 0 0 calc(var(--cw)*.03) #14150F;}
@media (prefers-reduced-motion:reduce){.pc-flip,.pc-tilt{transition:none !important;}}
@media (prefers-reduced-motion:reduce){.sg *{animation:none !important;}}
`;

function Avatar({ p, size = 38, ring }) {
  return (
    <div style={{ width: size, height: size, background: p.color, color: "#fff", display: "grid", placeItems: "center", fontWeight: 700,
      fontSize: Math.max(10, Math.round(size * 0.5)), flex: "none", border: "3px solid var(--night)", boxShadow: ring ? "0 0 0 3px var(--card), 0 0 0 6px var(--night)" : "none" }}>
      {p.name[0]}
    </div>
  );
}

/* Birdies are chamfered "round" boxes, bogeys are square. Doubles get a second ring. */
const CH = "polygon(25% 0,75% 0,100% 25%,100% 75%,75% 100%,25% 100%,0 75%,0 25%)";
function ScoreMark({ v, par, size = 50 }) {
  const wrap = { width: size, height: size, display: "grid", placeItems: "center", flex: "none" };
  if (v == null) return <div style={{ ...wrap, fontSize: 20, fontWeight: 700, color: "var(--muted)" }}>–</div>;
  const d = v - par;
  const g = "var(--fair)", r = "var(--red)", m = "var(--mint)", w = "var(--card)";
  const layers = d <= -2 ? [[46, g], [41, w], [36, g], [31, m]] : d === -1 ? [[41, g], [36, m]] : d === 1 ? [[41, r], [36, w]] : d >= 2 ? [[46, r], [41, w], [36, r], [31, w]] : [];
  const birdie = d < 0;
  const num = <span key={v} className="pop" style={{ fontWeight: 700, fontSize: 16, lineHeight: 1, color: d > 0 ? "var(--red)" : d < 0 ? "var(--dk)" : "var(--ink)" }}>{v}</span>;
  const art = layers.reduceRight((child, [sz, bg]) => (
    <div style={{ width: sz, height: sz, background: bg, clipPath: birdie ? CH : "none", display: "grid", placeItems: "center" }}>{child}</div>
  ), num);
  return <div style={wrap}>{art}</div>;
}

function Toggle({ on, onChange }) {
  return (
    <button onClick={() => onChange(!on)} role="switch" aria-checked={on}
      style={{ width: 52, height: 30, borderRadius: 999, background: on ? "var(--fair)" : "var(--muted)", position: "relative", flex: "none", transition: "background .15s" }}>
      <span style={{ position: "absolute", top: 3, left: on ? 25 : 3, width: 24, height: 24, borderRadius: "50%", background: "#fff", transition: "left .15s" }} />
    </button>
  );
}

function PointsList({ round, people, pts }) {
  const rows = round.playerIds.map(id => ({ id, v: pts[id] })).sort((a, b) => b.v - a.v);
  const max = Math.max(1, ...rows.map(r => r.v));
  return (
    <div style={{ display: "grid", gap: 8, marginTop: 9 }}>
      {rows.map(r => (
        <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Avatar p={people[r.id]} size={24} />
          <div style={{ width: 52, fontWeight: 600, fontSize: 13 }}>{people[r.id].name}</div>
          <div style={{ flex: 1, height: 10, background: "var(--track)", borderRadius: 99 }}>
            <div style={{ width: `${(r.v / max) * 100}%`, height: "100%", borderRadius: 99, background: r.v === max && max > 0 ? "var(--fair)" : "var(--lime)", transition: "width .25s" }} />
          </div>
          <div style={{ width: 24, textAlign: "right", fontWeight: 800 }}>{r.v}</div>
        </div>
      ))}
    </div>
  );
}

function PickRow({ label, hint, ids, people, value, onPick }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, padding: "8px 0" }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 14 }}>{label}</div>
        <div className="cap">{hint}</div>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {ids.map(id => (
          <button key={id} onClick={() => onPick(id)} aria-label={`${label}: ${people[id].name}`} aria-pressed={value === id}
            style={{ opacity: value && value !== id ? 0.35 : 1 }}>
            <Avatar p={people[id]} size={31} ring={value === id} />
          </button>
        ))}
      </div>
    </div>
  );
}

const CARD_ART = { dd: "c_dd", safe: "c_safe", vault: "c_vault", hot: "c_hot", life: "c_life", tax: "c_tax", heavy: "c_heavy", leaky: "c_leaky", shout: "c_shout", mine: "c_mine" };

/* A Balatro-style card: notched pixel edges, tilts toward your finger, flips over, shimmers (blessings) or flickers (curses). */
function PCard({ id, cw = 76, down = false, still = false, rot = 0, delay = 0 }) {
  const ref = useRef(null);
  const c = CARDS[id];
  const ps = Math.max(2, Math.floor(cw * 0.07));
  const tilt = e => {
    const el = ref.current; if (!el) return;
    const b = el.getBoundingClientRect();
    el.style.setProperty("--ry", `${((e.clientX - b.left) / b.width - 0.5) * 26}deg`);
    el.style.setProperty("--rx", `${-((e.clientY - b.top) / b.height - 0.5) * 26}deg`);
  };
  const rest = () => { const el = ref.current; if (el) { el.style.setProperty("--rx", "0deg"); el.style.setProperty("--ry", "0deg"); } };
  return (
    <div ref={ref} className={`pcard ${c.kind} ${cw < 56 ? "mini" : ""} ${still ? "still" : ""} ${down ? "down" : ""}`}
      onPointerMove={tilt} onPointerLeave={rest} onPointerUp={rest} role="img"
      aria-label={down ? "Face-down card" : `${c.name}, ${c.kind === "bless" ? "blessing" : "curse"}. ${c.text}`}
      style={{ "--cw": `${cw}px`, "--rot": `${rot}deg`, "--d": `${delay}s` }}>
      <div className="pc-tilt"><div className="pc-flip">
        <div className="pc-face pc-front"><div className="pc-in">
          <div className="pc-name">{c.name}</div>
          <div className="pc-art"><Sprite name={CARD_ART[id]} size={ps} /></div>
          <div className="pc-kind">{c.kind === "bless" ? "Blessing" : "Curse"}</div>
          <div className="pc-fx" />
        </div></div>
        <div className="pc-face pc-back"><div className="pc-in"><Sprite name="c_ball" size={ps} /></div></div>
      </div></div>
    </div>
  );
}

function CardZoom({ id, who, onClose }) {
  const c = CARDS[id];
  return (
    <div style={{ position: "fixed", inset: 0, maxWidth: 430, margin: "0 auto", zIndex: 40, display: "grid", placeItems: "center", background: "rgba(0,0,0,.75)" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-label={c.name} style={{ display: "grid", justifyItems: "center", gap: 14, padding: 16 }}>
        <PCard id={id} cw={180} rot={-2} />
        <div className="card" style={{ padding: "8px 12px", maxWidth: 300, boxShadow: "none", textAlign: "center" }}>
          <div className="cap">{who ? `${who} drew` : c.kind === "bless" ? "Blessing" : "Curse"}</div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{c.name}</div>
          <div>{c.text}</div>
        </div>
        <button className="chip" onClick={onClose} style={{ padding: "4px 18px" }}>Close</button>
      </div>
    </div>
  );
}

/* Shown the first time you open a card hole: everyone's card starts face down. */
function CardReveal({ round, people, h, onDone }) {
  const ids = round.playerIds; const draw = round.draws[h];
  const [up, setUp] = useState({});
  const allUp = ids.every(id => up[id]);
  const cw = ids.length > 3 ? 82 : 100;
  const flipSfx = id => { SFX.flip(); setTimeout(() => (CARDS[draw[id]].kind === "bless" ? SFX.bless() : SFX.curse()), 260); };
  return (
    <div style={{ position: "fixed", inset: 0, maxWidth: 430, margin: "0 auto", zIndex: 35, display: "flex", alignItems: "flex-end", background: "rgba(0,0,0,.75)" }}>
      <div className="sheet card" role="dialog" aria-label="Draw your cards" style={{ width: "100%", padding: 12, boxShadow: "none", maxHeight: "92vh", overflowY: "auto" }}>
        <h2 className="h2">{SI[h] === 1 ? "Hardest" : "Easiest"} hole: the cards are out</h2>
        <p className="cap" style={{ marginTop: 3 }}>{allUp ? "Banks are locked. Here's what everyone drew." : "Tap a card to flip it, or flip them all."}</p>
        <div style={{ display: "flex", justifyContent: "center", gap: 8, margin: "16px 0 8px", flexWrap: "wrap" }}>
          {ids.map((id, i) => (
            <button key={id} onClick={() => { if (!up[id]) flipSfx(id); setUp(u => ({ ...u, [id]: true })); }} aria-label={`${people[id].name}: ${up[id] ? CARDS[draw[id]].name : "flip card"}`} style={{ display: "grid", justifyItems: "center", gap: 6 }}>
              <PCard id={draw[id]} cw={cw} down={!up[id]} rot={(i - (ids.length - 1) / 2) * 4} delay={i * 0.35} />
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}><Avatar p={people[id]} size={18} /><span style={{ fontWeight: 700, fontSize: 12 }}>{people[id].name}</span></div>
            </button>
          ))}
        </div>
        {allUp && (
          <div style={{ marginTop: 6 }}>
            {ids.map((id, i) => {
              const k = CARDS[draw[id]];
              return (
                <div key={id} style={{ display: "flex", gap: 8, alignItems: "baseline", padding: "5px 0", borderTop: i ? "1px solid var(--line)" : "none" }}>
                  <span style={{ fontWeight: 700, minWidth: 46 }}>{people[id].name}</span>
                  <span><b style={{ color: k.kind === "bless" ? "var(--fair)" : "var(--red)" }}>{k.name}.</b> {k.text}</span>
                </div>
              );
            })}
          </div>
        )}
        <div style={{ marginTop: 10 }}>
          {allUp
            ? <button className="cta" onClick={onDone}>Let's play</button>
            : <button className="cta" onClick={() => { ids.filter(i => !up[i]).forEach((i, k) => setTimeout(() => flipSfx(i), k * 180)); setUp(Object.fromEntries(ids.map(i => [i, true]))); }}>Flip all</button>}
        </div>
      </div>
    </div>
  );
}

function MiniBoard({ title, sub, rows, people }) {
  return (
    <div style={{ border: "3px solid var(--night)", padding: "8px 9px", background: "var(--card)" }}>
      <div style={{ fontWeight: 800, fontSize: 13 }}>{title}</div>
      <div className="cap" style={{ marginBottom: 5 }}>{sub}</div>
      {rows.map(([id, text], i) => (
        <div key={id} style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 0" }}>
          <span style={{ width: 14, fontWeight: 800, fontSize: 11, color: i === 0 ? "var(--fair)" : "var(--muted)" }}>{i + 1}</span>
          <Avatar p={people[id]} size={20} />
          <span style={{ flex: 1, fontWeight: 600, fontSize: 12 }}>{people[id].name}</span>
          <span style={{ fontWeight: 800, fontSize: 12 }}>{text}</span>
        </div>
      ))}
    </div>
  );
}

/* ───────────── GAME PANELS (live round) ───────────── */
function GamePanel({ gid, round, people, h, api }) {
  const [open, setOpen] = useState(null);
  const [zoom, setZoom] = useState(null);
  const ids = round.playerIds;
  const done = holeDone(round, h);
  const meta = GAMES.find(g => g.id === gid);

  if (gid === "punt") {
    const pc = puntCalc(round);
    const avail = Object.keys(EVENTS).filter(k => (EVENTS[k].kind === "bonus" ? round.opts.bonuses : round.opts.penalties));
    const puntRank = [...ids].sort((a, b) => pc[b].total - pc[a].total).map(id => [id, `${pc[id].total} pts`]);
    const compRank = [...ids].map(id => ({ id, t: totalsFor(round, id) })).sort((a, b) => (round.useHcp ? a.t.netPar - b.t.netPar : a.t.grossPar - b.t.grossPar))
      .map(x => [x.id, x.t.thru === 0 ? "–" : fmtPar(round.useHcp ? x.t.netPar : x.t.grossPar)]);
    return (
      <div>
        <p className="cap">Net Stableford points drop into your pot. Bank to lock them in, but banking resets your streak. A net double bogey or worse busts the pot. Three net pars or better in a row doubles your points, five in a row triples them.</p>
        {round.opts.ntp && PAR[h] === 3 && (
          <div className="card" style={{ marginTop: 6, padding: "2px 8px 6px", boxShadow: "3px 3px 0 var(--night)" }}>
            <PickRow label="Nearest the pin" hint="Must be on the green or fringe." ids={ids} people={people} value={round.ntp[h]} onPick={id => api.setNtp(h, id)} />
            {round.ntp[h] && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button className={`chip ${round.ntpOk[h] ? "on" : ""}`} aria-pressed={!!round.ntpOk[h]} onClick={() => api.setNtpOk(h)} style={{ padding: "1px 6px", fontSize: 12 }}>
                  {round.ntpOk[h] ? "On the green or fringe" : "Confirm: on the green or fringe"}
                </button>
                <span className="cap">{round.ntpOk[h] ? "+3 to their pot" : "No points until confirmed"}</span>
              </div>
            )}
          </div>
        )}
        <div>
          {ids.map((id, i) => {
            const s = pc[id]; const c = round.opts.cards && round.draws[h] ? round.draws[h][id] : null; const heavy = c === "heavy";
            const locked = round.opts.cards && round.draws[h + 1] != null && !heavy;
            const banking = heavy || round.bank[id][h];
            const bust = s.bustAt[h]; const hot = !bust && s.mult > 1;
            const evs = (round.events[id] && round.events[id][h]) || {};
            const active = avail.filter(k => evs[k]);
            const eff = s.evAt[h];
            return (
              <div key={id} className={`card ${bust ? "bust is-bust" : hot ? "hot" : ""}`}
                style={{ padding: 8, marginTop: 8, boxShadow: "3px 3px 0 var(--night)", background: bust ? "var(--red)" : hot ? "var(--flag)" : "var(--card)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Avatar p={people[id]} size={26} />
                  <div style={{ flex: 1, fontWeight: 700 }}>{people[id].name}</div>
                  <div style={{ textAlign: "right", minWidth: 62 }}><span className={hot ? "beat" : ""} style={{ fontWeight: 800, fontSize: 17 }}>{s.pot}</span><span className="cap"> in pot</span></div>
                  <div style={{ textAlign: "right", minWidth: 72 }}><span style={{ fontWeight: 800, fontSize: 17 }}>{s.banked}</span><span className="cap"> banked</span></div>
                </div>
                {bust && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                    <Sprite name="skull" size={4} className="flick" />
                    <div className="px blink" style={{ fontSize: 16 }}>BUST!</div>
                    <div style={{ marginLeft: "auto", fontWeight: 700 }}>{bust.lost + (bust.kept || 0) === 0 ? "Pot was empty" : `Lost ${bust.lost}${bust.kept ? `, kept ${bust.kept}` : ""}`}</div>
                  </div>
                )}
                {hot && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                    {Array.from({ length: s.mult }).map((_, k) => <Sprite key={k} name="flame" size={4} className="flick" />)}
                    <div className="px" style={{ fontSize: 15 }}>x{s.mult} streak</div>
                    <div className="cap" style={{ marginLeft: "auto" }}>{s.streak} in a row</div>
                  </div>
                )}
                {eff && (eff.bonus > 0 || eff.penalty > 0) && (
                  <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                    {eff.bonus > 0 && <span className="pill beat" style={{ background: "var(--dk)", color: "var(--lime)", borderColor: "var(--dk)", fontSize: 13 }}><Sprite name="star" size={2} />Bonus +{eff.bonus}</span>}
                    {eff.penalty > 0 && <span className="pill blink" style={{ background: "var(--red)", color: "#fff", fontSize: 13 }}>Penalty -{eff.penalty}</span>}
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                  {!hot && !bust && <span className="cap">Streak {s.streak}</span>}
                  {banking && <span className="cap">{s.vaults > 0 ? "Vault keeps your streak" : "Streak resets"}</span>}
                  {s.shields > 0 && <span className="pill" style={{ background: "var(--mint)", color: "var(--dk)", fontSize: 11 }}>Safety net held</span>}
                  {s.vaults > 0 && <span className="pill" style={{ background: "var(--mint)", color: "var(--dk)", fontSize: 11 }}>Vault held</span>}
                  {s.leak > 0 && <span className="pill blink" style={{ background: "var(--red)", color: "#fff", fontSize: 11 }}>Leaking {s.leak}</span>}
                  {(() => { const ad = !banking && !heavy && !locked && bankAdvice(round, id, h, s); return ad ? <span className="cap" title="A rough guide, not a rule" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>Bust risk next hole {Math.round(ad.risk * 100)}%<span className="pill" style={{ background: ad.level === "bank" ? "var(--red)" : ad.level === "think" ? "var(--flag)" : "var(--mint)", color: ad.level === "bank" ? "#fff" : "var(--dk)", fontSize: 11 }}>{ad.level === "bank" ? "Bank it" : ad.level === "think" ? "Think about it" : "Hold"}</span>{ad.cardNext && ad.level !== "hold" ? <span className="cap">cards next</span> : null}</span> : null; })()}
                  <button className={`chip ${banking ? "on" : ""}`} disabled={heavy || locked} aria-pressed={banking}
                    onClick={() => api.setBank(id, h, !round.bank[id][h])} style={{ marginLeft: "auto", padding: "2px 7px", fontSize: 12, opacity: heavy || locked ? 0.7 : 1 }}>
                    {heavy ? "Forced bank" : locked ? (banking ? "Banked. Locked" : "Bank locked") : banking ? "Banking after hole" : "Bank after hole"}
                  </button>
                </div>
                {avail.length > 0 && (
                  <div style={{ marginTop: 6 }}>
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
                      {active.map(k => (
                        <span key={k} className="pill" style={{ background: EVENTS[k].kind === "bonus" ? "var(--lime)" : "var(--red)", color: EVENTS[k].kind === "bonus" ? "var(--dk)" : "#fff", fontSize: 11 }}>{EVENTS[k].name}</span>
                      ))}
                      <button className="chip" aria-expanded={open === id} onClick={() => setOpen(open === id ? null : id)} style={{ padding: "1px 6px", fontSize: 12, marginLeft: active.length ? 0 : "auto" }}>
                        {open === id ? "Done" : "+ Bonus or penalty"}
                      </button>
                    </div>
                    {open === id && (
                      <div style={{ marginTop: 6 }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {avail.map(k => {
                            const on = !!evs[k]; const pen = EVENTS[k].kind === "penalty";
                            return (
                              <button key={k} className={`chip ${on ? "on" : ""}`} aria-pressed={on} onClick={() => api.setEvent(id, h, k)}
                                style={{ padding: "1px 6px", fontSize: 12, ...(on && pen ? { background: "var(--red)", borderColor: "var(--red)", color: "#fff" } : {}) }}>
                                {EVENTS[k].tag}
                              </button>
                            );
                          })}
                        </div>
                        {round.opts.bonuses && <p className="cap" style={{ marginTop: 5 }}>Sandy, up and down and barkie only count if you made net par or better.</p>}
                      </div>
                    )}
                  </div>
                )}
                {c && (
                  <div style={{ marginTop: 6, padding: 6, display: "flex", gap: 8, alignItems: "center", border: "2px solid var(--night)", background: CARDS[c].kind === "bless" ? "var(--mint)" : "var(--red)", color: CARDS[c].kind === "bless" ? "var(--dk)" : "#fff" }}>
                    <button onClick={() => setZoom({ id: c, who: people[id].name })} aria-label={`${CARDS[c].name}. Tap to enlarge`} style={{ flex: "none" }}>
                      <PCard id={c} cw={46} still rot={-3} />
                    </button>
                    <div style={{ fontSize: 13 }}><b>{CARDS[c].name}.</b> {CARDS[c].text}<div style={{ fontSize: 11, opacity: 0.75 }}>Tap the card to enlarge.</div></div>
                  </div>
                )}
                {s.log[h] && <div className="cap" style={{ marginTop: 5 }}>Hole {h + 1}: {s.log[h]}</div>}
              </div>
            );
          })}
        </div>
        {round.mode === "2v2" && round.teams && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginTop: 11 }}>
            {teamRows(round, pc).map(x => (
              <div key={x.k} style={{ border: "3px solid var(--night)", padding: "7px 9px", background: "var(--card)", borderLeft: `8px solid ${x.k ? "var(--mint)" : "var(--flag)"}` }}>
                <div className="cap">Team {x.k + 1}: {x.ids.map(id => people[id].name).join(" and ")}</div>
                <div style={{ fontWeight: 800, fontSize: 20 }}>{x.total}<span className="cap"> pts</span></div>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginTop: 11 }}>
          <MiniBoard title="Puntaro" sub="Banked plus pot" rows={puntRank} people={people} />
          <MiniBoard title="The Comp" sub={round.useHcp ? "Net to par" : "Gross to par"} rows={compRank} people={people} />
        </div>
        {zoom && <CardZoom id={zoom.id} who={zoom.who} onClose={() => setZoom(null)} />}
      </div>
    );
  }

  if (gid === "nassau") {
    const t = nassauCalc(round);
    const cols = [["Front 9", id => t[id].front], ["Back 9", id => t[id].back], ["Overall", id => t[id].front + t[id].back]];
    const maxes = cols.map(([, f]) => Math.max(...ids.map(f)));
    return (
      <div>
        <p className="cap">Holes won. Lowest {round.useHcp ? "net " : ""}score takes the hole.</p>
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr repeat(3,1fr)", gap: "6px 3px", marginTop: 9, alignItems: "center" }}>
          <div />
          {cols.map(([l]) => <div key={l} className="cap" style={{ textAlign: "center", fontWeight: 600 }}>{l}</div>)}
          {ids.map(id => (
            <div key={id} style={{ display: "contents" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}><Avatar p={people[id]} size={22} />{people[id].name}</div>
              {cols.map(([l, f], i) => (
                <div key={l} style={{ textAlign: "center" }}>
                  <span style={{ display: "inline-block", minWidth: 34, padding: "3px 0", borderRadius: 10, fontWeight: 800, fontSize: 14,
                    background: f(id) === maxes[i] && maxes[i] > 0 ? "var(--mint)" : "transparent", color: f(id) === maxes[i] && maxes[i] > 0 ? "var(--night)" : "var(--ink)" }}>{f(id)}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (gid === "bbb") {
    const e = round.bbb[h] || {};
    return (
      <div>
        <div style={{ borderBottom: "1px solid var(--line)" }}>
          <PickRow label="Bingo" hint="First on the green" ids={ids} people={people} value={e.bingo} onPick={id => api.setBbb(h, "bingo", id)} />
        </div>
        <div style={{ borderBottom: "1px solid var(--line)" }}>
          <PickRow label="Bango" hint="Closest to the pin" ids={ids} people={people} value={e.bango} onPick={id => api.setBbb(h, "bango", id)} />
        </div>
        <PickRow label="Bongo" hint="First in the hole" ids={ids} people={people} value={e.bongo} onPick={id => api.setBbb(h, "bongo", id)} />
        <PointsList round={round} people={people} pts={bbbCalc(round)} />
      </div>
    );
  }

  if (gid === "wolf") {
    const wc = wolfCalc(round); const wolfId = ids[h % 4]; const choice = round.wolf[h];
    const opts = [["lone", "Go alone"], ...ids.filter(i => i !== wolfId).map(i => [i, `Partner: ${people[i].name}`])];
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Avatar p={people[wolfId]} size={29} />
          <div><b>{people[wolfId].name}</b> is the wolf on hole {h + 1}</div>
        </div>
        <div className="scrollx" style={{ marginTop: 9 }}>
          {opts.map(([v, l]) => (
            <button key={v} className={`chip ${choice === v ? "on" : ""}`} onClick={() => api.setWolf(h, choice === v ? null : v)}>{l}</button>
          ))}
        </div>
        {wc.hole[h] && <div className="pill" style={{ background: "var(--mint)", color: "var(--dk)", marginTop: 9 }}>{wc.hole[h]}</div>}
        {!choice && done && <p className="cap" style={{ marginTop: 8 }}>Choose the wolf's partner to score this hole.</p>}
        <PointsList round={round} people={people} pts={wc.pts} />
      </div>
    );
  }

  if (gid === "sixes") {
    const segs = sixesCalc(round); const cur = Math.floor(h / 6);
    const nm = a => a.map(i => people[i].name).join(" & ");
    return (
      <div style={{ display: "grid", gap: 8 }}>
        {segs.map((s, i) => (
          <div key={i} style={{ padding: 9, borderRadius: 14, border: `1.5px solid ${i === cur ? "var(--fair)" : "var(--line)"}`, background: i === cur ? "var(--sel)" : "var(--card)" }}>
            <div className="cap" style={{ fontWeight: 600 }}>Holes {i * 6 + 1} to {i * 6 + 6}{i === cur ? " (now)" : ""}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5 }}>
              <div style={{ flex: 1, fontWeight: 600, fontSize: 13, textAlign: "left" }}>{nm(s.A)}</div>
              <div style={{ fontWeight: 800, fontSize: 17, whiteSpace: "nowrap" }}>{s.a} <span style={{ color: "var(--muted)" }}>:</span> {s.b}</div>
              <div style={{ flex: 1, fontWeight: 600, fontSize: 13, textAlign: "right" }}>{nm(s.B)}</div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (gid === "rabbit") {
    const x = rabbitCalc(round);
    const Row = ({ l, id }) => (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0" }}>
        <span className="cap" style={{ fontSize: 13 }}>{l}</span>
        {id ? <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700 }}><Avatar p={people[id]} size={20} />{people[id].name}</span> : <span className="cap">Not decided</span>}
      </div>
    );
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div className="tile"><Sprite name="rabbit" size={4} /></div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{x.holder ? `${people[x.holder].name} has the rabbit` : "Nobody has the rabbit yet"}</div>
        </div>
        <p className="cap" style={{ marginTop: 5 }}>Win a hole outright to take it. Ties leave it where it is.</p>
        <div style={{ marginTop: 6, borderTop: "1px solid var(--line)" }}>
          <Row l="Holder after hole 9" id={x.atNine} />
          <Row l="Holder after hole 18" id={x.atEighteen} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ border: "1.5px dashed var(--muted)", borderRadius: 14, padding: 14, textAlign: "center" }}>
      <Sparkles size={22} color="var(--fair)" />
      <div style={{ fontWeight: 800, marginTop: 5 }}>{meta.name}</div>
      <p className="cap" style={{ marginTop: 3 }}>Your own game plugs in here once the rules are set.</p>
    </div>
  );
}

/* ───────────── SCREENS ───────────── */
/* Press and hold a row for 0.6s to ask to delete it. A quick tap behaves as normal. */
function HoldRow({ onHold, children, style, className }) {
  const [holding, setHolding] = useState(false);
  const timer = useRef(null); const fired = useRef(false);
  const start = () => { fired.current = false; setHolding(true); timer.current = setTimeout(() => { fired.current = true; setHolding(false); onHold(); }, 600); };
  const stop = () => { clearTimeout(timer.current); setHolding(false); };
  return (
    <div className={className} onPointerDown={start} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop}
      onContextMenu={e => e.preventDefault()}
      onClickCapture={e => { if (fired.current) { e.stopPropagation(); e.preventDefault(); fired.current = false; } }}
      style={{ position: "relative", overflow: "hidden", touchAction: "manipulation", userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none", ...style }}>
      {holding && <div className="holdfill" aria-hidden="true" />}
      {children}
    </div>
  );
}

function Home({ people, round, recent, board, onStart, onResume, goFriends, dark, setDark, askDelete, onRules, onAbout, trash, now, onRestore }) {
  return (
    <div style={{ paddingBottom: 19 }}>
      <div className="stripes" style={{ padding: "17px 14px 44px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700 }}><Wordmark size={24} still />&nbsp;<button className="pill" onClick={onAbout} aria-label="About this alpha" style={{ background: "var(--flag)", color: "var(--dk)" }}>ALPHA</button></div>
          <div style={{ display: "flex", gap: 5 }}>
            <SoundChip />
            <button className="chip" onClick={() => setDark(!dark)} style={{ padding: "1px 6px", fontSize: 11 }}>{dark ? "Light mode" : "Dark mode"}</button>
          </div>
        </div>
        <p style={{ marginTop: 14, opacity: 0.8 }}>Handicap index {people.me.hi.toFixed(1)}</p>
      </div>
      <div style={{ padding: "0 12px", marginTop: -36, display: "grid", gap: 11 }}>
        <button onClick={onStart} style={{ background: "var(--flag)", color: "var(--dk)", borderRadius: 24, padding: "16px 16px", textAlign: "left", display: "flex", alignItems: "center", gap: 11, boxShadow: "0 6px 0 var(--night)", border: "3px solid var(--night)" }}>
          <div className="tile"><Sprite name="flag" size={5} /></div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: -0.4 }}>Start a round</div>
            <div style={{ fontSize: 12, opacity: 0.75 }}>Pick the course and your group.</div>
          </div>
        </button>

        <button className="card" onClick={onRules} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", textAlign: "left", width: "100%" }}>
          <div><div style={{ fontWeight: 700 }}>How Puntaro works</div><div className="cap">Scoring, cards, bonuses and the prize pool.</div></div>
          <ChevronRight size={18} />
        </button>

        {round && (
          <HoldRow className="card" onHold={() => askDelete("round")} style={{ padding: 12 }}>
            <div className="cap" style={{ fontWeight: 600 }}>Round in progress</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 3 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800 }}>{round.course.name}</h3>
              <span style={{ fontWeight: 700 }}>Hole {round.hole + 1} of 18</span>
            </div>
            {round.stake > 0 && <p className="cap" style={{ marginTop: 8 }}>Buy-in {money(round.stake)} each. Pool {money(round.stake * round.playerIds.length)}.</p>}
            <button className="cta" style={{ marginTop: 11, padding: 11, fontSize: 14 }} onClick={onResume}>Resume scoring</button>
            <p className="cap" style={{ marginTop: 5, textAlign: "center" }}>Hold to delete this round.</p>
          </HoldRow>
        )}

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "5px 2px 8px" }}>
            <h2 className="h2">Leading your friends</h2>
            <button onClick={goFriends} style={{ color: "var(--fair)", fontWeight: 700 }}>See all</button>
          </div>
          <div className="card" style={{ padding: "5px 11px" }}>
            {board.slice(0, 3).map((r, i) => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 0", borderTop: i ? "1px solid var(--line)" : "none" }}>
                <div style={{ width: 22, fontWeight: 800, color: i === 0 ? "var(--fair)" : "var(--muted)" }}>{i + 1}</div>
                <Avatar p={people[r.id]} size={29} />
                <div style={{ flex: 1, fontWeight: 700 }}>{people[r.id].name}</div>
                <div style={{ fontWeight: 800 }}>{r.v.toFixed(1)}<span className="cap"> avg net</span></div>
              </div>
            ))}
          </div>
        </div>

        {trash.length > 0 && (
          <div>
            <div style={{ margin: "5px 2px 6px" }}><h2 className="h2">Recently deleted</h2><p className="cap" style={{ marginTop: 2 }}>Kept for 5 minutes, then gone for good.</p></div>
            <div className="card" style={{ padding: "5px 11px" }}>
              {trash.map((x, i) => {
                const left = Math.max(0, Math.ceil((TRASH_MS - (now - x.at)) / 1000));
                return (
                  <div key={x.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "9px 0", borderTop: i ? "1px solid var(--line)" : "none" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700 }}>{x.kind === "round" ? x.item.course.name : x.item.course}</div>
                      <div className="cap">{x.kind === "round" ? "In progress" : x.item.when} · {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")} left</div>
                    </div>
                    <button className="chip" onClick={() => onRestore(x)}>Restore</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <div style={{ margin: "5px 2px 6px" }}><h2 className="h2">Recent rounds</h2><p className="cap" style={{ marginTop: 2 }}>Hold a round to delete it.</p></div>
          <div className="card" style={{ padding: "5px 11px" }}>
            {recent.length === 0 && <div className="cap" style={{ padding: "9px 0" }}>No rounds yet. Finish one and it shows up here.</div>}
            {recent.map((r, i) => (
              <HoldRow key={i} onHold={() => askDelete("recent", i)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", borderTop: i ? "1px solid var(--line)" : "none" }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{r.course}</div>
                  <div className="cap">{r.when}. {r.note}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{r.net}</div>
                  <div className="cap">net ({r.gross} gross)</div>
                </div>
              </HoldRow>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function RuleSection({ title, children, open0 }) {
  const [open, setOpen] = useState(!!open0);
  return (
    <div className="card" style={{ marginTop: 8 }}>
      <button onClick={() => setOpen(!open)} aria-expanded={open} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 10px", textAlign: "left" }}>
        <h3>{title}</h3>{open ? <Minus size={16} /> : <Plus size={16} />}
      </button>
      {open && <div style={{ padding: "0 10px 10px", display: "grid", gap: 6 }}>{children}</div>}
    </div>
  );
}
const RuleRow = ({ k, v }) => (
  <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
    <div style={{ width: 96, flex: "none", fontWeight: 700 }}>{k}</div>
    <div style={{ flex: 1 }}>{v}</div>
  </div>
);
function Rules({ onBack }) {
  const bless = BLESSINGS.map(k => CARDS[k]); const curse = CURSES.map(k => CARDS[k]);
  const ev = kind => Object.values(EVENTS).filter(e => e.kind === kind);
  return (
    <div style={{ flex: 1, paddingBottom: 24 }}>
      <div className="stripes" style={{ padding: "12px 12px 14px" }}>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 2, fontWeight: 600, opacity: 0.9 }}><ChevronLeft size={22} />Back</button>
        <h1 style={{ marginTop: 8 }}>How Puntaro works</h1>
        <p style={{ opacity: 0.85, marginTop: 3 }}>Play your normal round. This game runs on top of it.</p>
      </div>
      <div style={{ padding: "4px 14px" }}>
        <RuleSection title="The idea" open0>
          <p>Every hole earns points that drop into your pot. Keep them in the pot and they can grow, but one bad hole wipes the lot. Bank them and they're safe. Whoever has the most points at the end wins the pool.</p>
          <p className="cap">Scores are net, so a 5 handicap and a 25 handicap compete on level ground.</p>
        </RuleSection>
        <RuleSection title="Scoring a hole" open0>
          <RuleRow k="Net eagle or better" v="4 points" />
          <RuleRow k="Net birdie" v="3 points" />
          <RuleRow k="Net par" v="2 points" />
          <RuleRow k="Net bogey" v="1 point" />
          <RuleRow k="Net double or worse" v="Bust. You lose your whole pot." />
        </RuleSection>
        <RuleSection title="Pot, bank and bust">
          <p>Points sit in your pot until you bank them. You can bank after any hole. Banked points can never be lost.</p>
          <p>Banking resets your streak multiplier back to x1. Banking an empty pot does nothing.</p>
          <p>Whatever is still in your pot after the 18th hole banks automatically.</p>
          <p>Handicap cushion (always on when handicaps are on): when you bust you keep 2% of your pot for every handicap stroke you get, up to half, rounded down. A 16 stroke player busting with 20 points keeps 6 and loses 14. It's there to level the field.</p>
        </RuleSection>
        <RuleSection title="Bank hints">
          <p>Under each player's pot you'll see the chance of a net double bogey or worse on the next hole, with a hint: Hold, Think about it, or Bank it.</p>
          <p>It's a guide worked out from handicap and hole difficulty, and from simulating thousands of rounds. Holding a pot usually pays off until it reaches about 20 points. Past that, one bad hole costs more than the next hole is likely to earn. Cards on the next hole make it worth banking sooner.</p>
        </RuleSection>
        <RuleSection title="Streak multiplier">
          <p>Net par or better on 3 holes in a row doubles your points on that hole (x2). Five in a row triples them (x3). A bogey, a bust or a bank resets the streak.</p>
          <p className="cap">Holding your pot keeps the streak alive. That's where the greed comes in.</p>
        </RuleSection>
        <RuleSection title="Blessings & Curses">
          <p>On the hardest hole (stroke index 1) and the easiest (stroke index 18), everyone draws a card from a mixed deck of blessings and curses.</p>
          <p>The hole before, the app prompts the scorer with a last chance to bank. Once the cards are out, banks lock. Bank early to dodge a curse, or hold your nerve for a blessing.</p>
          <p>With catch-up odds on, the leader draws mostly curses and last place mostly blessings.</p>
          <div className="cap" style={{ fontWeight: 700, marginTop: 4 }}>Blessings</div>
          <div className="scrollx" style={{ paddingTop: 6 }}>{BLESSINGS.map((k, i) => <PCard key={k} id={k} cw={72} still rot={i % 2 ? 1.5 : -1.5} />)}</div>
          {bless.map(c => <RuleRow key={c.name} k={c.name} v={c.text} />)}
          <div className="cap" style={{ fontWeight: 700, marginTop: 4 }}>Curses</div>
          <div className="scrollx" style={{ paddingTop: 6 }}>{CURSES.map((k, i) => <PCard key={k} id={k} cw={72} still rot={i % 2 ? 1.5 : -1.5} />)}</div>
          {curse.map(c => <RuleRow key={c.name} k={c.name} v={c.text} />)}
        </RuleSection>
        <RuleSection title="Bonuses and penalties">
          <p>Log these from the player's card during the hole.</p>
          <div className="cap" style={{ fontWeight: 700 }}>Bonuses</div>
          {ev("bonus").map(e => <RuleRow key={e.name} k={e.tag} v={e.hint} />)}
          <p className="cap">Sandy, up and down and barkie only count with net par or better. A chip-in counts on anything except a bust.</p>
          <div className="cap" style={{ fontWeight: 700, marginTop: 4 }}>Penalties</div>
          {ev("penalty").map(e => <RuleRow key={e.name} k={e.tag} v={e.hint} />)}
          <p className="cap">Penalties hit before you bank, so you can't bank to dodge one. They never touch banked points.</p>
        </RuleSection>
        <RuleSection title="Nearest the pin">
          <p>On a par 3, the closest ball earns +3 in their pot. The ball must be on the green or fringe, and the scorer confirms that before the points count. If the winner busts the hole, the +3 is lost.</p>
        </RuleSection>
        <RuleSection title="Prize pool">
          <p>Agree a buy-in before you tee off. Payout is winner takes all, 60/30/10, or wooden spoon (last place pays the rest).</p>
          <p>Nobody can lose more than their buy-in. The app shows who owes who at the end but never moves money.</p>
        </RuleSection>
        <RuleSection title="Handicaps">
          <p>Your handicap index is adjusted for the course's slope and rating to give strokes on the hardest holes. Everything in Puntaro uses those net scores. The Comp, your normal scorecard result, runs alongside it.</p>
        </RuleSection>
        <p className="cap" style={{ margin: "10px 2px 0" }}>Bonuses, penalties, cards, catch-up odds and nearest the pin can each be switched off when you set up a round.</p>
      </div>
    </div>
  );
}

/* ───────────── COURSE FINDER (OpenStreetMap + scorecard entry) ───────────── */
const OVERPASS_HOSTS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter", "https://overpass.private.coffee/api/interpreter"];
const CACHE_KEY = "puntaro.cache.v1";
const cacheGet = k => { try { const c = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}")[k]; return c && Date.now() - c.t < 7 * 864e5 ? c.v : null; } catch (e) { return null; } };
const cacheSet = (k, v) => { try { const c = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}"); c[k] = { t: Date.now(), v }; localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch (e) { /* fine */ } };
// Ask every server at once and take the first good answer. Gives up after 15 seconds.
async function overpass(q) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 15000);
  try {
    return await Promise.any(OVERPASS_HOSTS.map(async h => {
      const res = await fetch(h, { method: "POST", signal: ctl.signal, headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "data=" + encodeURIComponent(q) });
      if (!res.ok) throw new Error("overpass " + res.status);
      return res.json();
    }));
  } finally { clearTimeout(timer); ctl.abort(); }
}
const GA_RATINGS_URL = "https://golf.org.au/courseratings";
const kmBetween = (a, b, c, d) => {
  const R = 6371, rad = x => (x * Math.PI) / 180;
  const dLat = rad(c - a), dLon = rad(d - b);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a)) * Math.cos(rad(c)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
const NOMINATIM = "https://nominatim.openstreetmap.org/search?format=json&limit=15&q=";
const isGolf = r => r.type === "golf_course" || r.class === "leisure" && r.type === "golf_course";
const nomCourse = (r, lat, lon) => ({
  osm: `${r.osm_type}-${r.osm_id}`, type: r.osm_type, id: r.osm_id, name: r.name || r.display_name.split(",")[0],
  lat: +r.lat, lon: +r.lon, dist: lat == null ? null : kmBetween(lat, lon, +r.lat, +r.lon), place: r.display_name.split(", ").slice(1, 3).join(", "),
});
async function nominatim(path) {
  const res = await fetch(NOMINATIM + path, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error("nominatim " + res.status);
  return res.json();
}
// Resolves with the first non-empty list. Empty only if every source answered empty. Throws only if every source failed.
const firstNonEmpty = ps => new Promise((res, rej) => {
  let n = ps.length, empty = false;
  ps.forEach(p => p.then(v => { if (v.length) res(v); else { empty = true; if (--n === 0) res([]); } }, () => { if (--n === 0) (empty ? res([]) : rej(new Error("net"))); }));
});
async function overpassNear(lat, lon) {
  const j = await overpass(`[out:json][timeout:20];nwr["leisure"="golf_course"]["name"](around:5000,${lat},${lon});out tags center 60;`);
  if (j.remark && /error|timed out/i.test(j.remark)) throw new Error("overpass busy");
  return (j.elements || []).filter(e => e.tags && e.tags.name).map(e => {
    const c = e.center || { lat: e.lat, lon: e.lon };
    return { osm: `${e.type}-${e.id}`, type: e.type, id: e.id, name: e.tags.name, lat: c.lat, lon: c.lon, dist: kmBetween(lat, lon, c.lat, c.lon) };
  });
}
async function nominatimNear(lat, lon) {
  const dLat = 0.05, dLon = 0.05 / Math.max(0.2, Math.cos((lat * Math.PI) / 180));
  const rows = await nominatim(`golf+course&bounded=1&viewbox=${lon - dLon},${lat + dLat},${lon + dLon},${lat - dLat}`);
  return rows.filter(isGolf).map(r => nomCourse(r, lat, lon));
}
async function findCoursesNear(lat, lon) {
  const key = `near5:${lat.toFixed(2)},${lon.toFixed(2)}`;
  const hit = cacheGet(key);
  const found = hit || await firstNonEmpty([overpassNear(lat, lon), nominatimNear(lat, lon)]);
  if (!hit && found.length) cacheSet(key, found);
  const seen = new Set();
  return found.filter(c => (seen.has(c.name) ? false : seen.add(c.name))).sort((a, b) => a.dist - b.dist).slice(0, 15);
}
// Type a course name or a town. Course names come back as a list; a town becomes a nearby search.
async function searchPlaces(q) {
  let rows = await nominatim(encodeURIComponent(q));
  let golf = rows.filter(isGolf);
  if (!golf.length && rows.length) { const more = await nominatim(encodeURIComponent(q + " golf")); golf = more.filter(isGolf); }
  if (golf.length) { const seen = new Set(); return { courses: golf.map(r => nomCourse(r)).filter(c => (seen.has(c.osm) ? false : seen.add(c.osm))).slice(0, 10) }; }
  if (!rows.length) throw new Error("notfound");
  return { town: { lat: +rows[0].lat, lon: +rows[0].lon } };
}
async function loadOsmHoles(c) {
  if (c.type === "node") return null;
  const area = (c.type === "relation" ? 3600000000 : 2400000000) + c.id;
  const hk = "holes:" + c.osm; const hh = cacheGet(hk);
  const j = hh ? { elements: hh } : await overpass(`[out:json][timeout:12];area(${area})->.a;way["golf"="hole"](area.a);out tags;`);
  if (!hh) cacheSet(hk, j.elements || []);
  const holes = Array(18).fill(null);
  (j.elements || []).forEach(e => {
    const t = e.tags || {}; const n = parseInt(t.ref, 10); const par = parseInt(t.par, 10);
    if (n >= 1 && n <= 18 && par >= 3 && par <= 6 && !holes[n - 1]) holes[n - 1] = { par, si: parseInt(t.handicap, 10) };
  });
  return holes.every(Boolean) ? holes : null;
}
// Returns "" when the form is good, otherwise the first problem in plain words.
function validateCourse(f) {
  if (!f.name.trim()) return "Give the course a name.";
  if (!f.tees.length) return "Add at least one tee.";
  for (const t of f.tees) {
    if (!t.name.trim()) return "Every tee needs a name (White, Blue, Red…).";
    const s = Number(t.slope), r = Number(t.rating);
    if (!Number.isInteger(s) || s < 55 || s > 155) return `${t.name}: slope must be a whole number from 55 to 155.`;
    if (!(r >= 50 && r <= 90)) return `${t.name}: course rating should be between 50 and 90, like 71.4.`;
  }
  if (f.holes.some(h => !(h.par >= 3 && h.par <= 6))) return "Pick the par for every hole (3, 4, 5 or 6).";
  const sis = f.holes.map(h => Number(h.si));
  if (sis.some(s => !Number.isInteger(s) || s < 1 || s > 18)) return "Every hole needs a stroke index from 1 to 18.";
  if (new Set(sis).size !== 18) return "Stroke indexes must be 1 to 18 with no repeats.";
  return "";
}
const toCourse = (f, draft) => {
  const holes = f.holes.map(h => ({ par: h.par, si: Number(h.si) }));
  return {
    id: draft.id || "hand-" + Date.now(), name: f.name.trim(), source: draft.source || "hand", lat: draft.lat, lon: draft.lon,
    par: holes.reduce((a, h) => a + h.par, 0), holes,
    tees: f.tees.map(t => ({ name: t.name.trim(), slope: Number(t.slope), rating: Number(t.rating) })),
  };
};
const inp = { background: "var(--chalk)", border: "2px solid var(--night)", color: "var(--ink)", padding: "6px 8px", font: "inherit", width: "100%", minWidth: 0 };

function ScorecardForm({ draft, onCancel, onSave }) {
  const [f, setF] = useState(() => ({
    name: draft.name || "",
    tees: draft.tees && draft.tees.length ? draft.tees.map(t => ({ name: t.name, slope: String(t.slope ?? ""), rating: String(t.rating ?? "") })) : [{ name: "White", slope: "", rating: "" }],
    holes: draft.holes ? draft.holes.map(h => ({ par: h.par, si: h.si >= 1 && h.si <= 18 ? String(h.si) : "" })) : range18.map(() => ({ par: null, si: "" })),
  }));
  const err = validateCourse(f);
  const par = f.holes.reduce((a, h) => a + (h.par || 0), 0);
  const setTee = (i, k, v) => setF(x => ({ ...x, tees: x.tees.map((t, j) => (j === i ? { ...t, [k]: v } : t)) }));
  const setHole = (i, k, v) => setF(x => ({ ...x, holes: x.holes.map((h, j) => (j === i ? { ...h, [k]: v } : h)) }));
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <div className="stripes" style={{ padding: "14px 12px 14px" }}>
        <button onClick={onCancel} style={{ display: "flex", alignItems: "center", gap: 2, fontWeight: 600 }}><ChevronLeft size={22} />Back</button>
        <h1 style={{ marginTop: 6 }}>Course details</h1>
      </div>
      <div style={{ padding: "10px 12px 96px", display: "grid", gap: 10 }}>
        <div className="card" style={{ padding: 10, display: "grid", gap: 6 }}>
          <div className="cap">{draft.source === "osm" ? (draft.holes ? "Pars and stroke indexes below are from OpenStreetMap volunteers and can be wrong. Check every hole against the scorecard. Slope and rating aren't on the map, so add them yourself." : "Found on OpenStreetMap, but no hole details are mapped. Add slope, rating, par and stroke index for every hole from the scorecard. Nothing is guessed for you.") : "Type these in from the scorecard."}</div>
          <a href={GA_RATINGS_URL} target="_blank" rel="noreferrer" style={{ color: "var(--fair)", fontWeight: 600 }}>Look up official ratings on the Golf Australia site ↗</a>
        </div>
        <div>
          <div className="cap" style={{ marginBottom: 3 }}>Course name</div>
          <input aria-label="Course name" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} style={inp} />
        </div>
        <div>
          <div className="cap" style={{ marginBottom: 3 }}>Tees (name, slope, course rating)</div>
          <div style={{ display: "grid", gap: 5 }}>
            {f.tees.map((t, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr auto", gap: 5, alignItems: "center" }}>
                <input aria-label={`Tee ${i + 1} name`} placeholder="White" value={t.name} onChange={e => setTee(i, "name", e.target.value)} style={inp} />
                <input aria-label={`Tee ${i + 1} slope`} placeholder="Slope" inputMode="numeric" value={t.slope} onChange={e => setTee(i, "slope", e.target.value)} style={inp} />
                <input aria-label={`Tee ${i + 1} rating`} placeholder="Rating" inputMode="decimal" value={t.rating} onChange={e => setTee(i, "rating", e.target.value)} style={inp} />
                <button aria-label={`Remove tee ${i + 1}`} disabled={f.tees.length < 2} onClick={() => setF(x => ({ ...x, tees: x.tees.filter((_, j) => j !== i) }))} style={{ opacity: f.tees.length < 2 ? 0.3 : 1 }}><X size={18} /></button>
              </div>
            ))}
          </div>
          {f.tees.length < 4 && <button className="chip" style={{ marginTop: 6 }} onClick={() => setF(x => ({ ...x, tees: [...x.tees, { name: "", slope: "", rating: "" }] }))}>+ Add tee</button>}
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between" }}><div className="cap">Holes: par and stroke index (SI)</div><div className="cap" style={{ fontWeight: 700 }}>{f.holes.every(h => h.par) ? `Par ${par}` : `${f.holes.filter(h => h.par).length} of 18 pars set`}</div></div>
          <div className="card" style={{ padding: "4px 8px", marginTop: 3 }}>
            {f.holes.map((h, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "26px 1fr 64px", gap: 8, alignItems: "center", padding: "4px 0", borderTop: i ? "1px solid var(--line)" : "none" }}>
                <div style={{ fontWeight: 700 }}>{i + 1}</div>
                <div style={{ display: "flex", gap: 4 }}>
                  {[3, 4, 5, 6].map(p => <button key={p} aria-label={`Hole ${i + 1} par ${p}`} className={`chip ${h.par === p ? "on" : ""}`} onClick={() => setHole(i, "par", p)} style={{ padding: "1px 10px" }}>{p}</button>)}
                </div>
                <input aria-label={`Hole ${i + 1} stroke index`} placeholder="SI" inputMode="numeric" value={h.si} onChange={e => setHole(i, "si", e.target.value)} style={{ ...inp, padding: "3px 6px" }} />
              </div>
            ))}
          </div>
        </div>
        <p className="cap">Your own entries are saved on this device only. They are not official Golf Australia data.</p>
      </div>
      <div style={{ position: "sticky", bottom: 0, padding: "9px 12px 14px", background: "linear-gradient(to top, var(--chalk) 70%, transparent)" }}>
        {err && <p role="alert" style={{ color: "var(--red)", fontWeight: 600, marginBottom: 6 }}>{err}</p>}
        <button className="cta" disabled={!!err} onClick={() => onSave(toCourse(f, draft))}>Save and use this course</button>
      </div>
    </div>
  );
}

function CourseFinder({ saved, onPick, onSaveCourse, onBack }) {
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [results, setResults] = useState(null);
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState(null);

  const near = async (lat, lon) => {
    setBusy("Looking for courses…");
    try {
      const r = await findCoursesNear(lat, lon);
      setResults(r);
      setMsg(r.length ? "" : "No mapped golf courses within 5 km. Try a nearby town name, or add one by hand.");
    } catch (e) { setMsg("Couldn't reach the map service. Check your connection, or add the course by hand."); }
    setBusy("");
  };
  const locate = () => {
    setMsg("");
    if (!navigator.geolocation) { setMsg("This device can't share its location. Type a town below instead."); return; }
    setBusy("Getting your location…");
    navigator.geolocation.getCurrentPosition(p => near(p.coords.latitude, p.coords.longitude), () => { setBusy(""); setMsg("Location is off or blocked. Type a town below instead."); }, { timeout: 10000, maximumAge: 3600000, enableHighAccuracy: false });
  };
  const search = async () => {
    if (!q.trim()) return;
    setBusy("Searching…"); setMsg("");
    try {
      const r = await searchPlaces(q.trim());
      if (r.courses) { setResults(r.courses); setBusy(""); }
      else await near(r.town.lat, r.town.lon);
    } catch (e) { setBusy(""); setMsg(e.message === "notfound" ? "Couldn't find that place or course. Try the town name, or add it by hand." : "Couldn't reach the map service. Check your connection, or add the course by hand."); }
  };
  const choose = async c => {
    const id = "osm-" + c.osm;
    const have = saved.find(s => s.id === id);
    if (have) { onPick(have); return; }
    setBusy("Loading hole details…");
    let holes = null;
    try { holes = await loadOsmHoles(c); } catch (e) { holes = null; }
    setBusy("");
    setDraft({ id, name: c.name, source: "osm", lat: c.lat, lon: c.lon, tees: [{ name: "White", slope: "", rating: "" }], holes });
  };

  if (draft) return <ScorecardForm draft={draft} onCancel={() => setDraft(null)} onSave={c => { onSaveCourse(c); onPick(c); }} />;
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <div className="stripes" style={{ padding: "14px 12px 14px" }}>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 2, fontWeight: 600 }}><ChevronLeft size={22} />Back</button>
        <h1 style={{ marginTop: 6 }}>Pick a course</h1>
      </div>
      <div style={{ padding: "10px 12px 24px", display: "grid", gap: 10 }}>
        <button className="cta" onClick={locate} disabled={!!busy}><MapPin size={18} />Courses near me</button>
        <div style={{ display: "flex", gap: 6 }}>
          <input aria-label="Search by town" placeholder="Or type a town, e.g. Byron Bay" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === "Enter" && search()} style={inp} />
          <button className="chip" onClick={search} disabled={!!busy} aria-label="Search"><Search size={18} /></button>
        </div>
        {busy && <p className="cap" role="status">{busy}</p>}
        {msg && <p role="alert" style={{ color: "var(--red)", fontWeight: 600 }}>{msg}</p>}
        {results && results.length > 0 && (
          <div>
            <div className="cap" style={{ marginBottom: 4 }}>Courses found (from OpenStreetMap)</div>
            <div style={{ display: "grid", gap: 6 }}>
              {results.map(c => (
                <button key={c.osm} className="card" onClick={() => choose(c)} style={{ padding: "9px 11px", textAlign: "left", display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontWeight: 700 }}>{c.name}</span><span className="cap">{c.dist == null ? c.place : c.dist < 10 ? c.dist.toFixed(1) : Math.round(c.dist)} {c.dist == null ? "" : "km"}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {saved.length > 0 && (
          <div>
            <div className="cap" style={{ marginBottom: 4 }}>Saved on this device</div>
            <div style={{ display: "grid", gap: 6 }}>
              {saved.map(c => (
                <button key={c.id} className="card" onClick={() => onPick(c)} style={{ padding: "9px 11px", textAlign: "left", display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontWeight: 700 }}>{c.name}</span><span className="cap">{c.tees.length} tee{c.tees.length > 1 ? "s" : ""}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <button className="chip" style={{ padding: "7px 0", textAlign: "center" }} onClick={() => setDraft({ source: "hand", name: "", tees: [{ name: "White", slope: "", rating: "" }], holes: null })}>+ Add a course by hand</button>
        <div>
          <div className="cap" style={{ marginBottom: 4 }}>Sample courses (made up, for trying the app)</div>
          <div style={{ display: "grid", gap: 6 }}>
            {COURSES.map(c => (
              <button key={c.id} className="card" onClick={() => onPick(c)} style={{ padding: "9px 11px", textAlign: "left", display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontWeight: 700 }}>{c.name}</span><span className="cap">slope {c.tees[0].slope}, rating {c.tees[0].rating}</span>
              </button>
            ))}
          </div>
        </div>
        <p className="cap">Course names and locations come from OpenStreetMap contributors (© OpenStreetMap, ODbL). Slope and rating are whatever you enter. Check them against the scorecard.</p>
      </div>
    </div>
  );
}

function AboutSheet({ onClose, onReset }) {
  return (
    <div style={{ position: "fixed", inset: 0, maxWidth: 430, margin: "0 auto", zIndex: 40, display: "flex", alignItems: "flex-end", background: "rgba(0,0,0,.6)" }} onClick={onClose}>
      <div className="sheet card" role="dialog" aria-label={`About ${APP_NAME}`} onClick={e => e.stopPropagation()} style={{ width: "100%", padding: 12, boxShadow: "none", maxHeight: "85vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 className="h2">{APP_NAME} <span className="pill" style={{ background: "var(--flag)" }}>ALPHA {APP_VERSION}</span></h2>
          <button onClick={onClose} aria-label="Close"><X size={22} /></button>
        </div>
        <p style={{ marginTop: 8 }}>A points-only side game that runs alongside your normal comp. Bank your points or bust and lose the pot.</p>
        <div style={{ display: "grid", gap: 5, marginTop: 10 }}>
          <p><b>Working:</b> banking and busting, Blessings & Curses, bonuses and penalties, near the pin, prize pool maths, handicap strokes, course finder.</p>
          <p><b>Demo only:</b> friends, stats and leaderboards are made-up people and numbers. Nothing syncs between devices yet.</p>
          <p><b>Course data:</b> course names come from OpenStreetMap. Slope, rating, par and stroke index are typed in by the player. This is not official Golf Australia data and has no connection to Golf Australia.</p>
          <p><b>Money:</b> the prize pool is a scoreboard only. {APP_NAME} never takes or moves money.</p>
          <p><b>Saved on this device:</b> courses you add. Nothing is sent to a server.</p>
        </div>
        <button className="chip" style={{ marginTop: 12, padding: "7px 0", textAlign: "center", width: "100%" }} onClick={onReset}>Reset demo (clears saved courses)</button>
      </div>
    </div>
  );
}

const MAXP = 8;
const EXTRA_INFO = {
  bonuses: ["Bonuses", "Sandy x2, up and down +2, chip-in +4, barkie +2."],
  ntp: ["Nearest the pin", "Closest to the pin on a par 3 earns +3. Ball must be on the green or fringe."],
  penalties: ["Penalties", "Lost ball -3, wet one -2, four putt halves your pot."],
};
function Setup({ people, friendIds, saved, onSaveCourse, onAddGuest, onBack, onGo }) {
  const [course, setCourse] = useState(COURSES[0]);
  const [teeI, setTeeI] = useState(0);
  const [finding, setFinding] = useState(false);
  const [sel, setSel] = useState(["me", "sam", "priya", "jake"]);
  const [games, setGames] = useState(["punt"]);
  const [useHcp, setUseHcp] = useState(true);
  const [stake, setStake] = useState(10);
  const [custom, setCustom] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const extraKeys = ["bonuses", "ntp", "penalties"];
  const setExtras = v => setOpts(o => ({ ...o, bonuses: v, ntp: v, penalties: v }));
  const [customText, setCustomText] = useState("");
  const [split, setSplit] = useState("603010");
  const [opts, setOpts] = useState({ cards: true, catchup: true, bonuses: true, penalties: true, ntp: true, cushion: true });
  const tee = course.tees[Math.min(teeI, course.tees.length - 1)];
  const cpar = course.holes ? course.holes.reduce((a, h) => a + h.par, 0) : course.par;
  const cinfo = { slope: tee.slope, rating: tee.rating, par: cpar };
  const pickCourse = c => { setCourse(c); setTeeI(0); setFinding(false); };
  const [sheet, setSheet] = useState(null);
  const [q, setQ] = useState("");
  const [mode, setMode] = useState("ffa");
  const [teams, setTeams] = useState({});
  const effMode = sel.length === 4 ? mode : "ffa";
  const teamOf = id => (teams[id] != null ? teams[id] : sel.indexOf(id) < 2 ? 0 : 1);
  const teamCount = sel.filter(id => teamOf(id) === 0).length;
  const setTeam = (id, k) => setTeams(x => ({ ...x, ...Object.fromEntries(sel.map(i => [i, teamOf(i)])), [id]: k }));
  const autoBalance = () => { const s = [...sel].sort((x, y) => people[x].hi - people[y].hi); setTeams({ [s[0]]: 0, [s[3]]: 0, [s[1]]: 1, [s[2]]: 1 }); };
  const addPlayer = id => setSel(s => (s.includes(id) || s.length >= MAXP ? s : [...s, id]));
  const removePlayer = id => { if (id !== "me") setSel(s => s.filter(x => x !== id)); };
  const pickList = [...friendIds, ...Object.keys(people).filter(id => people[id].guest)].filter(id => people[id] && people[id].name.toLowerCase().includes(q.trim().toLowerCase()));
  const Label = ({ children, sub }) => (
    <div style={{ margin: "14px 0 6px" }}><h2 className="h2">{children}</h2>{sub && <p className="cap" style={{ marginTop: 2 }}>{sub}</p>}</div>
  );

  if (finding) return <CourseFinder saved={saved} onPick={pickCourse} onSaveCourse={onSaveCourse} onBack={() => setFinding(false)} />;
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <div className="stripes" style={{ padding: "14px 12px 17px" }}>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 2, fontWeight: 600, opacity: 0.9 }}><ChevronLeft size={22} />Back</button>
        <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.8, marginTop: 8 }}>New round</h1>
      </div>
      <div style={{ padding: "0 12px 94px", flex: 1 }}>
        <Label>Course</Label>
        <div className="card" style={{ padding: "10px 12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15 }}>{course.name}</div>
              <div className="cap">{course.source === "sample" ? "Sample course (made up)" : course.source === "osm" ? "From OpenStreetMap, ratings entered by you" : "Added by hand"}</div>
            </div>
            <button className="chip" onClick={() => setFinding(true)}>Change</button>
          </div>
          {course.tees.length > 1 && (
            <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              {course.tees.map((x, i) => <button key={i} className={`chip ${i === teeI ? "on" : ""}`} onClick={() => setTeeI(i)}>{x.name}</button>)}
            </div>
          )}
          <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
            <div><div style={{ fontWeight: 800 }}>{tee.slope}</div><div className="cap">slope</div></div>
            <div><div style={{ fontWeight: 800 }}>{tee.rating}</div><div className="cap">rating</div></div>
            <div><div style={{ fontWeight: 800 }}>{cpar}</div><div className="cap">par</div></div>
          </div>
        </div>

        <Label sub={`Up to ${MAXP}. Add friends from your list, or guests by name and handicap.`}>Players</Label>
        <div className="card" style={{ padding: "3px 11px" }}>
          {sel.map((id, i) => (
            <div key={id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderTop: i ? "1px solid var(--line)" : "none" }}>
              <Avatar p={people[id]} size={26} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700 }}>{people[id].name}</div>
                <div className="cap">Index {people[id].hi.toFixed(1)}{people[id].guest ? " · guest" : ""}</div>
              </div>
              {effMode === "2v2" && (
                <button className="pill" aria-label={`${people[id].name} team ${teamOf(id) + 1}, tap to switch`} onClick={() => setTeam(id, 1 - teamOf(id))} style={{ background: teamOf(id) ? "var(--mint)" : "var(--flag)", color: "var(--dk)" }}>Team {teamOf(id) + 1}</button>
              )}
              {id !== "me" && <button aria-label={`Remove ${people[id].name}`} onClick={() => removePlayer(id)}><X size={18} /></button>}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          <button className="chip" disabled={sel.length >= MAXP} onClick={() => setSheet("friend")}>+ Friend</button>
          <button className="chip" disabled={sel.length >= MAXP} onClick={() => setSheet("guest")}>+ Guest</button>
        </div>

        <Label sub={sel.length === 4 ? "Everyone plays their own Puntaro. In 2v2 the team totals decide it." : "2v2 needs exactly four players."}>Format</Label>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button className={`chip ${effMode === "ffa" ? "on" : ""}`} onClick={() => setMode("ffa")}>Free for all</button>
          <button className={`chip ${effMode === "2v2" ? "on" : ""}`} disabled={sel.length !== 4} onClick={() => { setMode("2v2"); setTeams(Object.fromEntries(sel.map((id, i) => [id, i < 2 ? 0 : 1]))); }} style={{ opacity: sel.length === 4 ? 1 : 0.5 }}>2v2</button>
          {effMode === "2v2" && <button className="chip" onClick={autoBalance}>Auto-balance by handicap</button>}
        </div>
        {effMode === "2v2" && teamCount !== 2 && <p className="cap" role="alert" style={{ color: "var(--red)", fontWeight: 600, marginTop: 5 }}>Two players per team. Tap a Team pill to switch someone.</p>}

        {sheet === "friend" && (
          <Sheet title="Add a friend" onClose={() => { setSheet(null); setQ(""); }}>
            <input aria-label="Search friends" placeholder="Search your friends and past guests" value={q} onChange={e => setQ(e.target.value)} style={inp} />
            <div style={{ marginTop: 8 }}>
              {pickList.length === 0 && <p className="cap">No one matches. Try a guest instead.</p>}
              {pickList.map((id, i) => (
                <div key={id} style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 0", borderTop: i ? "1px solid var(--line)" : "none" }}>
                  <Avatar p={people[id]} size={28} />
                  <div style={{ flex: 1 }}><div style={{ fontWeight: 700 }}>{people[id].name}</div><div className="cap">Index {people[id].hi.toFixed(1)}{people[id].guest ? " · guest" : ""}</div></div>
                  <button className="chip" disabled={sel.includes(id) || sel.length >= MAXP} onClick={() => addPlayer(id)}>{sel.includes(id) ? "Added" : "Add"}</button>
                </div>
              ))}
            </div>
          </Sheet>
        )}
        {sheet === "guest" && (
          <Sheet title="Add a guest" onClose={() => setSheet(null)}>
            <p className="cap" style={{ marginBottom: 8 }}>For mates who aren't on the app. You score for them.</p>
            <PersonForm cta="Add to round" onSubmit={g => { addPlayer(onAddGuest(g)); setSheet(null); }} />
          </Sheet>
        )}

        <Label sub="Net scoring is what lets mixed handicaps play each other.">Handicaps</Label>
        <div className="card" style={{ padding: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 9 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14 }}>Use handicaps</div>
              <div className="cap">Strokes are given on the hardest holes, based on this course's slope ({tee.slope}) and rating ({tee.rating}).</div>
            </div>
            <Toggle on={useHcp} onChange={setUseHcp} />
          </div>
          {useHcp && (
            <div style={{ marginTop: 11, borderTop: "1px solid var(--line)", paddingTop: 5 }}>
              {sel.map(id => (
                <div key={id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
                  <Avatar p={people[id]} size={24} />
                  <div style={{ flex: 1, fontWeight: 600 }}>{people[id].name} <span className="cap">index {people[id].hi.toFixed(1)}</span></div>
                  <div style={{ fontWeight: 800 }}>{courseHcp(people[id].hi, cinfo)} <span className="cap" style={{ fontWeight: 400 }}>strokes</span></div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Label sub="Cards, catch-up odds and the handicap cushion are always part of the game. These three are up to your group.">Extras</Label>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button className={`chip ${!showCustom && extraKeys.every(k => opts[k]) ? "on" : ""}`} onClick={() => { setExtras(true); setShowCustom(false); }}>Everything</button>
          <button className={`chip ${!showCustom && extraKeys.every(k => !opts[k]) ? "on" : ""}`} onClick={() => { setExtras(false); setShowCustom(false); }}>Keep it simple</button>
          <button className={`chip ${showCustom ? "on" : ""}`} aria-expanded={showCustom} onClick={() => setShowCustom(s => !s)}>Customise</button>
        </div>
        <p className="cap" style={{ marginTop: 6 }}>{extraKeys.filter(k => opts[k]).length === 0 ? "Just the core game. Fewest taps for the scorer." : `On: ${extraKeys.filter(k => opts[k]).map(k => EXTRA_INFO[k][0].toLowerCase()).join(", ")}.`}</p>
        {showCustom && (
          <div className="card" style={{ padding: "3px 11px", marginTop: 8 }}>
            {extraKeys.map((k, i) => (
              <div key={k} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 9, padding: "8px 0", borderTop: i ? "1px solid var(--line)" : "none" }}>
                <div><div style={{ fontWeight: 700, fontSize: 15 }}>{EXTRA_INFO[k][0]}</div><div className="cap">{EXTRA_INFO[k][1]}</div></div>
                <Toggle on={opts[k]} onChange={v => setOpts(o => ({ ...o, [k]: v }))} />
              </div>
            ))}
          </div>
        )}

        <Label sub="Agree a buy-in before you tee off. The app tracks who owes who and never moves money.">Prize pool</Label>
        <div className="card" style={{ padding: 12 }}>
          <div className="cap" style={{ fontWeight: 600 }}>Buy-in per player</div>
          <div className="scrollx" style={{ marginTop: 6 }}>
            {STAKES.map(s => <button key={s} className={`chip ${!custom && stake === s ? "on" : ""}`} onClick={() => { setCustom(false); setStake(s); }}>{s === 0 ? "Bragging rights" : money(s)}</button>)}
            <button className={`chip ${custom ? "on" : ""}`} onClick={() => { setCustom(true); const v = Number(customText); if (v > 0) setStake(v); }}>Custom amount</button>
          </div>
          {custom && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
              <span style={{ fontWeight: 800 }}>$</span>
              <input aria-label="Custom buy-in" inputMode="numeric" placeholder="e.g. 15" value={customText} onChange={e => { const x = e.target.value.replace(/[^0-9]/g, "").slice(0, 4); setCustomText(x); const v = Number(x); if (v > 0 && v <= 1000) setStake(v); }} style={{ ...inp, width: 110 }} />
              <span className="cap">whole dollars per player, up to $1000</span>
            </div>
          )}
          {stake > 0 && (
            <>
              {effMode === "2v2"
                ? <p className="cap" style={{ marginTop: 11 }}>Winning team splits the pool. A tie hands every buy-in back.</p>
                : <>
                  <div className="cap" style={{ fontWeight: 600, marginTop: 11 }}>How it pays out</div>
                  <div className="scrollx" style={{ marginTop: 6 }}>
                    {SPLITS.map(([k, l]) => <button key={k} className={`chip ${split === k ? "on" : ""}`} onClick={() => setSplit(k)}>{l}</button>)}
                  </div>
                </>}
              <div style={{ marginTop: 11, borderTop: "1px solid var(--line)", paddingTop: 9, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div><div style={{ fontWeight: 800, fontSize: 14 }}>Pool {money(stake * sel.length)}</div><div className="cap">The most anyone can lose is their {money(stake)} buy-in.</div></div>
              </div>
            </>
          )}
        </div>

      </div>
      <div style={{ position: "sticky", bottom: 0, padding: "9px 12px 14px", background: "linear-gradient(to top, var(--chalk) 70%, transparent)" }}>
        <button className="cta" disabled={sel.length < 2 || (effMode === "2v2" && teamCount !== 2)} onClick={() => onGo({ mode: effMode, teams: effMode === "2v2" ? Object.fromEntries(sel.map(id => [id, teamOf(id)])) : null, course: { name: course.name, tee: tee.name, slope: tee.slope, rating: tee.rating, par: cpar }, holes: course.holes, playerIds: sel, games, useHcp, stake, split, opts })}>Tee off</button>
      </div>
    </div>
  );
}

function Round({ round, people, api, onBack, onFinish, onRules }) {
  const [gtab, setGtab] = useState(round.games[0] || null);
  const h = round.hole; const ids = round.playerIds;
  const pc = round.games.includes("punt") ? puntCalc(round) : null;
  const [lastCall, setLastCall] = useState(false);
  const [again, setAgain] = useState(false);
  const cardsHere = !!pc && round.opts.cards && cardHole(h) && !!round.draws[h];
  const showReveal = cardsHere && (!round.seen[h] || again);
  const nextIsCard = !!pc && round.opts.cards && h < 17 && cardHole(h + 1) && !round.draws[h + 1];
  const goNext = () => (nextIsCard ? setLastCall(true) : api.setHole(Math.min(17, h + 1)));
  /* heads-up strips at the top of the hole, for the scorer to read out */
  const notices = [];
  if (pc && round.opts.ntp && PAR[h] === 3) notices.push({ key: "ntp", icon: "flag", isize: 2, title: "Par 3: nearest the pin", text: "Closest ball on the green or fringe earns +3. Pick the winner, then confirm they're on." });
  if (cardsHere) notices.push({ key: "cards", icon: "star", isize: 3, title: `${SI[h] === 1 ? "Hardest" : "Easiest"} hole: cards are out`, text: "Everyone drew a blessing or a curse. Banks from the last hole are locked.", action: ["Show cards", () => setAgain(true)] });
  if (nextIsCard) notices.push({ key: "bank", icon: "c_vault", isize: 2, urgent: true, title: `Next hole is the ${SI[h + 1] === 1 ? "hardest" : "easiest"}: last chance to bank`, text: "Everyone draws a card at the tee, then banks lock. Ask each player now.", action: ["Review banks", () => setLastCall(true)] });
  const bump = (id, d) => {
    const cur = round.scores[id][h];
    const val = cur == null ? PAR[h] : Math.min(12, Math.max(1, cur + d));
    try {
      const nr = { ...round, scores: { ...round.scores, [id]: round.scores[id].map((x, i) => (i === h ? val : x)) } };
      const a = puntCalc(round)[id], b = puntCalc(nr)[id];
      if (b.bustAt[h] && !a.bustAt[h]) SFX.bust();
      else if ((b.multAt[h] || 0) > (a.multAt[h] || 0)) SFX.mult();
      else if (d > 0) SFX.down(); else SFX.up();
    } catch (e) { /* sound is optional */ }
    api.setScore(id, h, val);
  };
  const StepBtn = ({ onClick, label, children }) => (
    <button onClick={onClick} aria-label={label} style={{ width: 36, height: 36, borderRadius: "50%", border: "1.5px solid var(--line)", display: "grid", placeItems: "center", background: "var(--card)", flex: "none" }}>{children}</button>
  );
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <div className="stripes" style={{ padding: "9px 12px 11px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button onClick={onBack} style={{ display: "flex", alignItems: "center", fontWeight: 600, opacity: 0.9 }}><ChevronLeft size={22} />{round.course.name}</button>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={onRules} style={{ fontWeight: 700, background: "rgba(255,255,255,.16)", borderRadius: 999, padding: "5px 11px" }}>Rules</button>
            <button onClick={onFinish} style={{ fontWeight: 700, background: "rgba(255,255,255,.16)", borderRadius: 999, padding: "5px 11px" }}>Finish</button>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 11 }}>
          <button onClick={() => api.setHole(Math.max(0, h - 1))} aria-label="Previous hole" disabled={h === 0} style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,.14)", display: "grid", placeItems: "center", opacity: h === 0 ? 0.35 : 1 }}><ChevronLeft size={26} /></button>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 600 }}>Hole</div>
            <div className="px" style={{ fontSize: 29, lineHeight: 1, margin: "5px 0" }}>{h + 1}</div>
            <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 8 }}>
              <span className="pill" style={{ background: "rgba(255,255,255,.16)", padding: "3px 9px" }}>Par {PAR[h]}</span>
              <span className="pill" style={{ background: "rgba(255,255,255,.16)", padding: "3px 9px" }}>Stroke index {SI[h]}</span>
            </div>
          </div>
          <button onClick={goNext} aria-label="Next hole" disabled={h === 17} style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,.14)", display: "grid", placeItems: "center", opacity: h === 17 ? 0.35 : 1 }}><ChevronRight size={26} /></button>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 11 }}>
          {range18.map(i => (
            <button key={i} onClick={() => (i === h + 1 ? goNext() : api.setHole(i))} aria-label={`Go to hole ${i + 1}`} style={{ width: 17, height: 24, display: "grid", placeItems: "center" }}>
              <span style={{ width: i === h ? 13 : 9, height: i === h ? 13 : 9, borderRadius: "50%", background: holeDone(round, i) ? "var(--flag)" : "rgba(255,255,255,.28)", boxShadow: i === h ? "0 0 0 2px #fff" : "none" }} />
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "9px 12px 75px", display: "grid", gap: 6, alignContent: "start" }}>
        {notices.length > 0 && (
        <div style={{ position: "sticky", top: 0, zIndex: 6, display: "grid", gap: 6, padding: "6px 0", background: "var(--chalk)", borderBottom: "2px solid var(--night)" }}>
        {notices.map(n => (
          <div key={n.key} role="status" style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 8px", border: "3px solid var(--night)", background: n.urgent ? "var(--red)" : "var(--flag)", color: n.urgent ? "#fff" : "var(--dk)" }}>
            <div style={{ flex: "none", width: 28, display: "grid", placeItems: "center" }}><Sprite name={n.icon} size={n.isize} className={n.urgent ? "flick" : ""} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.15 }}>{n.title}</div>
              <div style={{ fontSize: 12, lineHeight: 1.2 }}>{n.text}</div>
            </div>
            {n.action && <button className="chip" onClick={n.action[1]} style={{ flex: "none", padding: "1px 7px", fontSize: 12, color: "var(--ink)" }}>{n.action[0]}</button>}
          </div>
        ))}
        </div>
        )}
        {ids.map(id => {
          const v = round.scores[id][h]; const st = round.useHcp ? strokesOn(round.hcp[id], h) : 0;
          const t = totalsFor(round, id); const n = netOf(round, id, h);
          const bust = pc && pc[id].bustAt[h]; const hot = pc && !bust && v != null && pc[id].mult > 1;
          return (
            <div key={id} className={`card ${bust ? "bust is-bust" : hot ? "hot" : ""}`} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 6px 6px 9px", background: bust ? "var(--red)" : hot ? "var(--flag)" : "var(--card)" }}>
              <Avatar p={people[id]} size={31} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 15 }}>{people[id].name}{round.mode === "2v2" && round.teams && <span className="pill" style={{ background: round.teams[id] ? "var(--mint)" : "var(--flag)", color: "var(--dk)", padding: "0 5px", fontSize: 10, marginLeft: 6 }}>T{round.teams[id] + 1}</span>}</div>
                <div className="cap">
                  {t.thru === 0 ? "Not started" : `${fmtPar(round.useHcp ? t.netPar : t.grossPar)} thru ${t.thru}`}
                  {v != null && round.useHcp && st > 0 ? `, net ${n} here` : ""}
                </div>
                {st > 0 && <span className="pill" style={{ background: "var(--flag)", padding: "2px 7px", fontSize: 11, marginTop: 3 }}>{st === 1 ? "Gets a stroke" : `Gets ${st} strokes`}</span>}
                {bust && <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}><Sprite name="skull" size={3} className="flick" /><span className="px blink" style={{ fontSize: 14 }}>BUST</span></div>}
                {hot && <div style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 3 }}>{Array.from({ length: pc[id].mult }).map((_, k) => <Sprite key={k} name="flame" size={3} className="flick" />)}<span className="px" style={{ fontSize: 14 }}>x{pc[id].mult}</span></div>}
              </div>
              <StepBtn onClick={() => bump(id, -1)} label={`${people[id].name} minus one`}><Minus size={22} /></StepBtn>
              <ScoreMark v={v} par={PAR[h]} />
              <StepBtn onClick={() => bump(id, 1)} label={`${people[id].name} plus one`}><Plus size={22} /></StepBtn>
            </div>
          );
        })}

        {round.games.length > 0 && (
          <div style={{ marginTop: 8 }}>
            {round.games.length > 1 && (
              <div className="scrollx">
                {round.games.map(g => (
                  <button key={g} className={`chip ${gtab === g ? "on" : ""}`} onClick={() => setGtab(g)}>{GAMES.find(x => x.id === g).name}</button>
                ))}
              </div>
            )}
            <div className="card" style={{ padding: 12, marginTop: 9 }}>
              <GamePanel key={gtab} gid={gtab} round={round} people={people} h={h} api={api} />
            </div>
          </div>
        )}
      </div>

      <div style={{ position: "sticky", bottom: 0, marginTop: "auto", padding: "9px 12px 14px", background: "linear-gradient(to top, var(--chalk) 70%, transparent)" }}>
        {h < 17
          ? <button className="cta" onClick={goNext}>Next hole<ChevronRight size={22} /></button>
          : <button className="cta" style={{ background: "var(--flag)", color: "var(--dk)" }} onClick={onFinish}>Finish round</button>}
      </div>
      {showReveal && <CardReveal key={h} round={round} people={people} h={h} onDone={() => { api.markSeen(h); setAgain(false); }} />}
      {lastCall && nextIsCard && (
        <div style={{ position: "fixed", inset: 0, maxWidth: 430, margin: "0 auto", zIndex: 30, display: "flex", alignItems: "flex-end", background: "rgba(0,0,0,.65)" }} onClick={() => setLastCall(false)}>
          <div className="sheet card" role="dialog" aria-label="Last chance to bank" onClick={e => e.stopPropagation()} style={{ width: "100%", padding: 12, boxShadow: "none", maxHeight: "88vh", overflowY: "auto" }}>
            <h2 className="h2">Last chance to bank</h2>
            <p className="cap" style={{ marginTop: 3 }}>{cardHoleLabel(h + 1)} Everyone draws a blessing or a curse at the tee, and banks lock once the cards are out. Read this out, then decide.</p>
            <div style={{ marginTop: 6 }}>
              {ids.map((id, i) => {
                const s = pc[id]; const potBefore = s.potAt[h] != null ? s.potAt[h] : s.pot; const sa = s.streakAt[h] != null ? s.streakAt[h] : s.streak;
                const mult = sa >= 5 ? 3 : sa >= 3 ? 2 : 1; const banking = !!round.bank[id][h];
                return (
                  <div key={id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderTop: i ? "1px solid var(--line)" : "none" }}>
                    <Avatar p={people[id]} size={26} />
                    <div style={{ flex: 1, fontWeight: 700 }}>{people[id].name}</div>
                    {mult > 1 && <span className="pill" style={{ background: "var(--flag)", color: "var(--dk)" }}>x{mult} streak</span>}
                    <div style={{ minWidth: 54, textAlign: "right" }}><span style={{ fontWeight: 800, fontSize: 17 }}>{banking ? s.banked : potBefore}</span><span className="cap">{banking ? " banked" : " in pot"}</span></div>
                    <button className={`chip ${banking ? "on" : ""}`} aria-pressed={banking} disabled={potBefore === 0 && !banking} onClick={() => api.setBank(id, h, !banking)} style={{ minWidth: 62, padding: "2px 6px", fontSize: 12, opacity: potBefore === 0 && !banking ? 0.5 : 1 }}>
                      {banking ? "Banking" : potBefore === 0 ? "Empty" : "Bank it"}
                    </button>
                  </div>
                );
              })}
            </div>
            <p className="cap" style={{ marginTop: 4 }}>Banking resets your streak, unless you hold a Bank vault.</p>
            <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
              <button className="cta" onClick={() => { setLastCall(false); api.setHole(h + 1); }}>Draw the cards</button>
              <button className="chip" style={{ padding: "6px 0", textAlign: "center" }} onClick={() => setLastCall(false)}>Not yet</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Summary({ round, people, onSave, onBack }) {
  const comp = round.playerIds.map(id => ({ id, ...totalsFor(round, id) })).sort((a, b) => (round.useHcp ? a.netPar - b.netPar : a.grossPar - b.grossPar));
  const hasPunt = round.games.includes("punt");
  const pc = puntCalc(round);
  const punt = [...round.playerIds].sort((a, b) => pc[b].total - pc[a].total);
  const isTeam = round.mode === "2v2" && !!round.teams;
  const tr = isTeam ? teamRows(round, pc).sort((x, y) => y.total - x.total) : null;
  const tied = isTeam && tr[0].total === tr[1].total;
  const ranked = isTeam ? [...round.playerIds].sort((x, y) => (round.teams[x] === tr[0].k ? 0 : 1) - (round.teams[y] === tr[0].k ? 0 : 1) || pc[y].total - pc[x].total) : hasPunt ? punt : comp.map(r => r.id);
  const score = Object.fromEntries(round.playerIds.map(id => [id, pc[id].total]));
  const pay = isTeam ? teamPayouts(round, pc) : payouts(round, ranked, score);
  const anyTie = !isTeam && new Set(ranked.map(id => score[id])).size < ranked.length;
  const nets = {}; round.playerIds.forEach(id => (nets[id] = Math.round((pay[id] - round.stake) * 100) / 100));
  const owes = settle(nets);
  const sign = v => (v > 0 ? `+${money(v)}` : v < 0 ? `${MINUS}${money(-v)}` : "$0");

  return (
    <div style={{ flex: 1 }}>
      <div className="stripes" style={{ padding: "14px 12px 22px" }}>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", fontWeight: 600, opacity: 0.9 }}><ChevronLeft size={22} />Back to scoring</button>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -1, marginTop: 9 }}>Round complete</h1>
        <p style={{ opacity: 0.8, marginTop: 3 }}>{round.course.name}</p>
      </div>
      <div style={{ padding: "12px 12px 86px", display: "grid", gap: 11 }}>
        <div className="card" style={{ padding: "5px 11px" }}>
          <div style={{ padding: "9px 0 0" }}>
            <h3 style={{ fontWeight: 800, fontSize: 15 }}>The Comp</h3>
            <p className="cap">Your official scorecard result.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "28px 1fr 56px 56px", gap: 5, padding: "8px 0 3px" }} className="cap">
            <div /><div /><div style={{ textAlign: "right" }}>Gross</div><div style={{ textAlign: "right" }}>Net</div>
          </div>
          {comp.map((r, i) => (
            <div key={r.id} style={{ display: "grid", gridTemplateColumns: "28px 1fr 56px 56px", gap: 5, alignItems: "center", padding: "8px 0", borderTop: "1px solid var(--line)" }}>
              <div style={{ fontWeight: 800, color: i === 0 ? "var(--fair)" : "var(--muted)" }}>{i === 0 ? <Sprite name="crown" size={4} /> : i + 1}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700 }}><Avatar p={people[r.id]} size={26} />{people[r.id].name}</div>
              <div style={{ textAlign: "right", fontWeight: 600 }}>{r.gross}</div>
              <div style={{ textAlign: "right", fontWeight: 800 }}>{round.useHcp ? r.net : r.gross} <span className="cap">{fmtPar(round.useHcp ? r.netPar : r.grossPar)}</span></div>
            </div>
          ))}
        </div>

        {hasPunt && (
          <div className="card" style={{ padding: "5px 11px" }}>
            <div style={{ padding: "9px 0 5px" }}>
              <h3 style={{ fontWeight: 800, fontSize: 15 }}>Puntaro</h3>
              <p className="cap">Everything left in a pot at the 18th is banked automatically.</p>
            </div>
            {isTeam && (
              <div style={{ display: "grid", gap: 6, padding: "4px 0 10px" }}>
                {tr.map((x, i) => (
                  <div key={x.k} className="card" style={{ padding: "8px 10px", display: "flex", alignItems: "center", gap: 8, background: i === 0 && !tied ? "var(--sel)" : "var(--card)", boxShadow: "none" }}>
                    {i === 0 && !tied ? <Sprite name="crown" size={4} /> : <span style={{ width: 28 }} />}
                    <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 800 }}>Team {x.k + 1}</div><div className="cap">{x.ids.map(id => people[id].name).join(" and ")}</div></div>
                    <div style={{ fontWeight: 800, fontSize: 17 }}>{x.total}<span className="cap"> pts</span></div>
                  </div>
                ))}
                {tied && <p className="cap">Dead heat. Every buy-in goes back.</p>}
              </div>
            )}
            {punt.map((id, i) => (
              <div key={id} style={{ display: "grid", gridTemplateColumns: "28px 1fr auto", gap: 5, alignItems: "center", padding: "8px 0", borderTop: "1px solid var(--line)" }}>
                <div style={{ fontWeight: 800, color: i === 0 ? "var(--fair)" : "var(--muted)" }}>{i === 0 ? <Sprite name="crown" size={4} /> : i + 1}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700 }}>
                  <Avatar p={people[id]} size={26} />
                  <div>{people[id].name}<div className="cap" style={{ fontWeight: 400 }}>{tally(pc[id], countEvents(round, id))}</div></div>
                </div>
                <div style={{ fontWeight: 800, fontSize: 15 }}>{pc[id].total}<span className="cap"> pts</span></div>
              </div>
            ))}
          </div>
        )}

        {round.stake > 0 && (
          <div className="card" style={{ padding: 12 }}>
            <h3 style={{ fontWeight: 800, fontSize: 15 }}>Prize pool</h3>
            <p className="cap">{money(round.stake * round.playerIds.length)} pool, paid by {hasPunt ? "Puntaro" : "The Comp"}. {isTeam ? "Winning team splits the pool." : SPLITS.find(s => s[0] === round.split)[1] + "."}{anyTie ? " Tied players share the prize for the places they cover." : ""}</p>
            <div style={{ marginTop: 6 }}>
              {ranked.map((id, i) => (
                <div key={id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderTop: i ? "1px solid var(--line)" : "none" }}>
                  <Avatar p={people[id]} size={22} />
                  <div style={{ flex: 1, fontWeight: 700 }}>{people[id].name}</div>
                  <div style={{ fontWeight: 800, color: nets[id] > 0 ? "var(--fair)" : nets[id] < 0 ? "var(--red)" : "var(--ink)" }}>{sign(nets[id])}</div>
                </div>
              ))}
            </div>
            {owes.length > 0 && (
              <div style={{ marginTop: 8, padding: 9, borderRadius: 12, background: "var(--chalk)" }}>
                <div style={{ fontWeight: 800, marginBottom: 3 }}>Settle up</div>
                {owes.map(([from, to, amt]) => (
                  <div key={from + to} style={{ fontSize: 13, padding: "2px 0" }}>{people[from].name} pays {people[to].name} <b>{money(amt)}</b></div>
                ))}
                <p className="cap" style={{ marginTop: 5 }}>Sort it out between you. The app doesn't handle money.</p>
              </div>
            )}
          </div>
        )}

        {round.games.filter(g => g !== "mystery" && g !== "punt").map(g => (
          <div key={g} className="card" style={{ padding: 12 }}>
            <h3 style={{ fontWeight: 800, fontSize: 15 }}>{GAMES.find(x => x.id === g).name}</h3>
            <div style={{ marginTop: 6 }}>
              {summarize(round, people, g).map(([l, v], i) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", gap: 9, padding: "7px 0", borderTop: i ? "1px solid var(--line)" : "none" }}>
                  <span className="cap" style={{ fontSize: 13 }}>{l}</span><span style={{ fontWeight: 700, textAlign: "right" }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div style={{ position: "sticky", bottom: 0, padding: "9px 12px 14px", background: "linear-gradient(to top, var(--chalk) 70%, transparent)" }}>
        <button className="cta" onClick={onSave}>Save round</button>
      </div>
    </div>
  );
}

function Sheet({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, maxWidth: 430, margin: "0 auto", zIndex: 30, display: "flex", alignItems: "flex-end", background: "rgba(0,0,0,.6)" }} onClick={onClose}>
      <div className="sheet card" role="dialog" aria-label={title} onClick={e => e.stopPropagation()} style={{ width: "100%", padding: 12, boxShadow: "none", maxHeight: "88vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h2 className="h2">{title}</h2>
          <button onClick={onClose} aria-label="Close"><X size={22} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Name plus handicap index. Used for guests in a round and for adding a friend by hand.
function PersonForm({ cta, onSubmit }) {
  const [name, setName] = useState("");
  const [hi, setHi] = useState("18.0");
  const h = Number(hi);
  const err = !name.trim() ? "Enter a name." : hi.trim() === "" || Number.isNaN(h) || h < -10 || h > 54 ? "Handicap index should be between -10 and 54." : "";
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div><div className="cap" style={{ marginBottom: 3 }}>Name</div><input aria-label="Name" value={name} onChange={e => setName(e.target.value)} maxLength={20} style={inp} /></div>
      <div><div className="cap" style={{ marginBottom: 3 }}>Handicap index</div><input aria-label="Handicap index" inputMode="decimal" value={hi} onChange={e => setHi(e.target.value)} style={inp} /></div>
      {err && name.length + hi.length > 0 && <p className="cap" role="alert" style={{ color: "var(--red)", fontWeight: 600 }}>{err}</p>}
      <button className="cta" disabled={!!err} onClick={() => onSubmit({ name: name.trim(), hi: Math.round(h * 10) / 10 })}>{cta}</button>
    </div>
  );
}

function Friends({ people, friendIds, onAddFriend, setFriendIds }) {
  const [metric, setMetric] = useState("avg");
  const [period, setPeriod] = useState("month");
  const [sheet, setSheet] = useState(false);
  const [copied, setCopied] = useState("");
  const m = METRICS.find(x => x.id === metric);
  const val = id => (STATS[id] ? STATS[id][period][metric] : null);
  const rows = ["me", ...friendIds].filter(id => people[id]).map(id => ({ id, v: val(id) })).sort((a, b) => (a.v == null) - (b.v == null) || (m.low ? a.v - b.v : b.v - a.v));
  const vals = rows.filter(r => r.v != null).map(r => r.v); const mx = Math.max(...vals), mn = Math.min(...vals);
  const pct = v => (v == null ? 0 : m.low ? 100 - ((v - mn) / (mx - mn || 1)) * 55 : (v / (mx || 1)) * 100);
  const sample = ["dani", "omar"].filter(id => people[id] && !friendIds.includes(id));
  const copyLink = async () => {
    const url = typeof location !== "undefined" ? location.href.split("#")[0] : "";
    try { await navigator.clipboard.writeText(url); setCopied("Link copied"); } catch (e) { setCopied(url || "Couldn't copy"); }
    setTimeout(() => setCopied(""), 2500);
  };

  return (
    <div style={{ paddingBottom: 19 }}>
      <div className="stripes" style={{ padding: "23px 16px 20px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -1 }}>Friends</h1>
        <button onClick={() => setSheet(true)} style={{ background: "var(--flag)", color: "var(--dk)", borderRadius: 999, padding: "7px 12px", fontWeight: 800, display: "flex", gap: 5, alignItems: "center" }}><UserPlus size={18} />Add</button>
      </div>
      <div style={{ padding: 12 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {[["month", "This month"], ["season", "This season"]].map(([k, l]) => (
            <button key={k} className={`chip ${period === k ? "on" : ""}`} onClick={() => setPeriod(k)} style={{ flex: 1, padding: "5px 0", textAlign: "center" }}>{l}</button>
          ))}
        </div>
        <div className="scrollx" style={{ marginTop: 11 }}>
          {METRICS.map(x => <button key={x.id} className={`chip ${metric === x.id ? "on" : ""}`} onClick={() => setMetric(x.id)}>{x.label}</button>)}
        </div>
        <p className="cap" style={{ margin: "9px 2px" }}>Scores are net, so a 5 handicap and a 20 handicap compete on level ground. These numbers are demo data for now. Friends you add yourself show a dash.</p>
        <div className="card" style={{ padding: "3px 11px" }}>
          {rows.map((r, i) => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 0", borderTop: i ? "1px solid var(--line)" : "none" }}>
              <div style={{ width: 26, display: "grid", placeItems: "center", fontWeight: 800, color: "var(--muted)" }}>
                {i === 0 && r.v != null ? <Sprite name="crown" size={4} /> : i + 1}
              </div>
              <Avatar p={people[r.id]} size={32} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 6 }}>
                  <div style={{ fontWeight: 800, minWidth: 0 }}>{people[r.id].name} <span className="cap" style={{ fontWeight: 400 }}>index {people[r.id].hi.toFixed(1)}</span></div>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>{r.v == null ? "–" : m.fmt(r.v)}</div>
                </div>
                <div style={{ height: 7, background: "var(--track)", marginTop: 5 }}>
                  <div style={{ height: "100%", width: `${pct(r.v)}%`, background: i === 0 ? "var(--fair)" : "var(--lime)" }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {sheet && (
        <Sheet title="Add a friend" onClose={() => setSheet(false)}>
          <PersonForm cta="Add friend" onSubmit={p => { onAddFriend(p); setSheet(false); }} />
          <button onClick={copyLink} className="chip" style={{ width: "100%", marginTop: 10, padding: "8px 0", display: "flex", justifyContent: "center", alignItems: "center", gap: 6 }}>
            <LinkIcon size={16} />{copied || "Copy a link to this app to send a mate"}
          </button>
          {sample.length > 0 && (
            <>
              <div className="cap" style={{ margin: "14px 0 5px", fontWeight: 600 }}>Sample golfers (demo)</div>
              {sample.map(id => (
                <div key={id} style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 0" }}>
                  <Avatar p={people[id]} size={30} />
                  <div style={{ flex: 1 }}><div style={{ fontWeight: 700 }}>{people[id].name}</div><div className="cap">Index {people[id].hi.toFixed(1)}</div></div>
                  <button onClick={() => setFriendIds(f => [...f, id])} className="chip">Add</button>
                </div>
              ))}
            </>
          )}
          <p className="cap" style={{ marginTop: 12 }}>Searching for real golfers and syncing scores between phones needs sign-in. That comes later.</p>
        </Sheet>
      )}
    </div>
  );
}

function Me({ people, setPeople, dark, setDark, saved, onAbout }) {
  const me = people.me;
  const setHi = v => setPeople(p => ({ ...p, me: { ...p.me, hi: Math.round(Math.min(36, Math.max(-2, v)) * 10) / 10 } }));
  const s = STATS.me.season;
  const tiles = [["Rounds", s.rounds], ["Birdies", s.bird], ["Puntaro wins", s.wins], ["Avg net", s.avg.toFixed(1)]];
  return (
    <div style={{ paddingBottom: 19 }}>
      <div className="stripes" style={{ padding: "23px 16px 20px", display: "flex", alignItems: "center", gap: 11 }}>
        <Avatar p={me} size={54} />
        <div><h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.8 }}>You</h1><p style={{ opacity: 0.8 }}>Season stats</p></div>
      </div>
      <div style={{ padding: 12, display: "grid", gap: 11 }}>
        <div className="card" style={{ padding: "8px 11px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 9 }}>
          <div><div style={{ fontWeight: 700, fontSize: 13 }}>Dark mode</div><div className="cap">Easier on the eyes on the course at dusk.</div></div>
          <Toggle on={dark} onChange={setDark} />
        </div>
        <SoundRow />
        <div className="card" style={{ padding: 12 }}>
          <div className="cap" style={{ fontWeight: 600 }}>Handicap index</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 5 }}>
            <button onClick={() => setHi(me.hi - 0.1)} aria-label="Lower handicap" style={{ width: 40, height: 40, borderRadius: "50%", border: "1.5px solid var(--line)", display: "grid", placeItems: "center" }}><Minus size={22} /></button>
            <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: -1.5 }}>{me.hi.toFixed(1)}</div>
            <button onClick={() => setHi(me.hi + 0.1)} aria-label="Raise handicap" style={{ width: 40, height: 40, borderRadius: "50%", border: "1.5px solid var(--line)", display: "grid", placeItems: "center" }}><Plus size={22} /></button>
          </div>
        </div>
        <div className="card" style={{ padding: "11px 12px" }}>
          <h3 style={{ fontWeight: 800, fontSize: 15 }}>Strokes you get on each course</h3>
          <p className="cap" style={{ marginTop: 2 }}>Your index adjusted for slope and rating.</p>
          {[...saved, ...COURSES].flatMap(c => c.tees.map((x, k) => ({ key: c.id + k, name: c.tees.length > 1 ? `${c.name} (${x.name})` : c.name, sample: c.source === "sample", x, par: c.par }))).map((c, i) => (
            <div key={c.key} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderTop: i ? "1px solid var(--line)" : "none", marginTop: i ? 0 : 8 }}>
              <div><div style={{ fontWeight: 700 }}>{c.name}</div><div className="cap">{c.sample ? "Sample. " : ""}Slope {c.x.slope}, rating {c.x.rating}, par {c.par}</div></div>
              <div style={{ fontWeight: 800, fontSize: 17 }}>{courseHcp(me.hi, { slope: c.x.slope, rating: c.x.rating, par: c.par })}</div>
            </div>
          ))}
        </div>
        <button className="chip" onClick={onAbout} style={{ padding: "8px 0", textAlign: "center" }}>About this alpha</button>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {tiles.map(([l, v]) => (
            <div key={l} className="card" style={{ padding: 12 }}>
              <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: -1 }}>{v}</div>
              <div className="cap">{l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ───────────── APP ───────────── */
export default function App() {
  const [people, setPeople] = useState(() => { const s = loadAppState(); return s && s.people ? { ...PEOPLE, ...s.people } : PEOPLE; });
  const [dark, setDark] = useState(true);
  const [friendIds, setFriendIds] = useState(() => { const s = loadAppState(); return s && Array.isArray(s.friendIds) ? s.friendIds : ["sam", "priya", "jake", "maya", "leo"]; });
  const [tab, setTab] = useState("home");
  const [view, setView] = useState("tabs");
  const [round, setRound] = useState(() => {
    const s = loadAppState();
    if (s && "round" in s) { if (s.round) applyHoles(s.round.holes || null); return s.round; }
    return buildRound({ courseId: "pebble", playerIds: ["me", "sam", "priya", "jake"], games: ["punt"], useHcp: true, stake: 10, split: "603010" }, PEOPLE, true);
  });
  const [recent, setRecent] = useState(() => { const s = loadAppState(); return s && Array.isArray(s.recent) ? s.recent : RECENT; });
  const [del, setDel] = useState(null);
  const [rulesFrom, setRulesFrom] = useState("tabs");
  const [saved, setSaved] = useState(loadSaved);
  const [splash, setSplash] = useState(true);
  const [about, setAbout] = useState(false);
  const GUEST_COLORS = ["#9A7B3F", "#5E6E55", "#8B6B4A", "#6F7F73", "#A5543A"];
  const newPerson = ({ name, hi }, guest) => {
    const id = (guest ? "g" : "f") + Date.now() + Math.floor(Math.random() * 99);
    setPeople(p => ({ ...p, [id]: { id, name, hi, guest, color: GUEST_COLORS[Object.keys(p).length % GUEST_COLORS.length] } }));
    return id;
  };
  const addGuest = g => newPerson(g, true);
  const addFriend = f => { const id = newPerson(f, false); setFriendIds(x => [...x, id]); };
  const saveCourse = c => setSaved(s => { const n = [c, ...s.filter(x => x.id !== c.id)]; storeSaved(n); return n; });
  const resetDemo = () => {
    storeSaved([]); setSaved([]); setPeople(PEOPLE); setFriendIds(["sam", "priya", "jake", "maya", "leo"]); setRecent(RECENT); setAbout(false);
    setRound(buildRound({ courseId: "pebble", playerIds: ["me", "sam", "priya", "jake"], games: ["punt"], useHcp: true, stake: 10, split: "603010" }, PEOPLE, true));
    setView("tabs"); setTab("home");
  };
  const [trash, setTrash] = useState(() => { const s = loadAppState(); return s && Array.isArray(s.trash) ? s.trash.filter(x => Date.now() - x.at < TRASH_MS) : []; });
  useEffect(() => { try { localStorage.setItem(STATE_KEY, JSON.stringify({ round, recent, trash, people, friendIds })); } catch (e) { /* private mode: fine */ } }, [round, recent, trash, people, friendIds]);
  const [now, setNow] = useState(Date.now());
  const armed = useRef(false);
  const ready = () => armed.current; // a click only counts after a fresh press on the sheet, so the finger lifting after a hold is ignored
  useEffect(() => {
    if (!trash.length) return undefined;
    const id = setInterval(() => { const n = Date.now(); setNow(n); setTrash(t => { const k = t.filter(x => n - x.at < TRASH_MS); return k.length === t.length ? t : k; }); }, 1000);
    return () => clearInterval(id);
  }, [trash.length]);
  const confirmDelete = () => {
    const at = Date.now();
    if (del.kind === "round") { setTrash(t => [{ id: at, kind: "round", item: round, at }, ...t]); setRound(null); }
    else { const item = recent[del.i]; setTrash(t => [{ id: at, kind: "recent", item, idx: del.i, at }, ...t]); setRecent(r => r.filter((_, j) => j !== del.i)); }
    setNow(at); setDel(null);
  };
  const restore = x => {
    setTrash(t => t.filter(y => y.id !== x.id));
    if (x.kind === "round") {
      if (round) { const at = Date.now(); setTrash(t => [{ id: at, kind: "round", item: round, at }, ...t]); }
      applyHoles(x.item.holes || null); setRound(x.item);
    } else setRecent(r => { const n = r.slice(); n.splice(Math.min(x.idx, n.length), 0, x.item); return n; });
  };

  const api = {
    setScore: (id, h, v) => setRound(r => ({ ...r, scores: { ...r.scores, [id]: r.scores[id].map((x, i) => (i === h ? v : x)) } })),
    setBank: (id, h, v) => { if (v) SFX.bank(); return setRound(r => ({ ...r, bank: { ...r.bank, [id]: r.bank[id].map((x, i) => (i === h ? v : x)) } })); },
    setNtp: (h, id) => setRound(r => ({ ...r, ntp: r.ntp.map((x, i) => (i === h ? (x === id ? null : id) : x)), ntpOk: r.ntpOk.map((x, i) => (i === h ? false : x)) })),
    setNtpOk: h => setRound(r => ({ ...r, ntpOk: r.ntpOk.map((x, i) => (i === h ? !x : x)) })),
    setEvent: (id, h, k) => setRound(r => ({ ...r, events: { ...r.events, [id]: r.events[id].map((x, i) => (i === h ? { ...(x || {}), [k]: !(x && x[k]) } : x)) } })),
    setWolf: (h, v) => setRound(r => ({ ...r, wolf: r.wolf.map((x, i) => (i === h ? v : x)) })),
    setBbb: (h, k, id) => setRound(r => ({ ...r, bbb: r.bbb.map((x, i) => (i === h ? { ...(x || {}), [k]: x && x[k] === id ? null : id } : x)) })),
    markSeen: h => setRound(r => ({ ...r, seen: r.seen.map((x, i) => (i === h ? true : x)) })),
    setHole: h => setRound(r => {
      let draws = r.draws;
      if (r.opts.cards && cardHole(h) && !draws[h]) { draws = draws.slice(); draws[h] = drawCards(r, h, mulberry32(r.drawSeed + h * 977)); }
      return { ...r, hole: h, draws };
    }),
  };

  const board = ["me", ...friendIds].filter(id => STATS[id] && people[id]).map(id => ({ id, v: STATS[id].month.avg })).sort((a, b) => a.v - b.v);

  const save = () => {
    const t = totalsFor(round, "me");
    setRecent(r => [{ course: round.course.name, when: "Today", gross: t.gross, net: round.useHcp ? t.net : t.gross, note: "Puntaro round" }, ...r]);
    setRound(null); setView("tabs"); setTab("home");
  };

  const tabs = [["home", "Home", HomeIcon], ["friends", "Friends", UsersIcon], ["me", "Me", UserIcon]];

  return (
    <div className={`sg${dark ? " dark" : ""}`} onClickCapture={e => { if (e.target.closest && e.target.closest("button")) setTimeout(() => { if (SFX.sinceSpecial() > 60) SFX.tap(); }, 0); }}>
      <style>{CSS}</style>
      {splash && <Splash onDone={() => setSplash(false)} />}
      {about && <AboutSheet onClose={() => setAbout(false)} onReset={resetDemo} />}
      {del && (
        <div style={{ position: "fixed", inset: 0, maxWidth: 430, margin: "0 auto", zIndex: 30, display: "flex", alignItems: "flex-end", background: "rgba(0,0,0,.6)" }} onPointerDown={() => { armed.current = true; }} onClick={() => ready() && setDel(null)}>
          <div className="sheet card" role="dialog" aria-label="Delete round" onClick={e => e.stopPropagation()} style={{ width: "100%", padding: 12, boxShadow: "none" }}>
            <h2 className="h2">Delete this round?</h2>
            <p className="cap" style={{ marginTop: 3 }}>{del.kind === "round" ? `${round.course.name}, in progress` : `${recent[del.i].course}, ${recent[del.i].when}`}. You can restore it from Recently deleted for 5 minutes.</p>
            <div style={{ display: "grid", gap: 6, marginTop: 9 }}>
              <button className="cta" style={{ background: "var(--red)", borderColor: "var(--red)", color: "#fff" }} onClick={() => ready() && confirmDelete()}>Delete round</button>
              <button className="chip" style={{ padding: "6px 0", textAlign: "center" }} onClick={() => ready() && setDel(null)}>Keep it</button>
            </div>
          </div>
        </div>
      )}
      {view === "setup" && <Setup people={people} friendIds={friendIds} saved={saved} onSaveCourse={saveCourse} onAddGuest={addGuest} onBack={() => setView("tabs")} onGo={cfg => { SFX.swing(); setRound(buildRound(cfg, people, false)); setView("round"); }} />}
      {view === "round" && round && <Round round={round} people={people} api={api} onBack={() => { setView("tabs"); setTab("home"); }} onFinish={() => setView("summary")} onRules={() => { setRulesFrom("round"); setView("rules"); }} />}
      {view === "rules" && <Rules onBack={() => setView(rulesFrom)} />}
      {view === "summary" && round && <Summary round={round} people={people} onSave={save} onBack={() => setView("round")} />}
      {view === "tabs" && (
        <>
          <div style={{ flex: 1 }}>
            {tab === "home" && <Home onAbout={() => setAbout(true)} onRules={() => { setRulesFrom("tabs"); setView("rules"); }} askDelete={(kind, i) => { armed.current = false; setDel({ kind, i }); }} trash={trash} now={now} onRestore={restore} dark={dark} setDark={setDark} people={people} round={round} recent={recent} board={board} onStart={() => setView("setup")} onResume={() => setView("round")} goFriends={() => setTab("friends")} />}
            {tab === "friends" && <Friends people={people} friendIds={friendIds} setFriendIds={setFriendIds} onAddFriend={addFriend} />}
            {tab === "me" && <Me people={people} setPeople={setPeople} dark={dark} setDark={setDark} saved={saved} onAbout={() => setAbout(true)} />}
          </div>
          <nav style={{ position: "sticky", bottom: 0, display: "flex", background: "var(--card)", borderTop: "4px solid var(--night)", padding: "6px 9px 11px", gap: 5 }}>
            {tabs.map(([k, l, I]) => (
              <button key={k} onClick={() => setTab(k)} aria-current={tab === k} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "6px 0", borderRadius: 16, background: tab === k ? "var(--sel)" : "transparent", color: tab === k ? "var(--ink)" : "var(--muted)", fontWeight: 700, fontSize: 11 }}>
                <I size={22} />{l}
              </button>
            ))}
          </nav>
        </>
      )}
    </div>
  );
}
