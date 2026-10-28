import { useState, useRef, useEffect, createContext, useContext } from "react";
import { backend, newCode, cleanCode, joinLink, inviteLink, newRefCode, cleanRef, roundToDoc, docToRound, rights, revealUpTo, bankMap, bankKey, DELETE, explain, EMAIL_KEY } from "./live.js";
import { makeDecoder, cameraProblem } from "./scan.js";
import { qrPath } from "./qr.js";
import { differential, indexFrom, nextIndex, hcpTag, USUAL_SCORES, MAX_INDEX, ROUNDS_NEEDED } from "./hcp.js";

/* ───────────── ICONS (inline, no library) ───────────── */
function Ico({ size = 24, color = "currentColor", children }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" aria-hidden="true" style={{ flex: "none" }}>{children}</svg>;
}
function HomeIcon(p) { return <Ico {...p}><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M9 22V12h6v10" /></Ico>; }
function QrIcon(p) { return <Ico {...p}><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><path d="M14 14h3v3h-3zM18 18h3v3h-3zM14 20h2M20 14v2" /></Ico>; }
// The Start a round flag: a pennant waving on its pole, like the splash screen's.
function WaveFlag() {
  return (
    <div className="wflag" aria-hidden="true">
      <div className="wpole" />
      <div className="wcloth">{[0, 1, 2, 3, 4, 5, 6].map(i => <i key={i} style={{ animationDelay: `${i * -0.14}s` }} />)}</div>
      <div className="wgreen" />
    </div>
  );
}
function ClockIcon(p) { return <Ico {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></Ico>; }
function BookIcon(p) { return <Ico {...p}><path d="M4 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4z" /><path d="M20 4h-5a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h6z" /></Ico>; }
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
const APP_VERSION = "0.76";
if (typeof window !== "undefined") window.PUNTARO_VERSION = APP_VERSION; // index.html compares this with the service worker before reloading
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
const PARK_MS = 24 * 60 * 60 * 1000; // paused rounds are kept for a day
// Before accounts, everything was kept on the phone under these keys. Now only read once, to import, then removed.
const STATE_KEY = "puntaro.state.v1";
const loadAppState = () => { try { const s = JSON.parse(localStorage.getItem(STATE_KEY)); return s && typeof s === "object" ? s : null; } catch (e) { return null; } };
const SAVED_KEY = "puntaro.courses.v1";
const loadSaved = () => { try { const v = JSON.parse(localStorage.getItem(SAVED_KEY) || "[]"); return Array.isArray(v) ? v : []; } catch (e) { return []; } };
const START_URL = (() => { try { return location.href; } catch (e) { return ""; } })();
// A join code or invite code from the link that opened the app. Kept until used, because signing in with an
// email link reopens the app on a fresh page without them.
const JOIN_KEY = "puntaro.pendingJoin", REF_KEY = "puntaro.pendingRef";
const stash = (k, v) => { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) { /* fine */ } };
const unstash = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const PENDING_JOIN = (() => {
  try {
    const q = new URLSearchParams(location.search);
    const ref = cleanRef(q.get("ref")); if (ref && !unstash(REF_KEY)) stash(REF_KEY, ref); // the first invite counts
    const j = q.get("join");
    if (q.has("join") || q.has("ref")) window.history.replaceState(null, "", location.pathname);
    if (j != null) { const c = cleanCode(j) || ""; stash(JOIN_KEY, c || null); return c; }
    const kept = unstash(JOIN_KEY); return kept ? kept : null;
  } catch (e) { return null; }
})();
const parseJSON = (t, fallback) => { try { const v = JSON.parse(t); return v == null ? fallback : v; } catch (e) { return fallback; } };
const ME_COLOR = "#4F7A5A";
const PEOPLE = {
  me:    { id: "me", name: "You", first: "", last: "", hi: 14.2, color: "#4F7A5A" },
  sam:   { id: "sam", name: "Nic", last: "Walker", hi: 8.4, color: "#3E7CB1" },
  priya: { id: "priya", name: "Mitch", last: "Nair", hi: 19.0, color: "#A5543A" },
  jake:  { id: "jake", name: "Greg", last: "Morrison", hi: 11.6, color: "#6F7F73" },
  maya:  { id: "maya", name: "Maya", last: "Chen", hi: 5.2, color: "#9A7650" },
  leo:   { id: "leo", name: "Leo", last: "Costa", hi: 23.5, color: "#5E4636" },
  dani:  { id: "dani", name: "Dani", last: "Ferris", hi: 13.1, color: "#3F5F4B" },
  omar:  { id: "omar", name: "Omar", last: "Haddad", hi: 21.8, color: "#7A7A72" },
};
// Real totals come from saved rounds: history = [{ at, players: { id: { pts, ntp, win } } }]
const statsFor = (history, id, period) => {
  const d0 = new Date(); const start = period === "all" ? 0 : period === "month" ? new Date(d0.getFullYear(), d0.getMonth(), 1).getTime() : new Date(d0.getFullYear(), 0, 1).getTime();
  const rs = (history || []).filter(x => x.at >= start && x.players && x.players[id]);
  if (!rs.length) return null;
  const sum = k => rs.reduce((a, x) => a + (x.players[id][k] || 0), 0);
  return { rounds: rs.length, wins: rs.reduce((a, x) => a + (x.players[id].win ? 1 : 0), 0), ntp: sum("ntp"), pts: sum("pts") / rs.length };
};
const METRICS = [
  { id: "rounds", label: "Rounds", fmt: v => v },
  { id: "wins", label: "Wins", fmt: v => v },
  { id: "ntp", label: "NTPs", fmt: v => v },
  { id: "pts", label: "Avg pts", fmt: v => v.toFixed(1) },
];
const GAMES = [
  { id: "punt", name: "Puntaro", blurb: "Bank it or bust it. Net scores, so every handicap has a shot.", hero: true },
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
// A sandy is already an up and down from the sand, and a chip-in has no putt, so these can't stack.
const CLASH = { sandy: ["updown"], updown: ["sandy", "chipin"], chipin: ["updown"] };
const EV_ART = { sandy: "e_sandy", updown: "e_updown", chipin: "e_chipin", barkie: "e_barkie", lost: "e_lost", water: "e_water", fourputt: "e_four" };
const EV_FX = { sandy: "hole points double", updown: "+2 to the pot", chipin: "+4 to the pot", barkie: "+2 to the pot", lost: "−3 from the pot", water: "−2 from the pot", fourputt: "pot cut in half" };
const EVENTS = {
  sandy:    { kind: "bonus",   name: "Sandy",       tag: "Sandy x2",        hint: "Up and down from a bunker. This hole's points count double. Replaces up and down." },
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
const PAL = { o: "#14150F", w: "#EDE8DD", g: "#D9B07A", r: "#B4472E", l: "#8FAE8B", d: "#3E6B4B", m: "#CFC9B8", n: "#7A5232", c: "#4A4D45", s: "#E6D3AE", b: "#4F7FA3", t: "#9CC3DB" };
const SPRITES = {
  c_back: ["..oooooooooo....", "..owrrrrrrroo...", "..owrrrrrrrro...", "..owrrooorrro...", "..owrrooorrro...", "..owrrrrrrrro...", "..owrrrrrrroo...", "..owoooooooo....", "..owo...........", "..owo...........", "..owo...........", "..owo...........", "..owo...........", "ooowoooooooooooo", "ollloolllllllllo", "oddddddddddddddo", "oooooooooooooooo"],
  e_sandy: ["...oooo...", "..owwwwo..", "..owmwwo..", "...oooo...", "..oossoo..", ".osssssso.", "ossmssssso", "osssssssso", "oooooooooo", ".........."],
  e_updown: [".w........", ".wrr......", ".wrrr.....", ".wrr......", ".w........", ".w...oo...", ".w..owwo..", "lllllllll.", "dddoooddd.", "dddddddddd"],
  e_chipin: ["g...gg...g", ".g..gg..g.", "..g.oo.g..", "...owwwo..", "...owmwo..", "....oo....", "llllllllll", "ddddoooddd", "dddddddddd", "dddddddddd"],
  e_barkie: ["..dddd....", ".dllddd...", "dddlldddd.", ".dddddddd.", "..dddddd..", "....nn....", "....nn.oo.", "....nnowwo", "....nn.oo.", "lllnnnllll"],
  e_lost: ["...oooo...", "..owwwwo..", ".owrrrwwo.", ".owwwrwwo.", ".owwrrwwo.", ".owwwwwwo.", ".owwrwwwo.", "..owwwwo..", "...oooo...", ".........."],
  e_water: ["..t..t....", ".t..oo..t.", "...owwo...", "....oo....", "..........", "bbtbbbtbbb", "bbbbbbbbbb", "tbbbtbbbtb", "bbbbbbbbbb", "bbbbbbbbbb"],
  e_four: ["....rr....", "...rrr....", "..rrrr....", ".rr.rr....", "rr..rr....", "rrrrrrrrr.", "....rr....", "....rr....", "....rr....", ".........."],
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
    bank: mk(a => { tone(a, 988, 0, 0.07, { vol: 0.06 }); tone(a, 1319, 0.07, 0.38, { vol: 0.05 }); tone(a, 1976, 0.07, 0.2, { type: "triangle", vol: 0.03, det: 0 }); noise(a, 0.07, 0.08, { from: 7000, to: 5000, vol: 0.04 }); }),
    bust: mk(a => { noise(a, 0, 0.42, { from: 1300, to: 120, vol: 0.14 }); tone(a, 220, 0, 0.6, { type: "sawtooth", to: 45, vol: 0.07 }); [[392, 0.65], [370, 0.9], [349, 1.15]].forEach(([f, t]) => tone(a, f, t, 0.22, { type: "triangle", vol: 0.11 })); tone(a, 330, 1.4, 0.7, { type: "triangle", to: 247, vol: 0.11 }); }),
    mult: mk(a => { noise(a, 0, 0.55, { from: 300, to: 4500, vol: 0.1 }); [392, 523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(a, f, 0.12 + i * 0.05, 0.08, { vol: 0.055 })); for (let i = 0; i < 8; i++) noise(a, 0.55 + Math.random() * 0.5, 0.025, { from: 5000, to: 3000, vol: 0.06 }); tone(a, 1568, 0.5, 0.45, { type: "triangle", vol: 0.06 }); }),
    ntp: mk(a => { tone(a, 140, 0, 0.12, { type: "sine", to: 70, vol: 0.18, det: 0 }); tone(a, 1568, 0.1, 0.35, { type: "triangle", vol: 0.08 }); tone(a, 2093, 0.18, 0.3, { type: "triangle", vol: 0.05 }); }),
    birdie: mk(a => { tone(a, 2000, 0, 0.06, { to: 2700, vol: 0.05 }); tone(a, 2100, 0.09, 0.06, { to: 2900, vol: 0.05 }); [1047, 1319, 1568].forEach((f, i) => tone(a, f, 0.22 + i * 0.07, 0.11, { type: "triangle", vol: 0.1 })); [2093, 2349, 2093, 2349, 2637].forEach((f, i) => tone(a, f, 0.46 + i * 0.05, 0.05, { vol: 0.035, det: 0 })); }),
    eagle: mk(a => { tone(a, 900, 0, 0.28, { type: "sawtooth", to: 2300, vol: 0.05 }); tone(a, 2300, 0.28, 0.18, { type: "sawtooth", to: 1500, vol: 0.04 }); noise(a, 0.2, 0.35, { from: 400, to: 3500, vol: 0.08 }); [[523, 0.6, 0.12], [659, 0.72, 0.12], [784, 0.84, 0.12], [1047, 0.96, 0.55]].forEach(([f, t, d]) => tone(a, f, t, d, { vol: 0.06 })); tone(a, 523, 0.96, 0.55, { type: "triangle", vol: 0.08, det: 0 }); tone(a, 784, 0.96, 0.55, { type: "triangle", vol: 0.06, det: 0 }); }),
    ace: mk(a => { for (let i = 0; i < 6; i++) noise(a, i * 0.11, 0.03, { from: 2400, to: 1800, vol: 0.04 }); tone(a, 200, 0.72, 0.16, { type: "sine", to: 80, vol: 0.18, det: 0 }); [0.86, 0.92, 0.97].forEach((t, i) => tone(a, 1760 - i * 140, t, 0.05, { type: "triangle", vol: 0.05, det: 0 })); [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(a, f, 1.15 + i * 0.1, 0.11, { vol: 0.06 })); [1568, 1047, 784].forEach(f => tone(a, f, 1.88, 0.8, { type: "triangle", vol: 0.07 })); [2637, 3136, 2637, 3520].forEach((f, i) => tone(a, f, 1.95 + i * 0.12, 0.06, { vol: 0.025, det: 0 })); }),
    event: k => mk(a => {
      const ding = (at = 0, f = 1319) => { tone(a, f * 0.75, at, 0.07); tone(a, f, at + 0.07, 0.3, { vol: 0.055 }); };
      if (k === "sandy") { noise(a, 0, 0.16, { vol: 0.1, from: 900, to: 400 }); ding(0.14, 1175); }
      else if (k === "updown") { [659, 880, 1175].forEach((f, i) => tone(a, f, i * 0.07, 0.12, { type: "triangle", vol: 0.09 })); ding(0.22, 1568); }
      else if (k === "chipin") { run(a, [523, 659, 784, 1047, 1319], 0.055, { vol: 0.06 }); noise(a, 0.3, 0.2, { vol: 0.05, from: 4000, to: 1500 }); ding(0.3, 1568); }
      else if (k === "barkie") { tone(a, 160, 0, 0.07, { type: "square", vol: 0.1, det: 0 }); tone(a, 140, 0.1, 0.07, { type: "square", vol: 0.1, det: 0 }); ding(0.24, 988); }
      else if (k === "lost") { tone(a, 1100, 0, 0.55, { type: "sine", vol: 0.1, to: 180, det: 0 }); tone(a, 140, 0.5, 0.2, { type: "sawtooth", vol: 0.05 }); }
      else if (k === "water") { noise(a, 0, 0.25, { vol: 0.12, from: 2500, to: 500 }); tone(a, 300, 0.2, 0.18, { type: "sine", vol: 0.1, to: 700, det: 0 }); tone(a, 250, 0.38, 0.14, { type: "sine", vol: 0.08, to: 600, det: 0 }); }
      else if (k === "fourputt") { [0, 0.12, 0.24, 0.36].forEach(s => tone(a, 110, s, 0.08, { type: "square", vol: 0.1, det: 0, to: 70 })); [330, 262, 196].forEach((f, i) => tone(a, f, 0.55 + i * 0.12, 0.14, { type: "sawtooth", vol: 0.05 })); }
    })(),
    putt: () => { const a = ac(); if (!a) return; tone(a, 1568, 0, 0.04, { type: "triangle", vol: 0.05, det: 0 }); for (let i = 0; i < 6; i++) noise(a, 0.05 + i * 0.16, 0.05, { vol: 0.03, from: 2400, to: 1800 }); },
    cup: () => { const a = ac(); if (!a) return; tone(a, 180, 0, 0.12, { type: "sine", vol: 0.16, to: 90, det: 0 }); [0.1, 0.17, 0.22].forEach((t, i) => tone(a, 1760 - i * 120, t, 0.06, { type: "triangle", vol: 0.05, det: 0 })); tone(a, 1319, 0.3, 0.35, { type: "triangle", vol: 0.05 }); },
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

/* Haptics: short buzzes for the moments that matter. Android phones vibrate in patterns; iPhones (iOS 18+)
   only allow a single light tap, made by flicking a hidden switch, and only straight from a tap. */
const HAPTIC = (() => {
  let on = true;
  try { on = localStorage.getItem("puntaro.haptics") !== "off"; } catch (e) { /* default on */ }
  let sw = null;
  const ios = () => typeof navigator !== "undefined" && /iP(hone|ad|od)/.test(navigator.userAgent || "") && !navigator.vibrate;
  const iosTap = () => {
    try {
      if (!sw) {
        const lab = document.createElement("label"); const inp = document.createElement("input");
        inp.type = "checkbox"; inp.setAttribute("switch", ""); inp.tabIndex = -1; lab.appendChild(inp);
        // Kept inside the screen (1px, invisible): an off-screen element made iPhones scroll to it.
        lab.setAttribute("aria-hidden", "true"); lab.style.cssText = "position:fixed;left:0;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;z-index:-1";
        document.body.appendChild(lab); sw = lab;
      }
      // Clicking the label focuses the switch, which made iPhones pop up the form toolbar and push sheets around.
      // Hand focus straight back without scrolling.
      const prev = document.activeElement; const x = window.scrollX, y = window.scrollY;
      sw.click();
      const inp = sw.firstChild; if (document.activeElement === inp) inp.blur();
      if (prev && prev !== document.body && prev.focus) { try { prev.focus({ preventScroll: true }); } catch (e) { /* fine */ } }
      if (window.scrollX !== x || window.scrollY !== y) window.scrollTo(x, y);
    } catch (e) { /* no haptics */ }
  };
  const buzz = p => {
    if (!on) return;
    try { if (navigator.vibrate) navigator.vibrate(p); else if (ios()) iosTap(); } catch (e) { /* no haptics */ }
  };
  return { buzz, isOn: () => on, supported: () => typeof navigator !== "undefined" && (!!navigator.vibrate || ios()),
    set: v => { on = v; try { localStorage.setItem("puntaro.haptics", v ? "on" : "off"); } catch (e) { /* fine */ } if (v) buzz(20); } };
})();
// Which sounds also buzz, and how (milliseconds on, off, on...).
const BUZZ = { up: 10, down: 18, bank: [25, 50, 35], bust: [70, 40, 140], mult: [12, 35, 12, 35, 12], ntp: [15, 40, 15, 40, 45], birdie: [15, 35, 15, 35, 60], eagle: [20, 40, 20, 40, 90], ace: [30, 40, 30, 40, 30, 40, 160],
  flip: 15, bless: [12, 40, 30], curse: 90, swing: 25, start: [20, 60, 40] };
Object.keys(BUZZ).forEach(k => { const f = SFX[k]; SFX[k] = (...a) => { HAPTIC.buzz(BUZZ[k]); return f(...a); }; });
{ const ev = SFX.event; SFX.event = k => { HAPTIC.buzz(k === "lost" || k === "water" || k === "fourputt" ? [50, 40, 50] : [15, 40, 25]); return ev(k); }; }

function HapticRow() {
  const [on, setOn] = useState(HAPTIC.isOn());
  return (
    <div className="card" style={{ padding: "8px 11px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 9 }}>
      <div><div style={{ fontWeight: 700, fontSize: 13 }}>Vibration</div><div className="cap">{HAPTIC.supported() === false ? "This phone or browser doesn't support vibration." : "A buzz for banks, busts, birdies, cards and moving holes. iPhones only do a single light tap."}</div></div>
      <Toggle on={on} onChange={v => { HAPTIC.set(v); setOn(v); }} />
    </div>
  );
}

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
// Leaderboard tiles: the everyday logo. Hung like a clubhouse scoreboard.
let tilesHung = false; // hang them in once per app launch, then keep them still
function Tiles({ size = 20, hang = false, toy = false }) {
  const [anim] = useState(() => hang && !tilesHung);
  const [flip, setFlip] = useState({});
  useEffect(() => { if (hang) tilesHung = true; }, [hang]);
  const tap = (i, e) => { e.stopPropagation(); setFlip(f => ({ ...f, [i]: (f[i] || 0) + 1 })); SFX.tap(); };
  return (
    <span className={`tiles${anim ? " hang" : ""}${toy ? " toy" : ""}`} style={{ "--ts": `${size}px` }} role="img" aria-label={APP_NAME}>
      {[..."PUNTARO"].map((c, i) => (
        <span key={`${i}-${flip[i] || 0}`} aria-hidden="true" className={flip[i] ? "tflip" : ""} onClick={toy ? e => tap(i, e) : undefined} style={{ animationDelay: `${i * 0.08}s` }}>{c}</span>
      ))}
    </span>
  );
}

// Splash hero: the flagstick rises out of the cup, the pennant unrolls in the wind,
// then a ball putts along the line and drops in. Times in seconds.
const PN_SLICES = 8; // 8 strips x 20px = a 160px pennant
function Pennant() {
  return (
    <div className="pn" aria-hidden="true">
      <div className="pn-flag">
        {Array.from({ length: PN_SLICES }, (_, i) => {
          const fromPole = PN_SLICES - 1 - i;
          return (
            <div key={i} className="pn-sl" style={{ animationDelay: `${0.4 + fromPole * 0.09}s` }}>
              <div className="pn-wv" style={{ animationDelay: `${1.3 + fromPole * 0.1}s` }}>
                <div style={{ left: -i * 20 }}>{APP_NAME.toUpperCase()}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="pn-pole" />
      <div className="pn-green"><div className="pn-dots" /><div className="pn-turf" /><div className="pn-cup" /><div className="pn-spark" /><div className="pn-ball" /></div>
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
  // The full show plays every launch; a tap skips it.
  useEffect(() => {
    if (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const t = [setTimeout(() => SFX.putt(), 1550), setTimeout(() => SFX.cup(), 2700)];
    return () => t.forEach(clearTimeout);
  }, []);
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
        <Pennant />
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
// The cards the shuffle could deal each player on hole h: the seed fixes the order, the catch-up odds only decide blessing vs curse.
function dealOk(seed, h, ids, deal) {
  const rng = mulberry32(seed + h * 977);
  return ids.every(id => {
    const a = rng(), b = rng();
    const ok = []; if (a < 0.7) ok.push(BLESSINGS[Math.floor(b * BLESSINGS.length)]); if (a >= 0.3) ok.push(CURSES[Math.floor(b * CURSES.length)]);
    return ok.includes(deal[id]);
  });
}
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
    log: [], bustAt: [], multAt: [], evAt: [], potAt: [], potStart: [], streakAt: [] }));
  for (let h = 0; h < upTo; h++) {
    const gifts = {}; ids.forEach(id => (gifts[id] = 0));
    const played = [];
    ids.forEach(id => {
      const st = S[id];
      if (!st.alive) return;
      if (r.scores[id][h] == null) {
        // A hole left blank with later holes scored: count it as no score (no points, streak broken) and keep going,
        // so a gap can't freeze someone's game (and stop them busting) for the rest of the round.
        let later = false; for (let k = h + 1; k < 18; k++) if (r.scores[id][k] != null) { later = true; break; }
        if (!later) { st.alive = false; return; }
        st.streak = 0; st.log[h] = "No score entered: no points, streak reset";
        if (r.bank[id][h] && st.pot > 0) { st.banked += st.pot; st.pot = 0; st.log[h] += `, banked`; }
        st.potAt[h] = st.pot; st.streakAt[h] = 0; st.gapAt = st.gapAt || []; st.gapAt.push(h);
        return;
      }
      played.push(id);
      st.potStart[h] = st.pot; // what was in the pot coming into this hole
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
        // A Safety net is only used up when there's a pot to save; a bust on an empty pot keeps it for later.
        if (st.shields > 0 && st.pot > 0) { st.shields--; st.log[h] = note + "Safety net saved the pot"; }
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
          if (evs.updown && !evs.sandy && !evs.chipin && diff <= 0) flat += 2;
          if (evs.barkie && diff <= 0) flat += 2;
          if (evs.chipin) flat += 4;
        }
        if (r.opts.ntp && PAR[h] === 3 && r.ntp[h] === id) flat += 3;
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
      busts: st.busts, log: st.log, bustAt: st.bustAt, multAt: st.multAt, evAt: st.evAt, potAt: st.potAt, potStart: st.potStart, streakAt: st.streakAt };
  });
  return out;
}

function countEvents(r, id) {
  let b = 0, p = 0;
  (r.events[id] || []).forEach(e => {
    if (!e) return;
    Object.keys(e).forEach(k => { if (e[k]) { if (EVENTS[k].kind === "bonus") b++; else p++; } });
  });
  const ntpWins = r.opts.ntp ? r.ntp.filter((w, h) => w === id && PAR[h] === 3).length : 0;
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
    wolf: Array(18).fill(null), bbb: Array(18).fill(null), hole: 0, sample: !!seed,
  };
  if (seed) {
    const off = { me: [0, 1, 0, -1, 1, 0], sam: [0, 0, 1, 0, 0, 1], priya: [1, 1, 0, 1, 2, 0], jake: [1, 0, 0, 0, 1, -1] };
    Object.keys(off).forEach(id => off[id].forEach((o, h) => (r.scores[id][h] = PAR[h] + o)));
    r.wolf = ["sam", "lone", "jake", "lone", "priya", "jake", ...Array(12).fill(null)];
    const B = (a, b, c) => ({ bingo: a, bango: b, bongo: c });
    r.bbb = [B("sam", "me", "sam"), B("me", "me", "jake"), B("priya", "priya", "priya"), B("jake", "sam", "me"), B("sam", "me", "priya"), B("jake", "jake", "jake"), ...Array(12).fill(null)];
    r.bank.sam[2] = true; r.bank.jake[4] = true;
    r.events.me[3] = { chipin: true }; r.events.sam[0] = { sandy: true }; r.events.priya[4] = { lost: true }; r.events.jake[1] = { water: true };
    r.ntp[2] = "me";
    r.hole = 6; r.seen[3] = true;
  }
  if (r.opts.cards) range18.forEach(h => { if (cardHole(h) && h <= r.hole) r.draws[h] = drawCards(r, h, mulberry32(r.drawSeed + h * 977)); });
  return r;
}

/* ───────────── SMALL PARTS ───────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@400;500;600;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Silkscreen:wght@400;700&family=Jersey+15&family=Figtree:wght@400;500;600;700;800&family=Bitter:wght@600;700&display=swap');
.sg{--ink:#1B1C1A;--muted:#55524A;--chalk:#F1EADB;--card:#FBF6EA;--sel:#D3DACB;--night:#1B1C1A;--dk:#1B1C1A;--pine:#2F4A3A;--mint:#A9BFA3;--fair:#3E6B4B;--lime:#D9BE8E;--flag:#C69C6D;--red:#B84A32;--bogey:#B84A32;--line:#C9C0A8;--track:#E7E2D5;--water:#8B6B4A;--head1:#2F4A3A;--head2:#294133;--grid:rgba(36,38,34,.05);--on-bg:#2A2C28;--on-fg:#F4F0E6;--hi:#F1ECDF;}
.sg.dark{--ink:#EDE8DD;--muted:#B3AEA2;--chalk:#1B1C1A;--card:#252724;--sel:#2C4033;--night:#454841;--pine:#4F7A5A;--fair:#7FA886;--lime:#E0C799;--red:#CC5A3E;--bogey:#CC5A3E;--line:#383A35;--track:#1B1C1A;--head1:#2C4536;--head2:#27402F;--grid:rgba(232,227,214,.03);--on-bg:#C69C6D;--on-fg:#1B1C1A;}
.sg{font-family:'Figtree',system-ui,-apple-system,sans-serif;font-weight:500;font-size:13px;line-height:1.28;letter-spacing:0;color:var(--ink);background-color:var(--chalk);
 background-image:linear-gradient(var(--grid) 1px,transparent 1px),linear-gradient(90deg,var(--grid) 1px,transparent 1px);background-size:8px 8px;
 font-variant-numeric:tabular-nums;max-width:430px;margin:0 auto;min-height:100vh;position:relative;display:flex;flex-direction:column;}
.sg *{box-sizing:border-box;border-radius:0 !important;}
.sg *{font-synthesis:none;}
.sg h1,.sg h2,.sg h3,.sg p{margin:0;}
.sg h1,.sg h2,.sg h3,.sg .hd{font-family:'Bitter',Georgia,serif;font-weight:700 !important;letter-spacing:0 !important;}
.sg h1,.sg h2,.sg h3,.sg .px,.sg .cta{font-weight:700 !important;letter-spacing:0 !important;}
.sg .px{font-family:'Jersey 15','Pixelify Sans',ui-monospace,monospace;font-weight:400 !important;letter-spacing:.02em !important;}
.sg h1{font-size:20px !important;line-height:1.15 !important;}
.sg h2,.sg .h2{font-size:15px !important;line-height:1.2 !important;}
.sg h3{font-size:13px !important;line-height:1.2 !important;}
.sg button{font:inherit;color:inherit;cursor:pointer;border:0;background:none;padding:0;-webkit-tap-highlight-color:transparent;}
.sg button:focus-visible{outline:3px solid var(--water);outline-offset:2px;}
.sg svg{shape-rendering:crispEdges;}
.sg svg *{stroke-linecap:square;stroke-linejoin:miter;}
.stripes{background:repeating-linear-gradient(90deg,var(--head1) 0 32px,var(--head2) 32px 64px);border-bottom:4px solid var(--night);color:var(--hi);}
.card{background:var(--card);border:3px solid var(--night);box-shadow:3px 3px 0 var(--night);}
.sg .pill{display:inline-flex;align-items:center;gap:5px;padding:1px 6px;font-weight:600;font-size:11.5px;color:var(--dk);border:2px solid var(--night);}
.sg .stripes .pill{color:var(--hi);}
.sg .chip{border:2px solid var(--night);background:var(--card);color:var(--ink);padding:4px 8px;font-weight:600;font-size:12.5px;white-space:nowrap;box-shadow:2px 2px 0 var(--night);}
.sg .chip.on{background:var(--on-bg);border-color:var(--on-bg);color:var(--on-fg);box-shadow:none;transform:translate(2px,2px);}
.sg .cta{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:44px;padding:9px;font-size:15px !important;background:var(--pine);color:#F4F0E6;border:3px solid var(--night);box-shadow:0 4px 0 var(--night);}
.sg.dark .cta{background:var(--on-bg);color:var(--on-fg);}
.sg .cta:active{transform:translateY(5px);box-shadow:none;}
.sg .cta:disabled{opacity:.4;cursor:not-allowed;}
.cap{font-size:12px;color:var(--muted);line-height:1.28;}
.sg .chip:disabled{opacity:.45;cursor:not-allowed;}
.sg fieldset:disabled button{opacity:.4;cursor:not-allowed;}
.seg{display:flex;flex-wrap:wrap;gap:6px;}
.sg .seg .chip{flex:1 1 auto;text-align:center;padding:6px 8px;}
.sg .pt-foot{display:flex;flex-direction:column;align-items:center;gap:7px;margin:22px auto 0;color:var(--muted);}
.sg .pt-foot:hover{color:var(--ink);}
.score-empty{display:grid;place-items:center;width:36px;height:36px;border:2px dashed var(--line);color:var(--muted);line-height:1;}
.score-empty b{font-size:15px;}
.score-empty small{font-size:8px;letter-spacing:.08em;margin-top:-6px;}
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
.splash .tag{display:flex;align-items:center;gap:10px;color:#D9B07A;font-size:12px;letter-spacing:.28em;font-weight:600;animation:tagin .5s steps(4) 3s both;}
.splash .tag i{display:block;width:34px;height:2px;background:#D9B07A;}
@keyframes tagin{from{opacity:0}to{opacity:1}}
.splash .tapgo{position:absolute;bottom:calc(64px + env(safe-area-inset-bottom,0px));color:#EDE8DD;font-weight:700;font-size:15px;letter-spacing:.2em;animation:tagin .01s 3.3s both,blink 1s steps(2) 3.35s infinite;text-shadow:2px 2px 0 #14150F;}
.tiles{display:inline-flex;gap:2px;padding:3px;background:#14150F;box-shadow:3px 3px 0 rgba(0,0,0,.45);font-family:'Pixelify Sans',ui-monospace,monospace;font-weight:700;line-height:1;vertical-align:middle;}
.tiles>span{width:var(--ts);height:calc(var(--ts)*1.3);display:grid;place-items:center;background:#EDE8DD;color:#2C4536;font-size:calc(var(--ts)*.86);box-shadow:inset 0 calc(var(--ts)*-.1) 0 #CFC9B8;transform-origin:top;}
.tiles.toy>span{cursor:pointer;}
.tiles.hang>span{animation:thang .36s steps(4) both;}
@keyframes thang{0%{transform:translateY(-14px) rotate(-12deg);opacity:0}60%{transform:translateY(2px) rotate(5deg);opacity:1}100%{transform:none}}
.tiles>span.tflip{animation:tflip .3s steps(3) !important;animation-delay:0s !important;}
@keyframes tflip{50%{transform:scaleY(0)}}
.pn{position:relative;width:202px;height:144px;font-family:'Pixelify Sans',ui-monospace,monospace;font-weight:700;}
.pn-pole{position:absolute;left:174px;top:8px;width:6px;height:116px;background:#EDE8DD;box-shadow:3px 0 0 #000;transform-origin:50% 100%;animation:pnrise .4s steps(6) backwards,pnrattle .4s steps(4) 2.75s;}
.pn-pole:before{content:"";position:absolute;top:-8px;left:-2px;width:10px;height:8px;background:#D9B07A;}
.pn-flag{position:absolute;left:8px;top:10px;display:flex;filter:drop-shadow(3px 3px 0 rgba(0,0,0,.5));}
.pn-sl{width:20px;height:52px;overflow:hidden;transform-origin:right;animation:pnunroll .15s steps(3) backwards;}
.pn-sl:first-child{clip-path:polygon(0 0,100% 0,100% 100%,0 100%,55% 50%);}
.pn-wv{width:20px;height:52px;position:relative;animation:pnwave 1.1s steps(4) infinite;}
.pn-wv>div{position:absolute;top:0;width:160px;height:52px;padding:0 4px 4px 15px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;background:#B84A32;color:#EDE8DD;font-size:34px;line-height:1;letter-spacing:-1px;white-space:nowrap;box-shadow:inset 0 -4px 0 #8E3826;
 text-shadow:1px 1px 0 #D9B07A,2px 2px 0 #D9B07A,3px 3px 0 #6E2516,4px 4px 0 #6E2516,5px 5px 0 #6E2516;}
.pn-green{position:absolute;left:0;right:0;top:122px;height:12px;}
.pn-dots{position:absolute;left:8px;width:151px;top:4px;height:5px;background:repeating-linear-gradient(90deg,#3E6B4B 0 6px,transparent 6px 12px);}
.pn-turf{position:absolute;left:0;right:0;top:12px;height:6px;background:#2C4536;border-top:3px solid #3E6B4B;}
.pn-cup{position:absolute;left:163px;top:1px;width:28px;height:11px;background:#000;box-shadow:0 -3px 0 #3E6B4B;}
.pn-ball{position:absolute;left:8px;top:-2px;width:10px;height:10px;background:#EDE8DD;box-shadow:2px 2px 0 #000;animation:pnputt 1s steps(14) 1.55s both,pndrop .22s steps(2) 2.55s both;}
.pn-spark{position:absolute;left:158px;top:-14px;width:38px;height:20px;opacity:0;background:radial-gradient(#D9B07A 2px,transparent 2.5px) 0 0/10px 10px;animation:pnspark .5s steps(3) 2.75s both;}
@keyframes pnrise{from{transform:scaleY(0)}}
@keyframes pnrattle{25%{transform:rotate(-3deg)}75%{transform:rotate(3deg)}}
@keyframes pnunroll{from{transform:scaleX(0);filter:brightness(.45)}to{transform:scaleX(1);filter:brightness(1)}}
@keyframes pnwave{0%,100%{transform:translateY(0)}25%{transform:translateY(-3px)}75%{transform:translateY(3px)}}
@keyframes pnputt{from{left:8px}to{left:172px}}
@keyframes pndrop{to{top:8px;height:0;opacity:0}}
@keyframes pnspark{0%{opacity:0;transform:translateY(6px)}40%{opacity:1}100%{opacity:0;transform:translateY(-8px)}}
@keyframes blink{0%{opacity:1}50%{opacity:.25}}
.splash .ver{position:absolute;bottom:calc(24px + env(safe-area-inset-bottom,0px));color:#9B968A;font-size:11px;letter-spacing:.2em;}
@media (prefers-reduced-motion:reduce){.splash .mark,.splash .tapgo,.splash .tag,.tiles>span,.pn *{animation:none !important}.pn-ball,.pn-spark{display:none}}

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
.pcard::before{content:"";position:absolute;inset:calc(var(--cw)*.04);z-index:-1;pointer-events:none;}
.pcard.bless::before{box-shadow:0 0 calc(var(--cw)*.22) calc(var(--cw)*.03) rgba(233,196,120,.55);animation:glowb 2.4s steps(6) infinite;}
.pcard.curse::before{box-shadow:0 0 calc(var(--cw)*.22) calc(var(--cw)*.03) rgba(184,74,50,.5);animation:glowc 1.8s steps(5) infinite;}
.pcard.down::before{box-shadow:none;animation:none;}
@keyframes glowb{0%,100%{opacity:.55}50%{opacity:1}}
@keyframes glowc{0%,100%{opacity:1}50%{opacity:.4}}
.pcard.bless .pc-fx{background-image:linear-gradient(105deg,transparent 42%,rgba(255,255,255,.38) 50%,transparent 58%),linear-gradient(135deg,rgba(255,120,160,.14),rgba(255,220,100,.14) 33%,rgba(120,230,170,.14) 66%,rgba(120,170,255,.14));}
.pc-fx::after{content:"";position:absolute;left:0;top:0;width:calc(var(--cw)*.035);height:calc(var(--cw)*.035);}
.pcard.bless .pc-fx::after{background:#FFF3C9;box-shadow:calc(var(--cw)*.2) calc(var(--cw)*.35) #FFF3C9,calc(var(--cw)*.62) calc(var(--cw)*.28) #FFE08A,calc(var(--cw)*.48) calc(var(--cw)*.7) #FFF3C9,calc(var(--cw)*.76) calc(var(--cw)*.82) #FFE08A,calc(var(--cw)*.3) calc(var(--cw)*.95) #FFF3C9;animation:twinkle 1.6s steps(2) infinite;animation-delay:var(--d,0s);}
@keyframes twinkle{0%{opacity:1}50%{opacity:.15}100%{opacity:1}}
.pcard.curse .pc-fx::after{top:auto;bottom:0;background:#E26A3B;box-shadow:calc(var(--cw)*.25) 0 #B84A32,calc(var(--cw)*.5) 0 #E26A3B,calc(var(--cw)*.75) 0 #B84A32;animation:ember 2.2s steps(8) infinite;animation-delay:var(--d,0s);}
@keyframes ember{0%{transform:translateY(0);opacity:1}100%{transform:translateY(calc(var(--cw)*-1));opacity:0}}
.pcard.hit-c{animation:shake .45s steps(6) 1;}
.pcard.hit-b{animation:popb .5s steps(5) 1;}
@keyframes popb{0%{transform:rotate(var(--rot,0deg)) scale(1)}50%{transform:rotate(var(--rot,0deg)) scale(1.14)}100%{transform:rotate(var(--rot,0deg)) scale(1)}}
.dealin{animation:dealin .5s steps(6) backwards;animation-delay:var(--dd,0s);}
@keyframes dealin{from{transform:translate(0,60vh) rotate(25deg) scale(.5);opacity:0}to{transform:none;opacity:1}}
.burst{position:absolute;left:50%;top:42%;width:0;height:0;pointer-events:none;z-index:6;}
.burst i{position:absolute;left:-3px;top:-3px;width:6px;height:6px;background:var(--bc);animation:burst .75s steps(8) forwards;}
@keyframes burst{0%{transform:translate(0,0) scale(1.2);opacity:1}100%{transform:translate(var(--bx),var(--by)) scale(.3);opacity:0}}
.fxo{position:fixed;inset:0;max-width:430px;margin:0 auto;z-index:60;pointer-events:none;display:grid;place-items:center;}
.fxflash{position:absolute;inset:0;animation:fxfl .5s steps(5) forwards;}
.fxo.bust .fxflash,.fxo.penalty .fxflash{background:rgba(184,74,50,.4);}
.fxo.bonus .fxflash{background:rgba(255,224,138,.22);}
.fxo.penalty .fxbox{animation:shake .45s steps(6) 1;}
.fxo.penalty .fxt{color:#E26A3B;}
.fxbadge{margin:0 auto 10px !important;animation:stampin .6s steps(6) both;}
.fxo.penalty .fxbadge{animation:stampdrop .6s steps(6) both;}
@keyframes stampin{0%{transform:scale(3) rotate(-30deg);opacity:0}55%{transform:scale(.88) rotate(5deg);opacity:1}100%{transform:scale(1) rotate(0)}}
@keyframes stampdrop{0%{transform:translateY(-120px) rotate(20deg);opacity:0}60%{transform:translateY(8px) rotate(-4deg);opacity:1}100%{transform:none}}
.fxo.birdie .fxflash,.fxo.bank .fxflash{background:rgba(255,224,138,.22);}
@keyframes fxfl{from{opacity:1}to{opacity:0}}
.fxo.bust .fxbox{animation:shake .45s steps(6) 1;}
.fxbox{position:relative;text-align:center;}
.fxt{font-family:'Pixelify Sans',ui-monospace,monospace;font-weight:700;font-size:44px;line-height:1;letter-spacing:1px;color:#FFE08A;text-shadow:4px 4px 0 #14150F;animation:fxpop 1.4s steps(10) forwards;}
.fxo.bust .fxt{color:#E26A3B;}
.fxo.bank .fxt{color:#E7E2D5;}
.fxs{margin-top:8px;font-weight:700;font-size:15px;color:#F4F0E6;text-shadow:2px 2px 0 #14150F;animation:fxpop 1.4s steps(10) forwards;}
@keyframes fxpop{0%{transform:scale(.3) rotate(-6deg);opacity:0}25%{transform:scale(1.25) rotate(2deg);opacity:1}40%{transform:scale(1) rotate(0)}85%{opacity:1}100%{transform:translateY(-14px);opacity:0}}
.stampm{display:inline-flex;flex-direction:column;align-items:center;gap:2px;padding:8px 18px 10px;color:var(--sc);background:rgba(255,253,247,.96);border:6px solid var(--sc);outline:3px solid var(--sc);outline-offset:5px;transform:rotate(var(--tilt));animation:stampslam .45s steps(6) both;}
.stampm .sw{font-family:'Silkscreen',monospace;font-weight:700;line-height:1;white-space:nowrap;}
.stampm .ss{font-family:'Silkscreen',monospace;font-size:18px;line-height:1.1;white-space:nowrap;}
.stampm.sm{padding:3px 8px 4px;border-width:3px;outline-width:2px;outline-offset:3px;}
.stampm.sm .ss{font-size:11px;}
@keyframes stampslam{0%{transform:scale(2.6) rotate(calc(var(--tilt) - 14deg));opacity:0}55%{transform:scale(.9) rotate(var(--tilt));opacity:1}75%{transform:scale(1.06) rotate(var(--tilt))}100%{transform:scale(1) rotate(var(--tilt))}}
.moment{position:fixed;inset:0;max-width:430px;margin:0 auto;z-index:62;background:rgba(27,28,26,.62);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;padding:16px;cursor:pointer;animation:mfade .2s steps(3) both;}
@keyframes mfade{from{opacity:0}to{opacity:1}}
.mstage{position:relative;width:340px;height:380px;max-width:100%;}
.mconf{position:absolute;left:50%;top:60px;transform:translateX(-50%);animation:mconf .5s steps(5) both;}
@keyframes mconf{from{transform:translateX(-50%) scale(.4);opacity:0}to{transform:translateX(-50%) scale(1);opacity:1}}
.mart{position:absolute;left:0;right:0;top:12px;display:flex;justify-content:center;animation:mart .5s steps(6) .1s both,mbob 1.6s steps(4) .7s infinite;}
@keyframes mart{0%{transform:translateY(-90px);opacity:0}70%{transform:translateY(6px);opacity:1}100%{transform:none}}
@keyframes mbob{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
.mstamp{position:absolute;left:0;right:0;top:200px;display:flex;justify-content:center;animation-delay:.25s;}
.mstage.noart .mstamp{top:140px;}
.moment.mix{background:rgba(27,28,26,.8);justify-content:flex-start;gap:10px;padding-top:max(14px,env(safe-area-inset-top));overflow-y:auto;}
.moment.mix .mstage{height:300px;width:272px;flex:none;}
.moment.mix .mstage>*{transform-origin:top center;}
.moment.mix .mconf{top:48px;width:272px;height:204px;}
.moment.mix .mart{top:0;zoom:.8;}
.moment.mix .mstamp{top:160px;zoom:.8;}
.mtitle{font-family:Silkscreen,monospace;font-weight:700;font-size:20px;color:#FBF6EA;text-shadow:3px 3px 0 #1B1C1A;}
.mpanel{max-width:350px;width:100%;border:3px solid #1B1C1A;box-shadow:5px 5px 0 #1B1C1A;padding:6px 10px;animation:mfade .3s steps(3) .5s both;}
.mpanel.also{background:#DCEBF3;}
.mpanel.ouch{background:#F6DCD4;animation-delay:.9s;}
.mph{font-family:Silkscreen,monospace;font-weight:700;font-size:13px;color:#1F4E79;}
.mpanel.ouch .mph{color:#B84A32;}
.mrow{display:flex;align-items:center;gap:12px;padding:5px 2px;}
.mrart{width:60px;flex:none;display:flex;justify-content:center;}
.mrw{font-family:Silkscreen,monospace;font-weight:700;font-size:16px;line-height:1.1;}
.mrn{font-size:15px;font-weight:700;color:#1B1C1A;}
.mtap{font-size:14px;font-weight:700;color:#FBF6EA;margin-top:4px;}
.mcap{max-width:326px;width:100%;background:#FBF6EA;color:#1B1C1A;border:3px solid #1B1C1A;box-shadow:5px 5px 0 #1B1C1A;padding:12px 14px;text-align:center;font-size:16px;font-weight:600;line-height:1.35;}
.rowstamp{position:absolute;right:58px;top:50%;transform:translateY(-50%);z-index:3;pointer-events:none;animation:rsout .4s steps(4) 2.6s forwards;}
@keyframes rsout{to{opacity:0}}
.wflag{position:relative;width:64px;height:64px;flex:none;background:#14150F;border:3px solid #1B1C1A;overflow:hidden;}
.wflag .wpole{position:absolute;left:12px;top:7px;width:4px;height:46px;background:#EDE8DD;box-shadow:2px 0 0 #000;}
.wflag .wpole:before{content:"";position:absolute;top:-4px;left:-1px;width:6px;height:4px;background:#D9B07A;}
.wflag .wcloth{position:absolute;left:16px;top:8px;display:flex;clip-path:polygon(0 0,100% 50%,0 100%);filter:drop-shadow(2px 2px 0 rgba(0,0,0,.5));}
.wflag .wcloth i{display:block;width:5px;height:24px;background:#B84A32;box-shadow:inset 0 -3px 0 #8E3826;animation:pnwave 1.1s steps(4) infinite;}
.wflag .wgreen{position:absolute;left:0;right:0;bottom:0;height:8px;background:#2C4536;border-top:3px solid #3E6B4B;}
.slidein{animation:slidein .3s steps(5) both;}
@keyframes slidein{from{transform:translateX(40px);opacity:0}to{transform:none;opacity:1}}
.shk{animation:shake .4s steps(6) 1;}
.tip{border-bottom:2px dotted var(--muted);cursor:help;text-align:inherit;}
.tipsheet{position:fixed;inset:0;max-width:430px;margin:0 auto;z-index:70;display:flex;align-items:flex-end;background:rgba(0,0,0,.55);}
.ntpwin{position:relative;display:flex;align-items:center;gap:10px;padding:8px 10px;margin-top:6px;background:var(--pine);color:#F4F0E6;overflow:visible;animation:ntpin .5s steps(6) both;}
.ntpwin .flagp{animation:plant .6s steps(6) both;transform-origin:bottom;}
.ntpwin .plus{font-weight:700;font-size:26px;color:#FFE08A;text-shadow:2px 2px 0 #14150F;animation:plusup 1.1s steps(8) both;}
@keyframes ntpin{from{transform:scaleY(0)}to{transform:scaleY(1)}}
@keyframes plant{0%{transform:translateY(-40px) rotate(-30deg);opacity:0}70%{transform:translateY(4px) rotate(4deg);opacity:1}100%{transform:none}}
@keyframes plusup{0%{transform:translateY(14px) scale(.4);opacity:0}40%{transform:translateY(-4px) scale(1.3);opacity:1}100%{transform:none;opacity:1}}
.pc-back .pc-in{background-color:#2A4535;background-image:repeating-linear-gradient(45deg,#2F4A3A 0 4px,#294133 4px 8px);align-items:center;justify-content:center;box-shadow:inset 0 0 0 calc(var(--cw)*.03) #14150F;}
@media (prefers-reduced-motion:reduce){.pc-flip,.pc-tilt{transition:none !important;}}
@media (prefers-reduced-motion:reduce){.sg *{animation:none !important;}}
`;

const initials = p => ((p.first || p.name || "?")[0] + (p.last ? p.last[0] : "")).toUpperCase();
// Bonuses are smooth gold octagon coins. Penalties are red hazard diamonds. Cards stay tall and rectangular.
function EventBadge({ k, px = 2, className }) {
  const pen = EVENTS[k].kind === "penalty"; const box = px * 15;
  const clip = pen ? "polygon(50% 0,100% 50%,50% 100%,0 50%)" : "polygon(30% 0,70% 0,100% 30%,100% 70%,70% 100%,30% 100%,0 70%,0 30%)";
  const w = pen ? box * 1.35 : box;
  return (
    <div className={className} aria-hidden="true" style={{ width: w, height: w, flex: "none", display: "grid", placeItems: "center", background: "#14150F", clipPath: clip, margin: pen ? `${-(w - box) / 2}px ${-(w - box) / 2}px` : 0 }}>
      <div style={{ width: w - 6, height: w - 6, display: "grid", placeItems: "center", clipPath: clip,
        background: pen ? "repeating-linear-gradient(45deg,#B84A32 0 4px,#8F3724 4px 8px)" : "radial-gradient(circle at 35% 30%,#F3DA9C,#D9B07A 60%,#B88A52)" }}>
        <Sprite name={EV_ART[k]} size={px} />
      </div>
    </div>
  );
}
function Avatar({ p, size = 38, ring }) {
  return (
    <div style={{ width: size, height: size, background: p.color, color: "#fff", display: "grid", placeItems: "center", fontWeight: 700,
      fontSize: Math.max(9, Math.round(size * ((p.last || p.first) ? 0.4 : 0.5))), flex: "none", letterSpacing: -0.5, border: "3px solid var(--night)", boxShadow: ring ? "0 0 0 3px var(--card), 0 0 0 6px var(--night)" : "none" }}>
      {initials(p)}
    </div>
  );
}

/* Birdies are chamfered "round" boxes, bogeys are square. Doubles get a second ring. */
const CH = "polygon(25% 0,75% 0,100% 25%,100% 75%,75% 100%,25% 100%,0 75%,0 25%)";
function ScoreMark({ v, par, size = 50 }) {
  const wrap = { width: size, height: size, display: "grid", placeItems: "center", flex: "none" };
  if (v == null) return <div style={wrap} title={`Tap + or − to start at par ${par}`}><div className="score-empty" aria-label={`No score yet. Tap plus or minus to start at par ${par}`}><b>{par}</b><small>PAR</small></div></div>;
  const d = v - par;
  const g = "var(--fair)", r = "var(--red)", m = "var(--mint)", w = "var(--card)";
  const layers = d <= -2 ? [[46, g], [41, w], [36, g], [31, m]] : d === -1 ? [[41, g], [36, m]] : d === 1 ? [[41, r], [36, w]] : d >= 2 ? [[46, r], [41, w], [36, r], [31, w]] : [];
  const birdie = d < 0;
  const num = <span key={v} className="pop px" style={{ fontSize: 23, lineHeight: 1, color: d > 0 ? "var(--red)" : d < 0 ? "var(--dk)" : "var(--ink)" }}>{v}</span>;
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

const TIPS = {
  pot: ["In pot", "Points you've earned that aren't locked in yet. If you bust, you lose them (the handicap cushion may let you keep some). Bank them to make them safe."],
  banked: ["Banked", "Safe points. Once banked they can never be lost, whatever happens next."],
  streak: ["Streak", "Holes in a row at net par or better. Three in a row doubles your points (x2), five triples them (x3). Banking resets the streak unless you hold a Vault."],
  risk: ["Bust risk", "Your chance of a net double bogey or worse on the next hole, worked out from your handicap and that hole's difficulty. A rough guide, not a rule."],
  advice: ["Hold, think or bank", "Hold means your pot is small or the risk is low. Think about it means the pot is worth protecting. Bank it means the risk is high for the size of your pot."],
  stroke: ["Strokes", "Your handicap gives you shots on the hardest holes. They come off your score, so a net score levels the field between a 5 and a 25 handicap."],
  ntp: ["Nearest the pin", "On a par 3, the player whose tee shot finishes closest to the pin earns +3 in their pot. Pick the winner, or Nobody if no one found the green. If the winner busts the hole, the +3 is lost."],
  mult: ["Streak multiplier", "Net par or better three holes running doubles your points. Five running triples them. A bogey ends it."],
  bank: ["Bank after hole", "Tap to lock your pot into your banked points after this hole. Your streak resets, and you can't bank on the hole before a card hole."],
  bonus: ["Bonuses and penalties", "Tap the chips to log a sandy, up and down, chip-in, barkie, lost ball, wet one or four putt. Bonuses (except a chip-in) need net par or better."],
};
const TipCtx = createContext(() => {});
// Live-round permissions. Outside a live round everything is allowed.
const LiveCtx = createContext({ score: () => true, bank: () => true, host: true, live: null });
function Tip({ k, children }) {
  const show = useContext(TipCtx);
  return <button type="button" className="tip" onClick={e => { e.stopPropagation(); show(k); }} aria-label={`What is ${TIPS[k][0]}?`} style={{ font: "inherit", color: "inherit", padding: 0, background: "none" }}>{children}</button>;
}
function TipSheet({ k, onClose }) {
  if (!k) return null;
  return (
    <div className="tipsheet" onClick={onClose}>
      <div className="sheet card" role="dialog" aria-label={TIPS[k][0]} onClick={e => e.stopPropagation()} style={{ width: "100%", padding: 14, boxShadow: "none" }}>
        <h2 className="h2">{TIPS[k][0]}</h2>
        <p style={{ marginTop: 6, lineHeight: 1.4 }}>{TIPS[k][1]}</p>
        <button className="cta" onClick={onClose} style={{ marginTop: 12 }}>Got it</button>
      </div>
    </div>
  );
}

Object.assign(TIPS, {
  sandy: ["Sandy", "Up and down from a bunker. This hole's points count double. Needs net par or better. It replaces Up and down, so you can't claim both."],
  updown: ["Up and down", "Missed the green, chipped or pitched on, then one putt. +2 to your pot. Needs net par or better. Not from a bunker (that's a Sandy) and not with a chip-in."],
  chipin: ["Chip-in", "Holed it from off the green. +4 to your pot, on any hole except a bust."],
  barkie: ["Barkie", "Hit a tree and still made par. +2 to your pot. Needs net par or better."],
  lost: ["Lost ball", "Lost it off the tee. Takes 3 points out of your pot (it can't go below zero)."],
  water: ["Wet one", "Found the water. Takes 2 points out of your pot (it can't go below zero)."],
  fourputt: ["Four putt", "Four putts or worse. Your pot is cut in half, rounded down."],
  bonusfx: ["Bonus points", "Extra points from bonuses logged this hole: sandy, up and down, chip-in, barkie or nearest the pin."],
  penfx: ["Penalty points", "Points taken out of the pot by a penalty logged this hole: lost ball, wet one or four putt."],
});

/* Nearest the pin: big, at the top of a par 3, and asked for before leaving the hole. */
function NtpPick({ round, people, ids, h, api, disabled, onPicked }) {
  const v = round.ntp[h];
  const pick = id => { if (disabled) return; if (v !== id && id !== "none") { SFX.ntp(); if (api.rowStamp) api.rowStamp(id, "STUCK IT", "NEAREST +3", "#1B1C1A"); } else HAPTIC.buzz(15); api.setNtp(h, id); if (onPicked) onPicked(id); };
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: ids.length > 4 ? "1fr 1fr 1fr" : "1fr 1fr", gap: 7 }}>
        {ids.map(id => (
          <button key={id} onClick={() => pick(id)} disabled={disabled} aria-label={`Nearest the pin: ${people[id].name}`} aria-pressed={v === id} className={`chip ${v === id ? "on" : ""}`}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 9px", minHeight: 52, opacity: v && v !== id ? 0.45 : 1, textAlign: "left" }}>
            <Avatar p={people[id]} size={32} />
            <span className="hd" style={{ fontWeight: 800, fontSize: 15, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{people[id].name}</span>
          </button>
        ))}
      </div>
      <button onClick={() => pick("none")} disabled={disabled} aria-pressed={v === "none"} className={`chip ${v === "none" ? "on" : ""}`} style={{ width: "100%", marginTop: 7, padding: "9px 0", textAlign: "center", fontWeight: 700 }}>Nobody hit the green</button>
    </div>
  );
}
function NtpCard({ round, people, ids, h, api, disabled }) {
  const v = round.ntp[h];
  const [open, setOpen] = useState(!v);
  useEffect(() => { setOpen(!v); }, [v, h]);
  return (
    <div style={{ border: "3px solid var(--night)", background: "var(--flag)", color: "var(--dk)", padding: "8px 9px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: open ? 8 : 0 }}>
        <Sprite name="flag" size={3} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="hd" style={{ fontWeight: 800, fontSize: 16, lineHeight: 1.1 }}><Tip k="ntp">Par 3: nearest the pin</Tip></div>
          <div style={{ fontSize: 12.5, lineHeight: 1.2 }}>{v ? (v === "none" ? "No one found the green. No points this hole." : "Closest ball earns +3.") : disabled ? "The scorer picks who was closest." : "Closest ball earns +3. Who was it?"}</div>
        </div>
        {v && !open && !disabled && <button className="chip" onClick={() => setOpen(true)} style={{ padding: "2px 9px", fontSize: 12, color: "var(--ink)" }}>Change</button>}
      </div>
      {open && <NtpPick round={round} people={people} ids={ids} h={h} api={api} disabled={disabled} onPicked={() => setOpen(false)} />}
      {people[v] && !open && (
        <div className="ntpwin" key={`${h}-${v}`} role="status">
          <div className="flagp"><Sprite name="flag" size={4} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="cap" style={{ color: "#C7D6BF" }}>Nearest the pin</div>
            <div className="hd" style={{ fontWeight: 700, fontSize: 16 }}>{people[v].name} {v === "me" ? "stick" : "sticks"} it close</div>
          </div>
          <div className="plus">+3</div>
          <Burst colors={BURST_B} n={14} reach={60} />
        </div>
      )}
    </div>
  );
}

function PickRow({ label, hint, ids, people, value, onPick, extra, tip }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, padding: "8px 0" }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 14 }}>{tip ? <Tip k={tip}>{label}</Tip> : label}</div>
        <div className="cap">{hint}</div>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {ids.map(id => (
          <button key={id} onClick={() => onPick(id)} aria-label={`${label}: ${people[id].name}`} aria-pressed={value === id}
            style={{ opacity: value && value !== id ? 0.35 : 1 }}>
            <Avatar p={people[id]} size={31} ring={value === id} />
          </button>
        ))}
        {extra}
      </div>
    </div>
  );
}

const CARD_ART = { dd: "c_dd", safe: "c_safe", vault: "c_vault", hot: "c_hot", life: "c_life", tax: "c_tax", heavy: "c_heavy", leaky: "c_leaky", shout: "c_shout", mine: "c_mine" };

/* A Balatro-style card: notched pixel edges, tilts toward your finger, flips over, shimmers (blessings) or flickers (curses). */
function PCard({ id, cw = 76, down = false, still = false, rot = 0, delay = 0, hit = "" }) {
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
    <div ref={ref} className={`pcard ${c.kind} ${cw < 56 ? "mini" : ""} ${still ? "still" : ""} ${down ? "down" : ""} ${hit ? "hit-" + hit : ""}`}
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
        <div className="pc-face pc-back"><div className="pc-in"><Sprite name="c_back" size={ps} /></div></div>
      </div></div>
    </div>
  );
}

function Burst({ colors, n = 16, reach = 70 }) {
  return (
    <div className="burst" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2, d = reach * (0.6 + (i % 3) * 0.25);
        return <i key={i} style={{ "--bx": `${Math.round(Math.cos(a) * d)}px`, "--by": `${Math.round(Math.sin(a) * d)}px`, "--bc": colors[i % colors.length] }} />;
      })}
    </div>
  );
}
const BURST_B = ["#FFE08A", "#FFF3C9", "#A9BFA3", "#E0C799"];
const BURST_C = ["#B84A32", "#E26A3B", "#3A302B", "#7A7A72"];

function Celebrate({ fx }) {
  if (!fx) return null;
  const gold = fx.kind !== "bust" && fx.kind !== "penalty";
  return (
    <div className={`fxo ${fx.kind}`} key={fx.key} aria-live="polite" role="status">
      <div className="fxflash" />
      <div className="fxbox">
        {fx.badge && <EventBadge k={fx.badge} px={6} className="fxbadge" />}
        <div className="fxt">{fx.text}</div>
        <div className="fxs">{fx.sub}</div>
        <Burst colors={gold ? (fx.kind === "bank" ? ["#FFE08A", "#E0C799", "#A9BFA3", "#FFF3C9"] : BURST_B) : BURST_C} n={fx.kind === "birdie" ? 24 : 18} reach={fx.kind === "birdie" ? 120 : 95} />
      </div>
    </div>
  );
}

/* Big moments: 8-bit art, a stamp and confetti. Layers are [colour, pixel path]. */
const ART = {
  bird: { w: 20, h: 14, l: [["#1B1C1A", "M11 0h4v1h-4zM10 1h1v1h-1zM15 1h1v1h-1zM9 2h1v1h-1zM14 2h1v1h-1zM16 2h1v1h-1zM9 3h1v1h-1zM13 3h2v1h-2zM16 3h1v1h-1zM2 4h2v1h-2zM9 4h1v1h-1zM16 4h1v1h-1zM1 5h1v1h-1zM4 5h1v1h-1zM8 5h1v1h-1zM16 5h1v1h-1zM0 6h1v1h-1zM5 6h3v1h-3zM16 6h1v1h-1zM0 7h1v1h-1zM8 7h1v1h-1zM15 7h1v1h-1zM1 8h1v1h-1zM9 8h1v1h-1zM15 8h1v1h-1zM2 9h1v1h-1zM9 9h1v1h-1zM15 9h1v1h-1zM3 10h1v1h-1zM8 10h1v1h-1zM14 10h1v1h-1zM4 11h5v1h-5zM13 11h1v1h-1zM8 12h5v1h-5z"], ["#3E7CB1", "M11 1h4v1h-4zM10 2h3v1h-3zM15 2h1v1h-1zM10 3h3v1h-3zM15 3h1v1h-1zM10 4h6v1h-6zM2 5h2v1h-2zM9 5h7v1h-7zM1 6h4v1h-4zM8 6h8v1h-8zM1 7h2v1h-2zM9 7h6v1h-6zM2 8h1v1h-1zM14 8h1v1h-1z"], ["#FFFDF7", "M13 2h1v1h-1zM10 8h4v1h-4zM10 9h5v1h-5zM9 10h5v1h-5zM9 11h4v1h-4z"], ["#E8742A", "M17 3h2v1h-2zM17 4h3v1h-3zM9 13h1v1h-1zM12 13h1v1h-1z"], ["#8EC5E8", "M3 7h5v1h-5zM3 8h6v1h-6zM3 9h6v1h-6zM4 10h4v1h-4z"]] },
  eagle: { w: 28, h: 18, l: [["#1B1C1A", "M0 0h2v1h-2zM26 0h2v1h-2zM0 1h1v1h-1zM2 1h1v1h-1zM25 1h1v1h-1zM27 1h1v1h-1zM0 2h1v1h-1zM3 2h1v1h-1zM24 2h1v1h-1zM27 2h1v1h-1zM1 3h1v1h-1zM4 3h1v1h-1zM23 3h1v1h-1zM26 3h1v1h-1zM1 4h1v1h-1zM5 4h1v1h-1zM11 4h6v1h-6zM22 4h1v1h-1zM26 4h1v1h-1zM2 5h1v1h-1zM6 5h1v1h-1zM10 5h1v1h-1zM17 5h1v1h-1zM21 5h1v1h-1zM25 5h1v1h-1zM2 6h1v1h-1zM7 6h1v1h-1zM9 6h1v1h-1zM12 6h1v1h-1zM15 6h1v1h-1zM18 6h1v1h-1zM20 6h1v1h-1zM25 6h1v1h-1zM3 7h1v1h-1zM8 7h2v1h-2zM18 7h2v1h-2zM24 7h1v1h-1zM3 8h1v1h-1zM9 8h2v1h-2zM17 8h2v1h-2zM24 8h1v1h-1zM4 9h1v1h-1zM11 9h2v1h-2zM15 9h2v1h-2zM23 9h1v1h-1zM4 10h1v1h-1zM13 10h2v1h-2zM23 10h1v1h-1zM5 11h1v1h-1zM22 11h1v1h-1zM6 12h2v1h-2zM20 12h2v1h-2zM8 13h2v1h-2zM18 13h2v1h-2zM10 14h1v1h-1zM17 14h1v1h-1zM10 15h2v1h-2zM16 15h2v1h-2zM11 16h1v1h-1zM13 16h2v1h-2zM16 16h1v1h-1zM12 17h4v1h-4z"], ["#6B4A30", "M1 1h1v1h-1zM26 1h1v1h-1zM1 2h2v1h-2zM25 2h2v1h-2zM2 3h2v1h-2zM24 3h2v1h-2zM3 4h2v1h-2zM23 4h2v1h-2zM4 5h2v1h-2zM22 5h2v1h-2zM5 6h2v1h-2zM21 6h2v1h-2zM6 7h2v1h-2zM20 7h2v1h-2zM7 8h2v1h-2zM19 8h2v1h-2zM8 9h3v1h-3zM17 9h3v1h-3zM9 10h4v1h-4zM15 10h4v1h-4zM10 11h8v1h-8zM11 12h6v1h-6zM12 13h4v1h-4zM13 14h2v1h-2zM12 15h4v1h-4z"], ["#3B2A1E", "M2 4h1v1h-1zM25 4h1v1h-1zM3 5h1v1h-1zM24 5h1v1h-1zM3 6h2v1h-2zM23 6h2v1h-2zM4 7h2v1h-2zM22 7h2v1h-2zM4 8h3v1h-3zM21 8h3v1h-3zM5 9h3v1h-3zM20 9h3v1h-3zM5 10h4v1h-4zM19 10h4v1h-4zM6 11h4v1h-4zM18 11h4v1h-4zM8 12h3v1h-3zM17 12h3v1h-3zM10 13h2v1h-2zM16 13h2v1h-2zM11 14h2v1h-2zM15 14h2v1h-2z"], ["#FFFDF7", "M11 5h6v1h-6zM10 6h2v1h-2zM13 6h2v1h-2zM16 6h2v1h-2zM10 7h8v1h-8zM11 8h2v1h-2zM15 8h2v1h-2z"], ["#F2C230", "M13 8h2v1h-2zM13 9h2v1h-2zM12 16h1v1h-1zM15 16h1v1h-1z"]] },
  albatross: { w: 40, h: 18, l: [["#1B1C1A", "M18 0h4v1h-4zM17 1h1v1h-1zM22 1h1v1h-1zM10 2h7v1h-7zM18 2h1v1h-1zM22 2h1v1h-1zM9 3h1v1h-1zM23 3h1v1h-1zM11 4h4v1h-4zM22 4h1v1h-1zM26 4h3v1h-3zM7 5h4v1h-4zM14 5h3v1h-3zM22 5h1v1h-1zM24 5h2v1h-2zM29 5h4v1h-4zM4 6h3v1h-3zM16 6h1v1h-1zM22 6h2v1h-2zM33 6h3v1h-3zM1 7h3v1h-3zM36 7h3v1h-3zM0 8h1v1h-1zM39 8h1v1h-1zM1 9h2v1h-2zM37 9h2v1h-2zM3 10h4v1h-4zM33 10h4v1h-4zM7 11h6v1h-6zM27 11h6v1h-6zM13 12h4v1h-4zM23 12h4v1h-4zM17 13h1v1h-1zM22 13h1v1h-1zM18 14h4v1h-4z"], ["#FFFDF7", "M18 1h4v1h-4zM19 2h3v1h-3zM17 3h6v1h-6zM16 4h6v1h-6zM17 5h5v1h-5zM11 6h3v1h-3zM17 6h5v1h-5zM26 6h3v1h-3zM8 7h8v1h-8zM18 7h4v1h-4zM24 7h8v1h-8zM6 8h28v1h-28zM9 9h22v1h-22zM13 10h14v1h-14zM15 11h10v1h-10zM17 12h6v1h-6zM18 13h4v1h-4z"], ["#3A3D40", "M17 2h1v1h-1zM11 5h3v1h-3zM26 5h3v1h-3zM7 6h4v1h-4zM14 6h2v1h-2zM24 6h2v1h-2zM29 6h4v1h-4zM4 7h4v1h-4zM16 7h2v1h-2zM22 7h2v1h-2zM32 7h4v1h-4zM1 8h5v1h-5zM34 8h5v1h-5zM3 9h6v1h-6zM31 9h6v1h-6zM7 10h6v1h-6zM27 10h6v1h-6zM13 11h2v1h-2zM25 11h2v1h-2z"], ["#F2C230", "M11 3h6v1h-6zM15 4h1v1h-1z"], ["#E8742A", "M10 3h1v1h-1zM10 4h1v1h-1zM18 15h1v1h-1zM21 15h1v1h-1z"], ["#3E7CB1", "M2 17h2v1h-2zM12 17h3v1h-3zM26 17h3v1h-3zM35 17h2v1h-2z"], ["#8EC5E8", "M2 16h2v1h-2zM12 16h3v1h-3zM26 16h3v1h-3zM35 16h2v1h-2zM1 17h1v1h-1zM4 17h1v1h-1zM11 17h1v1h-1zM15 17h1v1h-1zM25 17h1v1h-1zM29 17h1v1h-1zM34 17h1v1h-1zM37 17h1v1h-1z"]] },
  ace: { w: 24, h: 19, l: [["#2F4A3A", "M0 17h24v1h-24zM0 18h24v1h-24z"], ["#4F8A5B", "M0 15h8v1h-8zM15 15h1v1h-1zM17 15h7v1h-7zM0 16h7v1h-7zM16 16h8v1h-8z"], ["#1B1C1A", "M12 0h1v1h-1zM12 1h1v1h-1zM12 2h1v1h-1zM12 3h1v1h-1zM12 4h1v1h-1zM12 5h1v1h-1zM12 6h1v1h-1zM12 7h1v1h-1zM10 8h3v1h-3zM9 9h1v1h-1zM13 9h1v1h-1zM8 10h1v1h-1zM14 10h1v1h-1zM8 11h1v1h-1zM14 11h1v1h-1zM8 12h1v1h-1zM14 12h1v1h-1zM9 13h1v1h-1zM13 13h1v1h-1zM10 14h3v1h-3zM8 15h7v1h-7zM7 16h9v1h-9z"], ["#B84A32", "M13 1h4v1h-4zM13 2h6v1h-6zM13 3h8v1h-8zM13 4h6v1h-6zM13 5h4v1h-4z"], ["#FFFDF7", "M2 5h1v1h-1zM21 5h1v1h-1zM1 6h3v1h-3zM20 6h3v1h-3zM2 7h1v1h-1zM21 7h1v1h-1zM16 13h1v1h-1zM15 14h3v1h-3zM16 15h1v1h-1zM10 9h3v1h-3zM9 10h5v1h-5zM9 11h5v1h-5zM9 12h5v1h-5zM10 13h3v1h-3z"], ["#8EC5E8", "M6 6h1v1h-1zM7 7h1v1h-1zM8 8h1v1h-1z"]] },
  flames: { w: 26, h: 18, l: [["#B84A32", "M14 0h1v1h-1zM13 1h3v1h-3zM12 2h4v1h-4zM12 3h5v1h-5zM11 4h6v1h-6zM11 5h6v1h-6zM2 6h1v1h-1zM10 6h7v1h-7zM23 6h1v1h-1zM2 7h2v1h-2zM10 7h3v1h-3zM14 7h3v1h-3zM22 7h2v1h-2zM2 8h3v1h-3zM9 8h3v1h-3zM15 8h3v1h-3zM21 8h3v1h-3zM1 9h5v1h-5zM9 9h3v1h-3zM15 9h3v1h-3zM20 9h5v1h-5zM1 10h5v1h-5zM9 10h3v1h-3zM15 10h3v1h-3zM20 10h5v1h-5zM1 11h3v1h-3zM5 11h2v1h-2zM8 11h3v1h-3zM15 11h3v1h-3zM19 11h2v1h-2zM22 11h3v1h-3zM1 12h2v1h-2zM5 12h2v1h-2zM8 12h3v1h-3zM15 12h3v1h-3zM19 12h2v1h-2zM23 12h2v1h-2zM1 13h2v1h-2zM6 13h5v1h-5zM16 13h4v1h-4zM23 13h2v1h-2zM1 14h2v1h-2zM6 14h4v1h-4zM16 14h4v1h-4zM23 14h2v1h-2zM1 15h2v1h-2zM7 15h3v1h-3zM16 15h3v1h-3zM23 15h2v1h-2zM1 16h2v1h-2zM7 16h3v1h-3zM16 16h3v1h-3zM23 16h2v1h-2zM2 17h1v1h-1zM7 17h1v1h-1zM9 17h2v1h-2zM15 17h2v1h-2zM18 17h1v1h-1zM23 17h1v1h-1z"], ["#E8742A", "M13 7h1v1h-1zM12 8h3v1h-3zM12 9h3v1h-3zM12 10h3v1h-3zM4 11h1v1h-1zM11 11h4v1h-4zM21 11h1v1h-1zM3 12h2v1h-2zM11 12h1v1h-1zM14 12h1v1h-1zM21 12h2v1h-2zM3 13h3v1h-3zM11 13h1v1h-1zM15 13h1v1h-1zM20 13h3v1h-3zM3 14h1v1h-1zM5 14h1v1h-1zM10 14h1v1h-1zM15 14h1v1h-1zM20 14h1v1h-1zM22 14h1v1h-1zM3 15h1v1h-1zM6 15h1v1h-1zM10 15h1v1h-1zM15 15h1v1h-1zM19 15h1v1h-1zM22 15h1v1h-1zM3 16h1v1h-1zM6 16h1v1h-1zM10 16h1v1h-1zM15 16h1v1h-1zM19 16h1v1h-1zM22 16h1v1h-1z"], ["#FFD25A", "M12 12h2v1h-2zM12 13h3v1h-3zM4 14h1v1h-1zM11 14h4v1h-4zM21 14h1v1h-1zM4 15h2v1h-2zM11 15h4v1h-4zM20 15h2v1h-2zM4 16h2v1h-2zM11 16h4v1h-4zM20 16h2v1h-2zM3 17h4v1h-4zM11 17h4v1h-4zM19 17h4v1h-4z"]] },
  pot: { w: 20, h: 15, l: [["#1B1C1A", "M6 0h8v1h-8zM6 1h1v1h-1zM13 1h1v1h-1zM5 2h10v1h-10zM4 3h1v1h-1zM15 3h1v1h-1zM3 4h1v1h-1zM16 4h1v1h-1zM2 5h1v1h-1zM17 5h1v1h-1zM2 6h1v1h-1zM17 6h1v1h-1zM2 7h1v1h-1zM17 7h1v1h-1zM2 8h1v1h-1zM17 8h1v1h-1zM3 9h1v1h-1zM16 9h1v1h-1zM4 10h1v1h-1zM15 10h1v1h-1zM5 11h10v1h-10zM6 13h1v1h-1zM14 13h1v1h-1zM13 14h1v1h-1z"], ["#F4F0E6", "M7 1h6v1h-6zM5 3h10v1h-10zM4 4h5v1h-5zM10 4h6v1h-6zM3 5h6v1h-6zM11 5h6v1h-6zM3 6h7v1h-7zM11 6h6v1h-6zM3 7h6v1h-6zM11 7h6v1h-6zM3 8h6v1h-6zM10 8h7v1h-7zM4 9h5v1h-5zM11 9h5v1h-5zM5 10h5v1h-5zM11 10h4v1h-4z"], ["#B84A32", "M9 4h1v1h-1zM9 5h2v1h-2zM10 6h1v1h-1zM9 7h2v1h-2zM9 8h1v1h-1zM9 9h2v1h-2zM10 10h1v1h-1zM2 13h2v1h-2zM17 13h2v1h-2zM1 14h2v1h-2zM18 14h1v1h-1z"]] },
};
const CONFETTI = "M30 1h2v1h-2zM37 1h2v1h-2zM30 2h2v1h-2zM37 2h2v1h-2zM45 2h2v1h-2zM28 3h3v1h-3zM45 3h2v1h-2zM28 4h3v1h-3zM51 4h3v1h-3zM51 5h5v1h-5zM20 6h2v1h-2zM31 6h3v1h-3zM54 6h2v1h-2zM20 7h2v1h-2zM24 7h2v1h-2zM31 7h3v1h-3zM10 8h2v1h-2zM24 8h2v1h-2zM10 9h2v1h-2zM36 9h3v1h-3zM41 9h2v1h-2zM23 10h2v1h-2zM36 10h3v1h-3zM41 10h5v1h-5zM54 10h2v1h-2zM11 11h2v1h-2zM23 11h2v1h-2zM42 11h4v1h-4zM54 11h2v1h-2zM11 12h2v1h-2zM54 12h2v1h-2zM28 13h12v1h-12zM8 14h2v1h-2zM25 14h18v1h-18zM8 15h2v1h-2zM16 15h2v1h-2zM23 15h22v1h-22zM49 15h2v1h-2zM16 16h2v1h-2zM22 16h24v1h-24zM49 16h2v1h-2zM21 17h26v1h-26zM12 18h2v1h-2zM20 18h28v1h-28zM12 19h2v1h-2zM18 19h31v1h-31zM58 19h2v1h-2zM18 20h32v1h-32zM58 20h2v1h-2zM18 21h32v1h-32zM55 21h2v1h-2zM17 22h34v1h-34zM55 22h2v1h-2zM64 22h2v1h-2zM17 23h34v1h-34zM54 23h2v1h-2zM60 23h2v1h-2zM64 23h2v1h-2zM13 24h2v1h-2zM17 24h34v1h-34zM54 24h2v1h-2zM59 24h3v1h-3zM13 25h2v1h-2zM17 25h34v1h-34zM59 25h2v1h-2zM17 26h37v1h-37zM58 26h2v1h-2zM17 27h37v1h-37zM58 27h2v1h-2zM63 27h2v1h-2zM12 28h2v1h-2zM17 28h34v1h-34zM63 28h2v1h-2zM12 29h2v1h-2zM18 29h32v1h-32zM7 30h2v1h-2zM18 30h32v1h-32zM7 31h2v1h-2zM14 31h2v1h-2zM19 31h30v1h-30zM14 32h3v1h-3zM20 32h28v1h-28zM51 32h2v1h-2zM8 33h2v1h-2zM15 33h2v1h-2zM21 33h26v1h-26zM51 33h2v1h-2zM8 34h2v1h-2zM22 34h24v1h-24zM23 35h22v1h-22zM10 36h2v1h-2zM13 36h2v1h-2zM25 36h18v1h-18zM56 36h2v1h-2zM8 37h4v1h-4zM13 37h2v1h-2zM16 37h2v1h-2zM28 37h14v1h-14zM56 37h2v1h-2zM8 38h3v1h-3zM16 38h2v1h-2zM60 38h2v1h-2zM45 39h2v1h-2zM60 39h2v1h-2zM8 40h2v1h-2zM22 40h2v1h-2zM45 40h2v1h-2zM48 40h2v1h-2zM8 41h2v1h-2zM22 41h2v1h-2zM48 41h2v1h-2zM40 42h2v1h-2zM51 42h2v1h-2zM30 43h2v1h-2zM40 43h2v1h-2zM50 43h3v1h-3zM30 44h2v1h-2zM50 44h2v1h-2zM24 45h2v1h-2zM24 46h2v1h-2zM36 46h2v1h-2zM36 47h2v1h-2z";
function PixelArt({ k, px = 10, className }) {
  const a = ART[k]; if (!a) return null;
  return <svg className={className} width={a.w * px} height={a.h * px} viewBox={`0 0 ${a.w} ${a.h}`} shapeRendering="crispEdges" aria-hidden="true">{a.l.map(([c, d], i) => <path key={i} fill={c} d={d} />)}</svg>;
}
function StampMark({ word, sub, color, tilt = -7, small }) {
  return (
    <div className={small ? "stampm sm" : "stampm"} style={{ "--sc": color, "--tilt": `${tilt}deg` }}>
      <span className="sw" style={{ fontSize: small ? 22 : word.length > 9 ? 34 : word.length > 7 ? 40 : 52 }}>{word}</span>
      {sub && <span className="ss">{sub}</span>}
    </div>
  );
}
const PLAYED = new Map(); // "round seed:hole" -> what was celebrated, so going back and forward doesn't replay it
const GOOD = {
  ace: { rank: 6, art: "ace", word: "HOLE IN ONE!", label: "Hole in one", color: "#B84A32", bg: "#CFE6C9", tilt: -5, sound: "ace" },
  albatross: { rank: 5, art: "albatross", word: "ALBATROSS!", label: "Albatross", color: "#1F4E79", bg: "#8EC5E8", tilt: -5, sound: "eagle" },
  eagle: { rank: 4, art: "eagle", word: "EAGLE!", label: "Eagle", color: "#1F4E79", bg: "#8EC5E8", tilt: 6, sound: "eagle" },
  birdie: { rank: 3, art: "bird", word: "BIRDIE!", label: "Birdie", color: "#2F4A3A", bg: "#BFE0F2", tilt: -7, sound: "birdie" },
  fire: { rank: 2, art: "flames", word: "ON FIRE", label: "On fire x3", color: "#B84A32", bg: "#FFFDF7", tilt: -6, sound: "mult" },
  roll: { rank: 1, art: "flames", word: "ON A ROLL", label: "On a roll x2", color: "#B84A32", bg: "#FFFDF7", tilt: -6, sound: "mult" },
};
// What a score is called, for the tag on each player's row.
function scoreName(v, par) {
  const d = v - par;
  if (v === 1 && par > 2) return { label: "HOLE IN ONE", bg: "#CFE6C9" };
  if (d <= -3) return { label: "ALBATROSS", bg: "#8EC5E8" };
  if (d === -2) return { label: "EAGLE", bg: "#8EC5E8" };
  if (d === -1) return { label: "BIRDIE", bg: "#BFE0F2" };
  if (d === 0) return { label: "PAR", bg: "#E7E2D5" };
  if (d === 1) return { label: "BOGEY", bg: "#F2D9C4" };
  if (d === 2) return { label: "DOUBLE BOGEY", bg: "#F2B8A8" };
  if (d === 3) return { label: "TRIPLE BOGEY", bg: "#E89A86" };
  return { label: `+${d}`, bg: "#E89A86" };
}
// One screen per hole: the best moment big, then the other nice ones ("Also") and any busts ("Ouch") as rows underneath.
const ROW_ART = { birdie: "bird", fire: "flames", roll: "flames", eagle: "eagle", albatross: "albatross", ace: "ace" };
function holeScreens({ good, bad }, hh, people) {
  const nm = id => (people[id] ? people[id].name : "Someone");
  const ouch = bad.map(e => ({ art: "pot", word: `BUST −${e.lost}`, name: nm(e.id), note: e.kept ? `cushion keeps ${e.kept}` : "" }));
  if (good.length) {
    const g = [...good].sort((a, b) => GOOD[b.kind].rank - GOOD[a.kind].rank); const top = GOOD[g[0].kind];
    const also = [];
    g.slice(1).forEach(e => { // the same thing for several players goes on one row: "You, Nic & Mitch"
      const word = `${GOOD[e.kind].word.replace("!", "")}${e.x ? ` x${e.x}` : ""}`.trim();
      const r = also.find(x => x.word === word);
      if (r) r.names.push(nm(e.id)); else also.push({ art: ROW_ART[e.kind], word, names: [nm(e.id)], color: GOOD[e.kind].color });
    });
    also.forEach(r => { r.name = r.names.length > 1 ? `${r.names.slice(0, -1).join(", ")} & ${r.names[r.names.length - 1]}` : r.names[0]; });
    const one = !also.length && !ouch.length;
    return [{ ...top, sub: `${nm(g[0].id).toUpperCase()}${g[0].x ? ` x${g[0].x}` : ""}`, also, ouch, title: `HOLE ${hh + 1}`,
      caption: !one ? null : g[0].kind === "ace" ? [`A hole in one on hole ${hh + 1}! Drinks are on ${nm(g[0].id)}.`] : [`Hole ${hh + 1}`, `${top.label}: ${nm(g[0].id)}`] }];
  }
  if (bad.length) {
    return [{ art: "pot", word: bad.length > 1 ? "BUSTS" : "BUST", color: "#B84A32", bg: "#F2B8A8", tilt: -9, sound: "bust",
      sub: bad.length === 1 ? `${nm(bad[0].id).toUpperCase()} −${bad[0].lost}` : bad.length === 2 ? bad.map(e => nm(e.id).toUpperCase()).join(" & ") : `${bad.length} PLAYERS`,
      caption: [`Hole ${hh + 1}: net double bogey`, ...bad.map(e => `${nm(e.id)} −${e.lost}${e.kept ? ` (cushion keeps ${e.kept})` : ""}`), "Banked points are safe."] }];
  }
  return [];
}
function MomentRow({ r }) {
  return (
    <div className="mrow">
      <div className="mrart"><PixelArt k={r.art} px={r.art === "albatross" ? 1.4 : r.art === "eagle" ? 1.6 : 2.2} /></div>
      <div style={{ minWidth: 0 }}><div className="mrw" style={{ color: r.color || "#B84A32" }}>{r.word}</div><div className="mrn">{r.name}{r.note ? ` · ${r.note}` : ""}</div></div>
    </div>
  );
}
/* A big moment: art, a stamp and confetti over the round. Tap to carry on; it also goes by itself. */
function Moment({ m, more, onDone }) {
  if (!m) return null;
  const mix = !!((m.also && m.also.length) || (m.ouch && m.ouch.length));
  return (
    <div className={mix ? "moment mix" : "moment"} key={m.key} role="alertdialog" aria-label={`${m.word} ${m.sub || ""}`} onClick={onDone}>
      {mix && <div className="mtitle">{m.title}</div>}
      <div className="mstage">
        <svg className="mconf" width="340" height="255" viewBox="0 0 68 51" shapeRendering="crispEdges" aria-hidden="true"><path fill="#1B1C1A" fillOpacity=".85" transform="translate(.8 .8)" d={CONFETTI} /><path fill={m.bg} d={CONFETTI} /></svg>
        {m.art && <div className="mart"><PixelArt k={m.art} px={m.art === "pot" ? 9 : 10} /></div>}
        <div className="mstamp"><StampMark word={m.word} sub={m.sub} color={m.color} tilt={m.tilt} /></div>
      </div>
      {mix && m.also.length > 0 && <div className="mpanel also"><div className="mph">ALSO</div>{m.also.map((r, i) => <MomentRow key={i} r={r} />)}</div>}
      {mix && m.ouch.length > 0 && <div className="mpanel ouch"><div className="mph">OUCH</div>{m.ouch.map((r, i) => <MomentRow key={i} r={r} />)}<div className="mrn" style={{ fontWeight: 600, padding: "2px 0 2px" }}>Banked points are safe.</div></div>}
      {mix && <div className="mtap">{more ? "Tap for the next one" : "Tap to carry on"}</div>}
      {m.caption && <div className="mcap">{(Array.isArray(m.caption) ? m.caption : [m.caption]).map((l, i) => <div key={i} style={i === 0 && Array.isArray(m.caption) && m.caption.length > 1 ? { fontWeight: 700 } : null}>{l}</div>)}<div className="cap" style={{ marginTop: 6, fontWeight: 600 }}>{more ? "Tap for the next one" : "Tap to carry on"}</div></div>}
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
          <div className="hd" style={{ fontWeight: 700, fontSize: 15 }}>{c.name}</div>
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
              <div className="dealin" style={{ "--dd": `${i * 0.12}s`, position: "relative" }}>
                <PCard id={draw[id]} cw={cw} down={!up[id]} rot={(i - (ids.length - 1) / 2) * 4} delay={i * 0.35} hit={up[id] ? (CARDS[draw[id]].kind === "bless" ? "b" : "c") : ""} />
                {up[id] && <Burst colors={CARDS[draw[id]].kind === "bless" ? BURST_B : BURST_C} />}
              </div>
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
  const can = useContext(LiveCtx);
  const [open, setOpen] = useState(null);
  const [zoom, setZoom] = useState(null);
  const [hintK, setHintK] = useState(null);
  const showTip = useContext(TipCtx);
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
        {can.live && can.scoring === "each" && <p className="cap" style={{ marginTop: 6 }}><b>Bank calls are secret.</b> Yours locks when you move to the next hole. Everyone's is revealed once the whole group has moved on.</p>}
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
                  <div className="hd" style={{ flex: 1, fontWeight: 700 }}>{people[id].name}</div>
                  <div style={{ textAlign: "right", minWidth: 62 }}><span className={hot ? "beat" : ""} style={{ fontWeight: 800, fontSize: 17 }}>{s.pot}</span><Tip k="pot"><span className="cap"> in pot</span></Tip></div>
                  <div style={{ textAlign: "right", minWidth: 72 }}><span style={{ fontWeight: 800, fontSize: 17 }}>{s.banked}</span><Tip k="banked"><span className="cap"> banked</span></Tip></div>
                </div>
                {bust && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                    <Sprite name="skull" size={4} className="flick" />
                    <div className="px blink" style={{ fontSize: 19 }}>BUST!</div>
                    <div style={{ marginLeft: "auto", fontWeight: 700 }}>{bust.lost + (bust.kept || 0) === 0 ? "Pot was empty" : `Lost ${bust.lost}${bust.kept ? `, kept ${bust.kept}` : ""}`}</div>
                  </div>
                )}
                {hot && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                    {Array.from({ length: s.mult }).map((_, k) => <Sprite key={k} name="flame" size={4} className="flick" />)}
                    <div className="px" style={{ fontSize: 21 }}><Tip k="mult">x{s.mult} streak</Tip></div>
                    <div className="cap" style={{ marginLeft: "auto" }}>{s.streak} in a row</div>
                  </div>
                )}
                {eff && (eff.bonus > 0 || eff.penalty > 0) && (
                  <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                    {eff.bonus > 0 && <span className="pill beat" style={{ background: "var(--dk)", color: "var(--lime)", borderColor: "var(--dk)", fontSize: 13 }}><Sprite name="star" size={2} /><Tip k="bonusfx">Bonus +{eff.bonus}</Tip></span>}
                    {eff.penalty > 0 && <span className="pill blink" style={{ background: "var(--red)", color: "#fff", fontSize: 13 }}><Tip k="penfx">Penalty -{eff.penalty}</Tip></span>}
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                  {!hot && !bust && <span className="cap"><Tip k="streak">Streak {s.streak}</Tip></span>}
                  {banking && <span className="cap">{s.vaults > 0 ? "Vault keeps your streak" : "Streak resets"}</span>}
                  {s.shields > 0 && <span className="pill px" style={{ background: "var(--mint)", color: "var(--dk)", padding: "1px 6px", fontSize: 13 }}>SAFETY NET HELD</span>}
                  {s.vaults > 0 && <span className="pill px" style={{ background: "var(--mint)", color: "var(--dk)", padding: "1px 6px", fontSize: 13 }}>VAULT HELD</span>}
                  {s.leak > 0 && <span className="pill blink" style={{ background: "var(--red)", color: "#fff", fontSize: 11 }}>Leaking {s.leak}</span>}
                  {(() => { const ad = !banking && !heavy && !locked && bankAdvice(round, id, h, s); return ad ? <span className="cap" title="A rough guide, not a rule" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Tip k="risk">Bust risk next hole {Math.round(ad.risk * 100)}%</Tip><Tip k="advice"><span className="pill" style={{ background: ad.level === "bank" ? "var(--red)" : ad.level === "think" ? "var(--flag)" : "var(--mint)", color: ad.level === "bank" ? "#fff" : "var(--dk)", fontSize: 11 }}>{ad.level === "bank" ? "Bank it" : ad.level === "think" ? "Think about it" : "Hold"}</span></Tip>{ad.cardNext && ad.level !== "hold" ? <span className="cap">cards next</span> : null}</span> : null; })()}
                  {(() => {
                    const hid = !heavy && can.hidden && can.hidden(id, h);
                    const mineLocked = !heavy && !locked && !hid && can.live && !can.bank(id, h);
                    return (
                      <button className={`chip ${banking && !hid ? "on" : ""}`} disabled={heavy || locked || hid || !can.bank(id, h)} aria-pressed={banking && !hid}
                        onClick={() => api.setBank(id, h, !round.bank[id][h])} style={{ marginLeft: "auto", padding: "2px 7px", fontSize: 12, opacity: heavy || locked ? 0.7 : 1 }}>
                        {heavy ? "Forced bank" : hid ? "Call hidden" : locked || mineLocked ? (banking ? "Banked. Locked" : "Bank locked") : banking ? "Banking after hole" : "Bank after hole"}
                      </button>
                    );
                  })()}
                </div>
                {avail.length > 0 && (
                  <div style={{ marginTop: 6 }}>
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
                      {active.map(k => (
                        <span key={k} className="pill px" style={{ display: "inline-flex", alignItems: "center", gap: 4, background: EVENTS[k].kind === "bonus" ? "var(--lime)" : "var(--red)", color: EVENTS[k].kind === "bonus" ? "var(--dk)" : "#fff", padding: "1px 6px", fontSize: 13 }}><EventBadge k={k} px={1} /><Tip k={k}>{EVENTS[k].name.toUpperCase()}</Tip></span>
                      ))}
                      <button className="chip" aria-expanded={open === id} onClick={() => setOpen(open === id ? null : id)} style={{ padding: "1px 6px", fontSize: 12, marginLeft: active.length ? 0 : "auto" }}>
                        {open === id ? "Done" : "+ Bonus or penalty"}
                      </button>
                    </div>
                    {open === id && (
                      <div style={{ marginTop: 6 }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {avail.map(k => {
                            const on = !!evs[k]; const pen = EVENTS[k].kind === "penalty"; const dud = !pen && k !== "chipin" && round.scores[id][h] != null && netOf(round, id, h) - PAR[h] >= 1;
                            return (
                              <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
                                <button className={`chip ${on ? "on" : ""}`} aria-pressed={on} onClick={() => { api.setEvent(id, h, k); setHintK(k); if (!on) { SFX.event(k); if (!dud) api.rowStamp(id, EVENTS[k].name.toUpperCase(), EVENTS[k].tag.slice(EVENTS[k].name.length).replace(/^[:\s]+/, "").replace("-", "−").toUpperCase(), pen ? "#B84A32" : "#2F4A3A"); } }}
                                  title={dud ? "Needs net par or better" : undefined} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "1px 6px 1px 3px", fontSize: 12, opacity: dud ? 0.4 : 1, textDecoration: dud && on ? "line-through" : "none", ...(on && pen ? { background: "var(--red)", borderColor: "var(--red)", color: "#fff" } : {}) }}>
                                  <EventBadge k={k} px={1} />{EVENTS[k].tag}
                                </button>
                                <button type="button" aria-label={`What is ${EVENTS[k].name}?`} onClick={() => showTip(k)} style={{ width: 20, height: 20, display: "grid", placeItems: "center", fontWeight: 800, fontSize: 11, border: "2px solid var(--night)", background: "var(--card)", color: "var(--ink)" }}>?</button>
                              </span>
                            );
                          })}
                        </div>
                        <p className="cap" style={{ marginTop: 5 }}>{hintK && EVENTS[hintK] ? <><b>{EVENTS[hintK].name}:</b> {EVENTS[hintK].hint}</> : "Tap a chip to log it. Tap again to undo."}{round.opts.bonuses ? " Sandy, up and down and barkie need net par or better. A chip-in always counts." : ""}</p>
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
      <div className="hd" style={{ fontWeight: 800, marginTop: 5 }}>{meta.name}</div>
      <p className="cap" style={{ marginTop: 3 }}>Your own game plugs in here once the rules are set.</p>
    </div>
  );
}

/* ───────────── SCREENS ───────────── */
/* Press and hold a row for 0.6s to ask to delete it. A quick tap behaves as normal. */
function HoldRow({ onHold, onTap, children, style, className }) {
  const [holding, setHolding] = useState(false);
  const timer = useRef(null); const fired = useRef(false);
  const start = () => { fired.current = false; setHolding(true); timer.current = setTimeout(() => { fired.current = true; setHolding(false); onHold(); }, 600); };
  const stop = () => { clearTimeout(timer.current); setHolding(false); };
  return (
    <div className={className} onPointerDown={start} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop}
      onContextMenu={e => e.preventDefault()}
      onClickCapture={e => { if (fired.current) { e.stopPropagation(); e.preventDefault(); fired.current = false; } }}
      onClick={onTap} role={onTap ? "button" : undefined}
      style={{ position: "relative", overflow: "hidden", touchAction: "manipulation", cursor: onTap ? "pointer" : undefined, userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none", ...style }}>
      {holding && <div className="holdfill" aria-hidden="true" />}
      {children}
    </div>
  );
}

/* A hello on Home: a new line each time the app opens, never the same one twice in a row. */
function breakTarget(p) {
  const hi = p && p.hi != null ? Number(p.hi) : null;
  if (hi == null || (p.hk === "est" && hi >= 54)) return "break 120";
  if (hi >= 26) return "break 100";
  if (hi >= 16) return "break 90";
  if (hi >= 6) return "break 80";
  return "go under par";
}
let GREET = null;
function greeting(p) {
  const lines = [
    n => ["Who's taking your money today, ", n, "?"],
    n => [`Ready to ${breakTarget(p)}, `, n, "?"],
    n => ["Glorious day to lose some balls ay, ", n, "?"],
    n => ["Fingers crossed, no 4-putts today, ", n, "?"],
    n => ["Bank early, bank often, ", n, "."],
    n => ["Somebody's busting today. Not you, ", n, "."],
    n => ["Who's shouting the first round, ", n, "?"],
    n => ["Keep it on the short stuff today, ", n, "."],
  ];
  if (new Date().getHours() < 11) lines.push(n => ["Morning, ", n, ". Coffee first, then birdies."]);
  if (GREET == null || GREET >= lines.length) {
    let last = -1; try { last = Number(localStorage.getItem("puntaro.greet") ?? -1); } catch (e) { /* storage is optional */ }
    GREET = Math.floor(Math.random() * (lines.length - 1)); if (GREET >= last && last >= 0) GREET += 1;
    if (GREET >= lines.length) GREET = 0;
    try { localStorage.setItem("puntaro.greet", String(GREET)); } catch (e) { /* storage is optional */ }
  }
  const name = String((p && p.first) || "").trim().split(/\s+/)[0] || "mate";
  return lines[GREET](name);
}
function Home({ people, round, recent, board, onOpenRound, onStart, onJoin, liveCode, onLiveDetails, parked = [], onResumeParked, onDropParked, onResume, goFriends, dark, setDark, askDelete, onRules, onAbout, trash, now, onRestore }) {
  return (
    <div style={{ paddingBottom: 19 }}>
      <div className="stripes" style={{ padding: "17px 14px 44px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 700 }}>
          <Tiles size={20} hang toy />
          <button className="pill px" onClick={onAbout} aria-label="About this alpha" style={{ background: "var(--flag)", color: "var(--dk)", padding: "1px 7px", fontSize: 15 }}>ALPHA</button>
          <button className="px" aria-label="Rules" onClick={onRules} style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, background: "var(--card)", color: "var(--ink)", border: "3px solid var(--night)", boxShadow: "3px 3px 0 var(--night)", padding: "5px 10px", fontSize: 18, lineHeight: 1 }}><BookIcon size={16} />RULES</button>
        </div>
        <div style={{ marginTop: 14 }}>
          <p className="greet" style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.3 }}>{(([a, n, b]) => <>{a}<b className="hd">{n}</b>{b}</>)(greeting(people.me))}</p>
          <p style={{ fontWeight: 600, marginTop: 4, opacity: .85 }}>HCP {fmtHcp(people.me)}</p>
        </div>
      </div>
      <div style={{ padding: "0 12px", marginTop: -36, display: "grid", gap: 11 }}>
        <button onClick={onStart} style={{ background: "var(--flag)", color: "var(--dk)", borderRadius: 24, padding: "16px 16px", textAlign: "left", display: "flex", alignItems: "center", gap: 11, boxShadow: "0 6px 0 var(--night)", border: "3px solid var(--night)" }}>
          <WaveFlag />
          <div>
            <div className="hd" style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.4 }}>Start a round</div>
            <div style={{ fontSize: 13, opacity: 0.8 }}>Pick the course and your group.</div>
          </div>
        </button>

        <button onClick={onJoin} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", textAlign: "left", width: "100%", background: "var(--pine)", color: "#F4F0E6", border: "3px solid var(--night)", boxShadow: "0 5px 0 var(--night)" }}>
          <div style={{ width: 44, height: 44, flex: "none", display: "grid", placeItems: "center", background: "#F4F0E6", color: "var(--pine)", border: "3px solid var(--night)" }}><QrIcon size={26} /></div>
          <div style={{ flex: 1 }}><div className="hd" style={{ fontSize: 17, fontWeight: 800 }}>Join a live round</div><div style={{ fontSize: 13, opacity: 0.85 }}>A mate started the round? Scan their QR or type the code.</div></div>
          <ChevronRight size={22} />
        </button>


        {round && (
          <HoldRow className="card" onHold={() => askDelete("round")} style={{ padding: 12 }}>
            <div className="cap" style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>Round in progress{round.sample && <span className="pill px" style={{ background: "var(--mint)", color: "var(--dk)", padding: "1px 6px", fontSize: 13 }}>SAMPLE</span>}{liveCode && <button className="pill px" onClick={onLiveDetails} aria-label="Show join code" style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 5, background: "var(--red)", borderColor: "var(--red)", color: "#fff", padding: "2px 8px", fontSize: 15 }}><span className="blink" style={{ width: 6, height: 6, background: "#fff", display: "block" }} />LIVE</button>}</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 3 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800 }}>{round.course.name}</h3>
              <span style={{ fontWeight: 700 }}>Hole {round.hole + 1} of 18</span>
            </div>
            {round.stake > 0 && <p className="cap" style={{ marginTop: 8 }}>Buy-in {money(round.stake)} each. Pool {money(round.stake * round.playerIds.length)}.</p>}
            <button className="cta" style={{ marginTop: 11, padding: 11, fontSize: 14 }} onClick={onResume}>Resume scoring</button>
            <p className="cap" style={{ marginTop: 5, textAlign: "center" }}>Hold to delete this round.</p>
          </HoldRow>
        )}

        {parked.length > 0 && (
          <div>
            <div style={{ margin: "5px 2px 6px" }}><h2 className="h2">Paused rounds</h2><p className="cap" style={{ marginTop: 2 }}>Kept for 24 hours after you started another round.</p></div>
            <div className="card" style={{ padding: "5px 11px" }}>
              {parked.map((x, i) => {
                const left = Math.max(0, PARK_MS - (Date.now() - x.at)); const hrs = Math.floor(left / 3600000); const mins = Math.floor((left % 3600000) / 60000);
                return (
                  <div key={x.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 0", borderTop: i ? "1px solid var(--line)" : "none" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>{x.round.course.name}{x.live && <span className="pill px" style={{ background: "var(--red)", borderColor: "var(--red)", color: "#fff", padding: "1px 6px", fontSize: 13 }}>LIVE</span>}</div>
                      <div className="cap">Hole {x.round.hole + 1} of 18 · {hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`} left</div>
                    </div>
                    <button className="chip" onClick={() => onResumeParked(x)}>Resume</button>
                    <button onClick={() => onDropParked(x)} aria-label={`Delete paused round at ${x.round.course.name}`} style={{ padding: 4, color: "var(--muted)" }}><X size={18} /></button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {trash.filter(x => x.kind === "round").length > 0 && (
          <div>
            <div style={{ margin: "5px 2px 6px" }}><h2 className="h2">Recently deleted</h2><p className="cap" style={{ marginTop: 2 }}>Kept for 5 minutes, then gone for good.</p></div>
            <div className="card" style={{ padding: "5px 11px" }}>
              {trash.filter(x => x.kind === "round").map((x, i) => {
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

      </div>
      <button className="pt-foot" onClick={onAbout} aria-label="About this alpha">
        <Tiles size={15} />
        <span className="cap" style={{ color: "inherit" }}>Alpha {APP_VERSION}. Bank it or bust.</span>
      </button>
    </div>
  );
}

// Finished rounds: tap for the scoresheet, hold to remove (stats keep it).
function History({ recent, askDelete, onOpenRound, trash, now, onRestore }) {
  const gone = trash.filter(x => x.kind !== "round");
  return (
    <div style={{ paddingBottom: 19 }}>
      <div className="stripes" style={{ padding: "20px 16px 18px" }}><h1>Round history</h1></div>
      <div style={{ padding: 12, display: "grid", gap: 11 }}>
        {gone.length > 0 && (
          <div>
            <div style={{ margin: "0 2px 6px" }}><h2 className="h2">Recently deleted</h2><p className="cap" style={{ marginTop: 2 }}>Kept for 5 minutes, then gone for good.</p></div>
            <div className="card" style={{ padding: "5px 11px" }}>
              {gone.map((x, i) => {
                const left = Math.max(0, Math.ceil((TRASH_MS - (now - x.at)) / 1000));
                return (
                  <div key={x.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "9px 0", borderTop: i ? "1px solid var(--line)" : "none" }}>
                    <div style={{ minWidth: 0 }}><div style={{ fontWeight: 700 }}>{x.item.course}</div><div className="cap">{x.item.when} · {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")} left</div></div>
                    <button className="chip" onClick={() => onRestore(x)}>Restore</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div>
          <div style={{ margin: "5px 2px 6px" }}><h2 className="h2">Your rounds</h2><p className="cap" style={{ marginTop: 2 }}>Tap a round for its scoresheet. Hold to remove it from this list (your stats keep it).</p></div>
          <div className="card" style={{ padding: "5px 11px" }}>
            {recent.length === 0 && <div className="cap" style={{ padding: "9px 0" }}>No rounds yet. Finish one and it shows up here.</div>}
            {recent.map((r, i) => (
              <HoldRow key={r.id || i} onHold={() => askDelete("recent", i)} onTap={r.id ? () => onOpenRound(r.id) : undefined} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", borderTop: i ? "1px solid var(--line)" : "none" }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{r.course}</div>
                  <div className="cap">{r.sample ? "Sample round. " : `${r.when}. `}{r.note}</div>
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
          <p className="cap">Sandy, up and down and barkie only count with net par or better. A chip-in is the best shot in golf, so it counts on any hole except a bust. Sandy, up and down and chip-in can't stack: a sandy is already an up and down from the sand, and a chip-in has no putt. Nearest the pin is won off the tee, so it also counts whatever you score, except on a bust.</p>
          <div className="cap" style={{ fontWeight: 700, marginTop: 4 }}>Penalties</div>
          {ev("penalty").map(e => <RuleRow key={e.name} k={e.tag} v={e.hint} />)}
          <p className="cap">Penalties hit before you bank, so you can't bank to dodge one. They never touch banked points.</p>
        </RuleSection>
        <RuleSection title="Nearest the pin">
          <p>On a par 3, the closest ball earns +3 in their pot. Pick the winner on the hole, or tap Nobody if no one found the pin. You can't move to the next hole until that's done. If the winner busts the hole, the +3 is lost.</p>
        </RuleSection>
        <RuleSection title="Playing live">
          <p>Turn on Play live when you set up a round. Your mates scan the QR code on your screen (or type the join code) and pick which player they are. Everyone sees scores and pots as they happen.</p>
          <p><b>Everyone scores:</b> each player enters their own score and makes their own bank calls. Anyone can fill in a score for a player whose phone is off, and it's marked with who entered it. Changing a score on a finished hole marks it "edited".</p>
          <p><b>Secret bank calls:</b> in Everyone scores, your bank call is hidden from the group. It locks when you move to the next hole. Once everyone has moved on, all the calls for that hole are revealed together. Card holes are dealt after that reveal.</p>
          <p><b>One scorer:</b> the host enters everything and everyone else watches. The host can switch modes mid-round, and everyone is told.</p>
          <p className="cap">Phone died? The host can free that player's seat so the round isn't held up.</p>
        </RuleSection>
        <RuleSection title="Prize pool">
          <p>Agree a buy-in before you tee off. Payout is winner takes all, 60/30/10, or wooden spoon (last place pays the rest).</p>
          <p>Nobody can lose more than their buy-in. The app shows who owes who at the end but never moves money.</p>
        </RuleSection>
        <RuleSection title="Handicaps">
          <p>Your handicap index is adjusted for the course's slope and rating to give strokes on the hardest holes. Everything in Puntaro uses those net scores. The Comp, your normal scorecard result, runs alongside it.</p>
        </RuleSection>
        <p className="cap" style={{ margin: "10px 2px 0" }}>Bonuses, penalties and nearest the pin can each be switched off when you set up a round. Cards, catch-up odds and the handicap cushion are always part of the game.</p>
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
async function overpass(q, ms = 15000) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
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
const NOMINATIM = "https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=15&q=";
const isGolf = r => r.type === "golf_course" || r.class === "leisure" && r.type === "golf_course";
const nomCourse = (r, lat, lon) => ({
  osm: `${r.osm_type}-${r.osm_id}`, type: r.osm_type, id: r.osm_id, name: r.name || r.display_name.split(",")[0],
  lat: +r.lat, lon: +r.lon, dist: lat == null ? null : kmBetween(lat, lon, +r.lat, +r.lon), place: (a => [a.suburb || a.town || a.village || a.city, a.state].filter(Boolean).join(", "))(r.address || {}) || r.display_name.split(", ").slice(1, 3).join(", "),
});
let nomNext = 0; // the map service asks for no more than one request a second, from anywhere in the app
async function nominatim(path) {
  const wait = nomNext - Date.now(); nomNext = Math.max(Date.now(), nomNext) + 1000;
  if (wait > 0) await new Promise(ok => setTimeout(ok, wait));
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
// Which country to search first: from the phone's region or time zone (en-AU, Australia/Melbourne -> au).
function homeCountry() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (/^Australia\//.test(tz)) return "au";
    if (/^Pacific\/Auckland|^NZ/.test(tz)) return "nz";
    const langs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ""];
    for (const l of langs) { const m = /-([A-Za-z]{2})$/.exec(l); if (m) return m[1].toLowerCase(); }
  } catch (e) { /* fall through */ }
  return "";
}
const isPlace = r => r.class === "place" || r.class === "boundary";
// Type a course name or a town. Golf courses that match come back as a list (home country first);
// otherwise a town becomes a nearby search, named so you can see where it looked.
async function searchPlaces(q) {
  const cc = homeCountry();
  const words = q.toLowerCase().replace(/\b(golf|club|course|links|country)\b/g, " ").split(/[^a-z0-9']+/).filter(Boolean);
  const run = async where => {
    const extra = where ? `&countrycodes=${where}` : "";
    const ask = t => nominatim(encodeURIComponent(t) + extra).catch(() => []);
    const base = /golf/i.test(q) ? q : `${q} golf`;
    // one at a time, stopping once courses turn up
    const a = await ask(base); if (a.some(isGolf)) return { golf: a.filter(isGolf), all: a };
    const c = await ask(q); return { golf: c.filter(isGolf), all: [...c, ...a] };
  };
  let r = await run(cc);
  if (cc && !r.golf.length && !r.all.some(isPlace)) r = await run("");
  if (r.golf.length) {
    const seen = new Set();
    const score = c => { const n = c.name.toLowerCase(); return words.filter(w => n.includes(w)).length; };
    const list = r.golf.map(x => nomCourse(x)).filter(c => (seen.has(c.osm) ? false : seen.add(c.osm)));
    return { courses: list.sort((x, y) => score(y) - score(x)).slice(0, 10) };
  }
  const town = r.all.find(isPlace) || r.all[0];
  if (!town) throw new Error("notfound");
  return { town: { lat: +town.lat, lon: +town.lon, name: town.display_name.split(", ").slice(0, 2).join(", ") } };
}
async function loadOsmHoles(c) {
  if (c.type === "node") return null;
  const area = (c.type === "relation" ? 3600000000 : 2400000000) + c.id;
  const hk = "holes:" + c.osm; const hh = cacheGet(hk);
  const j = hh ? { elements: hh } : await overpass(`[out:json][timeout:12];area(${area})->.a;way["golf"="hole"](area.a);out tags;`, 5000);
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
  const [where, setWhere] = useState("");

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
    setWhere("Near you");
    navigator.geolocation.getCurrentPosition(p => near(p.coords.latitude, p.coords.longitude), () => { setBusy(""); setMsg("Location is off or blocked. Type a town below instead."); }, { timeout: 10000, maximumAge: 3600000, enableHighAccuracy: false });
  };
  const search = async () => {
    if (!q.trim()) return;
    setBusy("Searching…"); setMsg("");
    try {
      const r = await searchPlaces(q.trim());
      if (r.courses) { setResults(r.courses); setWhere(`Golf courses matching "${q.trim()}"`); setBusy(""); }
      else { await near(r.town.lat, r.town.lon); setWhere(`No course called "${q.trim()}" found, so here's what's near ${r.town.name}`); }
    } catch (e) { setBusy(""); setMsg(e.message === "notfound" ? "Couldn't find that place or course. Try the town name, or add it by hand." : "Couldn't reach the map service. Check your connection, or add the course by hand."); }
  };
  const choose = async c => {
    const id = "osm-" + c.osm;
    const have = saved.find(s => s.id === id);
    if (have) { onPick(have); return; }
    setBusy("Checking the map for hole details (up to 5 seconds)…");
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
          <input aria-label="Search by town" placeholder="Course name or town, e.g. Woodlands" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === "Enter" && search()} style={inp} />
          <button className="chip" onClick={search} disabled={!!busy} aria-label="Search"><Search size={18} /></button>
        </div>
        {busy && <p className="cap" role="status">{busy}</p>}
        {msg && <p role="alert" style={{ color: "var(--red)", fontWeight: 600 }}>{msg}</p>}
        {results && results.length > 0 && (
          <div>
            <div className="cap" style={{ marginBottom: 4 }}>{where || "Courses found"} (from OpenStreetMap)</div>
            <div style={{ display: "grid", gap: 6 }}>
              {results.map(c => (
                <button key={c.osm} className="card" onClick={() => choose(c)} style={{ padding: "9px 11px", textAlign: "left", display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontWeight: 700 }}>{c.name}</span><span className="cap" style={{ textAlign: "right" }}>{c.dist == null ? c.place : `${c.dist < 10 ? c.dist.toFixed(1) : Math.round(c.dist)} km`}</span>
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

function AboutSheet({ onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, maxWidth: 430, margin: "0 auto", zIndex: 40, display: "flex", alignItems: "flex-end", background: "rgba(0,0,0,.6)" }} onClick={onClose}>
      <div className="sheet card" role="dialog" aria-label={`About ${APP_NAME}`} onClick={e => e.stopPropagation()} style={{ width: "100%", padding: 12, boxShadow: "none", maxHeight: "85vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 className="h2" style={{ display: "flex", alignItems: "center", gap: 10 }}><Tiles size={18} /><span className="pill" style={{ background: "var(--flag)" }}>ALPHA {APP_VERSION}</span></h2>
          <button onClick={onClose} aria-label="Close"><X size={22} /></button>
        </div>
        <div style={{ display: "grid", gap: 8, marginTop: 10, fontSize: 14 }}>
          <p>A side game for your round. Score as normal, bank your points, or push your luck and risk going bust.</p>
          <p>Play live together. Everyone follows on their own phone: scan the host's QR code or type the join code.</p>
          <p>Blessings and curses on the hardest and easiest holes keep everyone in it.</p>
          <p>No handicap? Pick what you usually shoot, and Puntaro works one out from your rounds.</p>
          <p>Add friends with your code or QR to see their stats and pick them for a round.</p>
          <p>Your rounds and stats are saved to your account, so they follow you to any phone. Friends only see your first name, last initial, handicap and stats.</p>
          <p>The prize pool is just a scoreboard. Puntaro never takes or moves money.</p>
          <p className="cap">Not connected to Golf Australia. Puntaro handicaps aren't official handicaps.</p>
        </div>
      </div>
    </div>
  );
}

const MAXP = 8;
const EXTRA_INFO = {
  bonuses: ["Bonuses", "Sandy x2, up and down +2, chip-in +4, barkie +2."],
  ntp: ["Nearest the pin", "Closest to the pin on a par 3 earns +3. You pick the winner before moving on."],
  penalties: ["Penalties", "Lost ball -3, wet one -2, four putt halves your pot."],
};
function Setup({ people, friendIds, saved, onSaveCourse, onAddGuest, onForgetGuest, friendKit, onBack, onGo }) {
  const [course, setCourse] = useState(COURSES[0]);
  const [liveOn, setLiveOn] = useState(false);
  const [scoring, setScoring] = useState("each");
  const [liveName, setLiveName] = useState(people.me.first || "");
  const [teeI, setTeeI] = useState(0);
  const [finding, setFinding] = useState(false);
  const [sel, setSel] = useState(() => ["me", ...friendIds.filter(id => people[id]).slice(0, 3)]);
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
  const [forgot, setForgot] = useState(null); // the guest just removed from the list, so it can be put back
  useEffect(() => { if (!forgot) return undefined; const t = setTimeout(() => setForgot(null), 10000); return () => clearTimeout(t); }, [forgot]);
  const forget = id => { onForgetGuest(id, true); setSel(s => s.filter(x => x !== id)); setForgot({ id, name: people[id].name }); };
  const unforget = () => { if (forgot) onForgetGuest(forgot.id, false); setForgot(null); };
  const pickList = [...friendIds, ...Object.keys(people).filter(id => people[id].guest && !people[id].forgot)].filter(id => people[id] && people[id].name.toLowerCase().includes(q.trim().toLowerCase()));
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
              <div className="hd" style={{ fontWeight: 800, fontSize: 15 }}>{course.name}</div>
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
                <div className="hd" style={{ fontWeight: 700 }}>{people[id].name}</div>
                <div className="cap">HCP {fmtHcp(people[id])}{people[id].guest ? " · guest" : ""}</div>
              </div>
              {effMode === "2v2" && (
                <button className="pill" aria-label={`${people[id].name} team ${teamOf(id) + 1}, tap to switch`} onClick={() => setTeam(id, 1 - teamOf(id))} style={{ background: teamOf(id) ? "var(--mint)" : "var(--flag)", color: "var(--dk)" }}>Team {teamOf(id) + 1}</button>
              )}
              {id !== "me" && <button aria-label={`Remove ${people[id].name}`} onClick={() => removePlayer(id)}><X size={18} /></button>}
            </div>
          ))}
        </div>
        <div className="seg" style={{ marginTop: 8 }}>
          <button className="chip" disabled={sel.length >= MAXP} onClick={() => setSheet("friend")}>+ Friend</button>
          <button className="chip" disabled={sel.length >= MAXP} onClick={() => setSheet("guest")}>+ Guest</button>
        </div>

        <Label sub={sel.length === 4 ? "Everyone plays their own Puntaro. In 2v2 the team totals decide it." : "2v2 needs exactly four players."}>Format</Label>
        <div className="seg">
          <button className={`chip ${effMode === "ffa" ? "on" : ""}`} onClick={() => setMode("ffa")}>Free for all</button>
          <button className={`chip ${effMode === "2v2" ? "on" : ""}`} disabled={sel.length !== 4} onClick={() => { setMode("2v2"); setTeams(Object.fromEntries(sel.map((id, i) => [id, i < 2 ? 0 : 1]))); }} style={{ opacity: sel.length === 4 ? 1 : 0.5 }}>2v2</button>
          {effMode === "2v2" && <button className="chip" onClick={autoBalance}>Auto-balance by handicap</button>}
        </div>
        {effMode === "2v2" && teamCount !== 2 && <p className="cap" role="alert" style={{ color: "var(--red)", fontWeight: 600, marginTop: 5 }}>Two players per team. Tap a Team pill to switch someone.</p>}

        {sheet === "friend" && (
          <Sheet title="Add a friend" onClose={() => { setSheet(null); setQ(""); setForgot(null); }}>
            <input aria-label="Search friends" placeholder="Search your friends and past guests" value={q} onChange={e => setQ(e.target.value)} style={inp} />
            <div style={{ marginTop: 8 }}>
              {pickList.length === 0 && <p className="cap">No one matches. Try a guest instead.</p>}
              {pickList.map((id, i) => (
                <div key={id} style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 0", borderTop: i ? "1px solid var(--line)" : "none" }}>
                  <Avatar p={people[id]} size={28} />
                  <div style={{ flex: 1 }}><div className="hd" style={{ fontWeight: 700 }}>{people[id].name}</div><div className="cap">HCP {fmtHcp(people[id])}{people[id].guest ? " · guest" : ""}</div></div>
                  <button className="chip" disabled={sel.includes(id) || sel.length >= MAXP} onClick={() => addPlayer(id)}>{sel.includes(id) ? "Added" : "Add"}</button>
                  {people[id].guest && <button aria-label={`Remove ${people[id].name} from recent guests`} onClick={() => forget(id)} style={{ padding: 6, marginRight: -6, color: "var(--muted)" }}><X size={18} /></button>}
                </div>
              ))}
            </div>
            {friendKit && <button className="chip" onClick={() => { setSheet("invite"); setQ(""); setForgot(null); }} style={{ marginTop: 10, width: "100%", padding: "9px 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontWeight: 700 }}><QrIcon size={18} />Add a new friend: QR or code</button>}
            {forgot && (
              <div role="status" style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10, background: "var(--night)", color: "#FBF6EA", padding: "9px 12px", border: "3px solid var(--night)" }}>
                <div style={{ flex: 1, fontWeight: 600 }}>{forgot.name} removed from recent guests.</div>
                <button onClick={unforget} style={{ fontWeight: 800, color: "var(--flag)", padding: "2px 4px" }}>Undo</button>
              </div>
            )}
          </Sheet>
        )}
        {sheet === "invite" && friendKit && <AddFriendSheet people={people} friendIds={friendIds} {...friendKit} onClose={() => setSheet("friend")} />}
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
                  <div style={{ flex: 1, fontWeight: 600 }}>{people[id].name} <span className="cap">HCP {fmtHcp(people[id])}</span></div>
                  <div style={{ fontWeight: 800 }}>{courseHcp(people[id].hi, cinfo)} <span className="cap" style={{ fontWeight: 400 }}>strokes</span></div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Label sub="Cards, catch-up odds and the handicap cushion are always part of the game. These three are up to your group.">Extras</Label>
        <div className="seg">
          <button className={`chip ${!showCustom && extraKeys.every(k => opts[k]) ? "on" : ""}`} onClick={() => { setExtras(true); setShowCustom(false); }}>Everything</button>
          <button className={`chip ${!showCustom && extraKeys.every(k => !opts[k]) ? "on" : ""}`} onClick={() => { setExtras(false); setShowCustom(false); }}>Keep it simple</button>
          <button className={`chip ${showCustom ? "on" : ""}`} aria-expanded={showCustom} onClick={() => setShowCustom(s => !s)}>Customise</button>
        </div>
        <p className="cap" style={{ marginTop: 6 }}>{extraKeys.filter(k => opts[k]).length === 0 ? "Just the core game. Fewest taps for the scorer." : `On: ${extraKeys.filter(k => opts[k]).map(k => EXTRA_INFO[k][0].toLowerCase()).join(", ")}.`}</p>
        {showCustom && (
          <div className="card" style={{ padding: "3px 11px", marginTop: 8 }}>
            {extraKeys.map((k, i) => (
              <div key={k} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 9, padding: "8px 0", borderTop: i ? "1px solid var(--line)" : "none" }}>
                <div><div className="hd" style={{ fontWeight: 700, fontSize: 15 }}>{EXTRA_INFO[k][0]}</div><div className="cap">{EXTRA_INFO[k][1]}</div></div>
                <Toggle on={opts[k]} onChange={v => setOpts(o => ({ ...o, [k]: v }))} />
              </div>
            ))}
          </div>
        )}

        <Label sub="Agree a buy-in before you tee off. The app tracks who owes who and never moves money.">Prize pool</Label>
        <div className="card" style={{ padding: 12 }}>
          <div className="cap" style={{ fontWeight: 600 }}>Buy-in per player</div>
          <div className="seg" style={{ marginTop: 6 }}>
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
                  <div className="seg" style={{ marginTop: 6 }}>
                    {SPLITS.map(([k, l]) => <button key={k} className={`chip ${split === k ? "on" : ""}`} onClick={() => setSplit(k)}>{l}</button>)}
                  </div>
                </>}
              <div style={{ marginTop: 11, borderTop: "1px solid var(--line)", paddingTop: 9, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div><div style={{ fontWeight: 800, fontSize: 14 }}>Pool {money(stake * sel.length)}</div><div className="cap">The most anyone can lose is their {money(stake)} buy-in.</div></div>
              </div>
            </>
          )}
        </div>

        <Label sub="Everyone follows the round on their own phone. They join with a code.">Play live</Label>
        <div className="card" style={{ padding: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 9 }}>
            <div><div style={{ fontWeight: 800, fontSize: 14 }}>Live round</div><div className="cap">{liveOn ? "You'll get a join code to share at the tee." : "Off. This round stays on this phone."}</div></div>
            <Toggle on={liveOn} onChange={setLiveOn} />
          </div>
          {liveOn && (
            <div style={{ marginTop: 11, borderTop: "1px solid var(--line)", paddingTop: 9 }}>
              <div className="cap" style={{ fontWeight: 600 }}>Your name for the group</div>
              <input aria-label="Your name for the group" placeholder="First name" maxLength={20} value={liveName} onChange={e => setLiveName(e.target.value)} style={{ ...inp, width: "100%", marginTop: 6, marginBottom: 11 }} />
              <div className="cap" style={{ fontWeight: 600 }}>Who enters scores</div>
              <div className="seg" style={{ marginTop: 6 }}>
                <button className={`chip ${scoring === "each" ? "on" : ""}`} onClick={() => setScoring("each")}>Everyone scores</button>
                <button className={`chip ${scoring === "one" ? "on" : ""}`} onClick={() => setScoring("one")}>One scorer</button>
              </div>
              <p className="cap" style={{ marginTop: 6 }}>{scoring === "each" ? "Each player enters their own score and makes their own bank calls. Anyone can fill in for a player whose phone is off." : "You enter every score and bank call. Everyone else watches live."}</p>
            </div>
          )}
        </div>

      </div>
      <div style={{ position: "sticky", bottom: 0, padding: "9px 12px 14px", background: "linear-gradient(to top, var(--chalk) 70%, transparent)" }}>
        <button className="cta" disabled={sel.length < 2 || (effMode === "2v2" && teamCount !== 2)} onClick={() => onGo({ mode: effMode, teams: effMode === "2v2" ? Object.fromEntries(sel.map(id => [id, teamOf(id)])) : null, course: { name: course.name, tee: tee.name, slope: tee.slope, rating: tee.rating, par: cpar }, holes: course.holes, playerIds: sel, games, useHcp, stake, split, opts, live: liveOn ? { scoring, name: liveName.trim() } : null })}>{liveOn ? "Tee off live" : "Tee off"}</button>
      </div>
    </div>
  );
}

function Round({ round, people, api, rowFx = {}, onBack, onFinish, onRules, onLive }) {
  const can = useContext(LiveCtx);
  const [gtab, setGtab] = useState(round.games[0] || null);
  const h = round.hole; const ids = round.playerIds;
  const pc = round.games.includes("punt") ? puntCalc(round) : null;
  const [lastCall, setLastCall] = useState(false);
  const [again, setAgain] = useState(false);
  const cardsHere = !!pc && round.opts.cards && cardHole(h) && !!round.draws[h];
  const showReveal = cardsHere && (!round.seen[h] || again);
  const nextIsCard = !!pc && round.opts.cards && h < 17 && cardHole(h + 1) && !round.draws[h + 1];
  const ntpHole = !!pc && round.opts.ntp && PAR[h] === 3;
  const ntpMissing = ntpHole && !round.ntp[h] && can.score();
  // Leaving a par 3 with no nearest-the-pin pick: ask first, then carry on where they were going.
  const [ntpAsk, setNtpAsk] = useState(null);
  const blocked = then => { if (!ntpMissing) return false; HAPTIC.buzz(30); setNtpAsk({ then }); return true; };
  const goNext = () => { if (blocked("next")) return; if (nextIsCard) { HAPTIC.buzz(15); celebrateHole(h); setLastCall(true); } else { HAPTIC.buzz(20); api.setHole(Math.min(17, h + 1)); } };
  // A new hole starts at the top of the page, so it's obvious the hole changed and its notices are seen.
  const firstHole = useRef(true);
  useEffect(() => {
    if (firstHole.current) { firstHole.current = false; return; }
    try { window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); } catch (e) { window.scrollTo(0, 0); }
  }, [h]);
  /* heads-up strips at the top of the hole, for the scorer to read out */
  const notices = [];
  if (pc && round.opts.cards && cardHole(h) && !round.draws[h] && can.live && !can.canDeal(h)) notices.push({ key: "wait", icon: "star", isize: 3, title: `${SI[h] === 1 ? "Hardest" : "Easiest"} hole: cards coming`, text: `Cards are dealt once everyone has moved on to this hole and the last bank calls are revealed.${can.waitingOn && can.waitingOn(h).length ? ` Waiting for ${can.waitingOn(h).join(", ")} to move on.` : ""}` });
  if (cardsHere) notices.push({ key: "cards", icon: "star", isize: 3, title: `${SI[h] === 1 ? "Hardest" : "Easiest"} hole: cards are out`, text: "Everyone drew a blessing or a curse. Banks from the last hole are locked.", action: ["Show cards", () => setAgain(true)] });
  if (nextIsCard) notices.push({ key: "bank", icon: "c_vault", isize: 2, urgent: true, title: `Next hole is the ${SI[h + 1] === 1 ? "hardest" : "easiest"}: last chance to bank`, text: "Everyone draws a card at the tee, then banks lock. Ask each player now.", action: ["Review banks", () => setLastCall(true)] });
  /* Big moments play when you leave a hole, for the final scores: all the good news on one screen, then the bad. */
  const holeEvents = hh => {
    const good = [], bad = [];
    if (!pc) return { good, bad };
    ids.forEach(id => {
      const v = round.scores[id][hh]; if (v == null) return;
      const st = pc[id]; const sc = v - PAR[hh]; const bu = st.bustAt[hh];
      if (bu && bu.lost + (bu.kept || 0) > 0) bad.push({ id, kind: "bust", lost: bu.lost, kept: bu.kept || 0 });
      const k = v === 1 && PAR[hh] > 2 ? "ace" : sc <= -3 ? "albatross" : sc === -2 ? "eagle" : sc === -1 ? "birdie" : null;
      if (k) good.push({ id, kind: k });
      const m = st.multAt[hh] || 0, pm = hh > 0 && st.multAt[hh - 1] ? st.multAt[hh - 1] : 1;
      if (!bu && m > 1 && m > pm) good.push({ id, kind: m >= 3 ? "fire" : "roll", x: m });
    });
    return { good, bad };
  };
  const celebrateHole = hh => {
    const ev = holeEvents(hh); const key = `${round.drawSeed}:${hh}`; const sig = JSON.stringify(ev);
    if (PLAYED.get(key) === sig) return; PLAYED.set(key, sig);
    if (ev.good.length || ev.bad.length) api.moments(holeScreens(ev, hh, people));
  };
  const prevH = useRef(h);
  useEffect(() => { if (h > prevH.current) celebrateHole(prevH.current); prevH.current = h; }, [h]); // eslint-disable-line react-hooks/exhaustive-deps
  const bump = (id, d) => {
    const cur = round.scores[id][h];
    const val = cur == null ? PAR[h] : Math.min(12, Math.max(1, cur + d));
    // Just a blip here: the big moments wait until you leave the hole (celebrateHole), so stepping through scores can't set them off.
    try { if (d > 0) SFX.down(); else SFX.up(); } catch (e) { /* sound is optional */ }
    api.setScore(id, h, val);
  };
  const StepBtn = ({ onClick, label, children, plus }) => (
    <button onClick={onClick} aria-label={label} style={{ width: 38, height: 38, border: "3px solid var(--night)", display: "grid", placeItems: "center", background: plus ? "var(--pine)" : "var(--chalk)", color: plus ? "#F4F0E6" : "var(--ink)", flex: "none" }}>{children}</button>
  );
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <div className="stripes" style={{ padding: "9px 12px 11px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button onClick={onBack} aria-label="Back" style={{ display: "flex", alignItems: "center", gap: 4, minHeight: 44 }}><ChevronLeft size={22} /><Tiles size={15} /></button>
          <div style={{ display: "flex", gap: 6 }}>
            {can.live && <button className="px" onClick={onLive} aria-label="Live round details" style={{ fontSize: 18, lineHeight: 1, background: "var(--red)", color: "#fff", padding: "6px 9px", display: "flex", alignItems: "center", gap: 5 }}><span className="blink" style={{ width: 7, height: 7, background: "#fff", display: "block" }} />LIVE</button>}
            <button className="px" aria-label="Rules" onClick={onRules} style={{ fontSize: 18, lineHeight: 1, background: "rgba(255,255,255,.16)", borderRadius: 999, padding: "6px 11px" }}>RULES</button>
            <button className="px" aria-label="Finish" onClick={onFinish} style={{ fontSize: 18, lineHeight: 1, background: "rgba(255,255,255,.16)", borderRadius: 999, padding: "6px 11px" }}>FINISH</button>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 11 }}>
          <button onClick={() => api.setHole(Math.max(0, h - 1))} aria-label="Previous hole" disabled={h === 0} style={{ width: 38, height: 38, background: "#F4F0E6", color: "#1B1C1A", border: "3px solid #1B1C1A", boxShadow: "3px 3px 0 #1B1C1A", display: "grid", placeItems: "center", opacity: h === 0 ? 0.35 : 1 }}><ChevronLeft size={26} /></button>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.9 }}>{round.course.name}</div>
            <div className="px holeno" aria-label={`Hole ${h + 1}`} style={{ fontSize: 50, lineHeight: .9, margin: "2px 0 2px" }}>{h + 1}</div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>Par {PAR[h]} · Index {SI[h]}</div>
          </div>
          <button onClick={goNext} aria-label="Next hole" disabled={h === 17} style={{ width: 38, height: 38, background: "#F4F0E6", color: "#1B1C1A", border: "3px solid #1B1C1A", boxShadow: "3px 3px 0 #1B1C1A", display: "grid", placeItems: "center", opacity: h === 17 ? 0.35 : 1 }}><ChevronRight size={26} /></button>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 11 }}>
          {range18.map(i => (
            <button key={i} onClick={() => (i === h + 1 ? goNext() : i > h && blocked(i) ? null : api.setHole(i))} aria-label={`Go to hole ${i + 1}`} style={{ width: 17, height: 24, display: "grid", placeItems: "center" }}>
              <span style={{ width: i === h ? 13 : 9, height: i === h ? 13 : 9, borderRadius: "50%", background: holeDone(round, i) ? "var(--flag)" : "rgba(255,255,255,.28)", boxShadow: i === h ? "0 0 0 2px #fff" : "none" }} />
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "9px 12px 75px", display: "grid", gap: 6, alignContent: "start" }}>
        {ntpHole && <NtpCard key={h} round={round} people={people} ids={ids} h={h} api={api} disabled={!can.score()} />}
        {notices.length > 0 && (
        <div style={{ position: "sticky", top: 0, zIndex: 6, display: "grid", gap: 6, padding: "6px 0", background: "var(--chalk)", borderBottom: "2px solid var(--night)" }}>
        {notices.map(n => (
          <div key={n.key} role="status" style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 8px", border: "3px solid var(--night)", background: n.urgent ? "var(--red)" : "var(--flag)", color: n.urgent ? "#fff" : "var(--dk)" }}>
            <div style={{ flex: "none", width: 28, display: "grid", placeItems: "center" }}><Sprite name={n.icon} size={n.isize} className={n.urgent ? "flick" : ""} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5, lineHeight: 1.2 }}>{n.title}</div>
              <div style={{ fontSize: 12, lineHeight: 1.28 }}>{n.text}</div>
            </div>
            {n.action && <button className="chip" onClick={n.action[1]} style={{ flex: "none", padding: "6px 9px", fontSize: 13, color: "var(--ink)" }}>{n.action[0]}</button>}
          </div>
        ))}
        </div>
        )}
        {can.live && !can.score() && <p className="cap" role="status" style={{ textAlign: "center", padding: "2px 0" }}>{can.live.hostName} is keeping score. You're watching live.</p>}
        <fieldset disabled={!can.score()} style={{ border: 0, padding: 0, margin: 0, minWidth: 0, display: "grid", gap: 6 }}>
        {ids.map(id => {
          const v = round.scores[id][h]; const st = round.useHcp ? strokesOn(round.hcp[id], h) : 0;
          const t = totalsFor(round, id); const n = netOf(round, id, h);
          const bust = pc && pc[id].bustAt[h]; const hot = pc && !bust && v != null && pc[id].mult > 1;
          return (
            <div key={id} className={`card ${bust ? "bust is-bust" : hot ? "hot" : ""}`} style={{ position: "relative", display: "flex", alignItems: "center", gap: 8, padding: "6px 7px 6px 9px", background: bust ? "var(--red)" : hot ? "var(--flag)" : "var(--card)" }}>
              <Avatar p={people[id]} size={30} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="hd" style={{ fontWeight: 700, fontSize: 15 }}>{people[id].name}{round.mode === "2v2" && round.teams && <span className="pill px" style={{ background: round.teams[id] ? "var(--mint)" : "var(--flag)", color: "var(--dk)", padding: "0 5px", fontSize: 13, marginLeft: 6 }}>T{round.teams[id] + 1}</span>}</div>
                <div className="cap" style={{ fontSize: 12, fontWeight: 600 }}>
                  {t.thru === 0 ? "Not started" : `${fmtPar(round.useHcp ? t.netPar : t.grossPar)} thru ${t.thru}`}
                  {v != null && round.useHcp && st > 0 ? `, net ${n} here` : ""}
                  {can.enteredBy && v != null && can.enteredBy(id, h) && <span>{` · by ${can.enteredBy(id, h)}`}</span>}
                  {can.edited && v != null && can.edited(id, h) && <span>{" · edited"}</span>}
                </div>
                {v != null && (() => { const n = scoreName(v, PAR[h]); return <span className="pill px" style={{ background: n.bg, padding: "1px 6px", fontSize: 13, marginTop: 3, marginRight: 4 }}>{n.label}</span>; })()}
                {pc && v != null && pc[id].potStart[h] != null && <span className="cap" style={{ fontWeight: 700, color: bust ? "#fff" : "var(--ink)", marginRight: 4 }}>Pot {pc[id].potStart[h]} → {pc[id].potAt[h] != null ? pc[id].potAt[h] : pc[id].pot}</span>}
                {(() => { const gap = round.scores[id].slice(0, h).findIndex(x => x == null); return gap >= 0 && t.thru > 0 ? <div className="cap" role="note" style={{ color: bust ? "#fff" : "var(--red)", fontWeight: 700 }}>No score on hole {gap + 1}. <button onClick={() => api.setHole(gap)} style={{ textDecoration: "underline", fontWeight: 700, color: "inherit" }}>Fill it in</button></div> : null; })()}
                {st > 0 && <span className="pill px" style={{ background: "var(--flag)", padding: "1px 6px", fontSize: 13, marginTop: 3 }}><Tip k="stroke">{st === 1 ? "GETS A STROKE" : `GETS ${st} STROKES`}</Tip></span>}
                {pc && v != null && !bust && /Safety net saved/.test(pc[id].log[h] || "") && <span className="pill px" style={{ background: "var(--mint)", padding: "1px 6px", fontSize: 13, marginTop: 3 }}>SAFETY NET SAVED THE POT</span>}
                {bust && <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}><Sprite name="skull" size={3} className="flick" /><span className="px blink" style={{ fontSize: 17 }}>BUST</span></div>}
                {hot && <div style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 3 }}>{Array.from({ length: pc[id].mult }).map((_, k) => <Sprite key={k} name="flame" size={3} className="flick" />)}<span className="px" style={{ fontSize: 17 }}>x{pc[id].mult}</span></div>}
              </div>
              {rowFx[id] && <div className="rowstamp" key={rowFx[id].key}><StampMark small word={rowFx[id].word} sub={rowFx[id].sub} color={rowFx[id].color} tilt={-8} /></div>}
              <StepBtn onClick={() => bump(id, -1)} label={`${people[id].name} minus one`}><Minus size={22} /></StepBtn>
              <ScoreMark v={v} par={PAR[h]} />
              <StepBtn plus onClick={() => bump(id, 1)} label={`${people[id].name} plus one`}><Plus size={22} /></StepBtn>
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
        </fieldset>
      </div>

      <div style={{ position: "sticky", bottom: 0, marginTop: "auto", padding: "9px 12px 14px", background: "linear-gradient(to top, var(--chalk) 70%, transparent)" }}>
        {h < 17
          ? <button className="cta" onClick={goNext}>Next hole<ChevronRight size={22} /></button>
          : <button className="cta" style={{ background: "var(--flag)", color: "var(--dk)" }} onClick={() => { if (!blocked("finish")) { celebrateHole(h); onFinish(); } }}>Finish round</button>}
      </div>
      {showReveal && <CardReveal key={h} round={round} people={people} h={h} onDone={() => { api.markSeen(h); setAgain(false); }} />}
      {ntpAsk && ntpMissing && (
        <div style={{ position: "fixed", inset: 0, maxWidth: 430, margin: "0 auto", zIndex: 31, display: "flex", alignItems: "flex-end", background: "rgba(0,0,0,.65)" }} onClick={() => setNtpAsk(null)}>
          <div className="sheet card" role="dialog" aria-label="Nearest the pin" onClick={e => e.stopPropagation()} style={{ width: "100%", padding: 12, boxShadow: "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Sprite name="flag" size={3} /><h2 className="h2">Who was nearest the pin?</h2></div>
            <p className="cap" style={{ margin: "3px 0 10px" }}>Hole {h + 1} is a par 3. Closest tee shot earns +3. Pick before moving on.</p>
            <NtpPick round={round} people={people} ids={ids} h={h} api={api} onPicked={() => {
              const t = ntpAsk.then; setNtpAsk(null);
              setTimeout(() => { if (t === "finish") onFinish(); else if (t === "next") { if (nextIsCard) setLastCall(true); else api.setHole(Math.min(17, h + 1)); } else if (typeof t === "number") api.setHole(t); }, 450);
            }} />
          </div>
        </div>
      )}
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
                    <div className="hd" style={{ flex: 1, fontWeight: 700 }}>{people[id].name}</div>
                    {mult > 1 && <span className="pill px" style={{ background: "var(--flag)", color: "var(--dk)", padding: "1px 6px", fontSize: 13 }}>X{mult} STREAK</span>}
                    <div style={{ minWidth: 54, textAlign: "right" }}><span style={{ fontWeight: 800, fontSize: 17 }}>{banking ? s.banked : potBefore}</span><span className="cap">{banking ? " banked" : " in pot"}</span></div>
                    <button className={`chip ${banking ? "on" : ""}`} aria-pressed={banking} disabled={(potBefore === 0 && !banking) || !can.bank(id, h)} onClick={() => api.setBank(id, h, !banking)} style={{ minWidth: 62, padding: "2px 6px", fontSize: 12, opacity: potBefore === 0 && !banking ? 0.5 : 1 }}>
                      {can.hidden && can.hidden(id, h) ? "Hidden" : banking ? "Banking" : potBefore === 0 ? "Empty" : "Bank it"}
                    </button>
                  </div>
                );
              })}
            </div>
            <p className="cap" style={{ marginTop: 4 }}>Banking resets your streak, unless you hold a Bank vault.</p>
            <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
              <button className="cta" onClick={() => { HAPTIC.buzz([20, 50, 20]); setLastCall(false); api.setHole(h + 1); }}>Draw the cards</button>
              <button className="chip" style={{ padding: "6px 0", textAlign: "center" }} onClick={() => setLastCall(false)}>Not yet</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const fmtDay = at => {
  const d = new Date(at); const now = new Date(); const day = 864e5;
  const start = x => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(now) - start(d)) / day);
  if (diff === 0) return "Today"; if (diff === 1) return "Yesterday";
  if (diff < 7) return d.toLocaleDateString("en-AU", { weekday: "long" });
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: d.getFullYear() === now.getFullYear() ? undefined : "numeric" });
};

// Hole-by-hole card: gross score (circled under par, boxed over), B = banked after the hole, X = bust.
function Scorecard({ round, people }) {
  const ids = round.playerIds; const pc = puntCalc(round);
  const w = ids.length > 5 ? 34 : 44;
  const cell = { width: w, textAlign: "center", flex: "none" };
  const half = (a, b) => range18.slice(a, b).reduce((t, h) => t + (PAR[h] || 0), 0);
  const tot = (id, a, b) => { let n = 0, any = false; for (let h = a; h < b; h++) { const v = round.scores[id][h]; if (v != null) { n += v; any = true; } } return any ? n : "–"; };
  const Row = ({ label, par, children, strong }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 2, padding: "3px 0", borderTop: "1px solid var(--line)", fontWeight: strong ? 800 : 400 }}>
      <div style={{ width: 40, flex: "none", fontWeight: 700 }}>{label}</div>
      <div className="cap" style={{ width: 26, flex: "none", textAlign: "center" }}>{par}</div>
      {children}
    </div>
  );
  return (
    <div className="card" style={{ padding: "9px 11px" }}>
      <h3 style={{ fontWeight: 800, fontSize: 15 }}>Scoresheet</h3>
      <p className="cap">Gross scores. B banked after the hole, X bust.</p>
      <div style={{ overflowX: "auto", marginTop: 6 }}>
        <div style={{ minWidth: 70 + ids.length * (w + 2) }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 2, paddingBottom: 4 }}>
            <div className="cap" style={{ width: 40, flex: "none" }}>Hole</div>
            <div className="cap" style={{ width: 26, flex: "none", textAlign: "center" }}>Par</div>
            {ids.map(id => <div key={id} style={{ ...cell, display: "grid", placeItems: "center" }}><Avatar p={people[id] || { name: "?" }} size={22} /></div>)}
          </div>
          {range18.map(h => (
            <div key={h}>
              <Row label={h + 1} par={PAR[h]}>
                {ids.map(id => {
                  const v = round.scores[id][h]; const d = v == null ? 0 : v - PAR[h];
                  const bust = pc[id].bustAt[h]; const bank = round.bank[id][h] && !bust;
                  return (
                    <div key={id} style={{ ...cell, display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}>
                      <span style={{ display: "inline-grid", placeItems: "center", minWidth: 20, height: 20, fontWeight: 700, color: d < 0 ? "var(--fair)" : d > 0 ? "var(--red)" : "var(--ink)", border: v == null ? "none" : d < 0 ? "2px solid var(--fair)" : d > 0 ? "2px solid var(--red)" : "none", borderRadius: d < 0 ? "50%" : 0 }}>{v == null ? "·" : v}</span>
                      {(bank || bust) && <span className="px" style={{ fontSize: 11, color: bust ? "var(--red)" : "var(--fair)" }}>{bust ? "X" : "B"}</span>}
                    </div>
                  );
                })}
              </Row>
              {(h === 8 || h === 17) && (
                <Row label={h === 8 ? "Out" : "In"} par={h === 8 ? half(0, 9) : half(9, 18)} strong>
                  {ids.map(id => <div key={id} style={cell}>{h === 8 ? tot(id, 0, 9) : tot(id, 9, 18)}</div>)}
                </Row>
              )}
            </div>
          ))}
          <Row label="Total" par={half(0, 18)} strong>{ids.map(id => <div key={id} style={cell}>{tot(id, 0, 18)}</div>)}</Row>
          <Row label="Pts" par="" strong>{ids.map(id => <div key={id} style={{ ...cell, color: "var(--fair)" }}>{pc[id].total}</div>)}</Row>
        </div>
      </div>
    </div>
  );
}

function Summary({ round, people, onSave, onBack, footer, record }) {
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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}><button onClick={onBack} style={{ display: "flex", alignItems: "center", fontWeight: 600, opacity: 0.9 }}><ChevronLeft size={22} />{record ? "Back" : "Back to scoring"}</button><Tiles size={14} /></div>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -1, marginTop: 9 }}>{record ? round.course.name : "Round complete"}</h1>
        <p style={{ opacity: 0.8, marginTop: 3 }}>{record ? `${fmtDay(record.at)}${record.live ? " · live round" : ""}` : round.course.name}</p>
      </div>
      <div style={{ padding: record ? "12px 12px 24px" : "12px 12px 86px", display: "grid", gap: 11 }}>
        <Scorecard round={round} people={people} />
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
              <div className="hd" style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700 }}><Avatar p={people[r.id]} size={26} />{people[r.id].name}</div>
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
                  <div className="hd" style={{ flex: 1, fontWeight: 700 }}>{people[id].name}</div>
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
      {!record && (
        <div style={{ position: "sticky", bottom: 0, padding: "9px 12px 14px", background: footer ? "var(--chalk)" : "linear-gradient(to top, var(--chalk) 70%, transparent)", borderTop: footer ? "3px solid var(--night)" : "none" }}>
          {footer || <button className="cta" onClick={onSave}>Save round</button>}
        </div>
      )}
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

// Official handicap, or an estimate from the player's usual score (including "I don't really play yet").
// value: { mode: "ga" | "est", hi: string, usual: key }
function HcpPicker({ value, onChange, who = "you" }) {
  const set = patch => onChange({ ...value, ...patch });
  const you = who === "you";
  return (
    <div style={{ display: "grid", gap: 7 }}>
      <div className="seg">
        <button className={`chip ${value.mode === "ga" ? "on" : ""}`} onClick={() => set({ mode: "ga" })}>{you ? "I have a handicap" : "Has a handicap"}</button>
        <button className={`chip ${value.mode === "est" ? "on" : ""}`} onClick={() => set({ mode: "est" })}>{you ? "No handicap" : "No handicap"}</button>
      </div>
      {value.mode === "ga" && (
        <div>
          <input aria-label="Handicap index" inputMode="decimal" placeholder="Handicap index, e.g. 14.2" value={value.hi} onChange={e => set({ hi: e.target.value.replace(/[^0-9.\-]/g, "").slice(0, 5) })} style={inp} />
          <p className="cap" style={{ marginTop: 4 }}>{you ? "Your official Golf Australia handicap index." : "Their official handicap index."}</p>
        </div>
      )}
      {value.mode === "est" && (
        <div>
          <div className="cap" style={{ fontWeight: 600, marginBottom: 5 }}>{you ? "What do you usually shoot for 18 holes?" : "What do they usually shoot for 18 holes?"}</div>
          <div className="seg">
            {USUAL_SCORES.map(u => <button key={u.key} className={`chip ${value.usual === u.key ? "on" : ""}`} onClick={() => set({ usual: u.key })}>{u.label}</button>)}
          </div>
          <p className="cap" style={{ marginTop: 5 }}>
            {value.usual ? `Starting handicap ${USUAL_SCORES.find(u => u.key === value.usual).hi.toFixed(1)}, marked EST. ` : ""}
            {you ? `After ${ROUNDS_NEEDED} live rounds with your mates, Puntaro works it out from your scores instead.` : "Shown as EST so everyone knows it's an estimate."}
          </p>
        </div>
      )}
    </div>
  );
}
// Turn a picker value into { hi, hk } or an error message.
const pickHcp = v => {
  if (v.mode === "est") { const u = USUAL_SCORES.find(x => x.key === v.usual); return u ? { hi: u.hi, hk: "est" } : { err: "Pick what you usually shoot." }; }
  if (v.mode === "ga") { const h = Number(v.hi); return v.hi.trim() === "" || Number.isNaN(h) || h < -10 || h > MAX_INDEX ? { err: `Handicap index should be between -10 and ${MAX_INDEX}.` } : { hi: Math.round(h * 10) / 10, hk: "ga" }; }
  return { err: "Do you have a handicap?" };
};

// Name plus handicap index. Used for guests in a round and for adding a friend by hand.
function PersonForm({ cta, onSubmit }) {
  const [name, setName] = useState("");
  const [last, setLast] = useState("");
  const [hp, setHp] = useState({ mode: "ga", hi: "18.0", usual: null });
  const picked = pickHcp(hp);
  const err = !name.trim() ? "Enter a first name." : !last.trim() ? "Enter a last name." : picked.err || "";
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div><div className="cap" style={{ marginBottom: 3 }}>First name</div><input aria-label="Name" value={name} onChange={e => setName(e.target.value)} maxLength={20} style={inp} /></div>
        <div><div className="cap" style={{ marginBottom: 3 }}>Last name</div><input aria-label="Last name" value={last} onChange={e => setLast(e.target.value)} maxLength={20} style={inp} /></div>
      </div>
      <HcpPicker value={hp} onChange={setHp} who="them" />
      {err && name.length + last.length > 0 && <p className="cap" role="alert" style={{ color: "var(--red)", fontWeight: 600 }}>{err}</p>}
      <button className="cta" disabled={!!err} onClick={() => onSubmit({ name: name.trim(), last: last.trim(), hi: picked.hi, hk: picked.hk })}>{cta}</button>
    </div>
  );
}

const shareLink = async (url, text, setMsg) => {
  try { if (navigator.share) { await navigator.share({ title: "Puntaro", text, url }); return; } } catch (e) { return; }
  try { await navigator.clipboard.writeText(url); setMsg("Link copied"); setTimeout(() => setMsg(""), 1800); } catch (e) { setMsg(url); }
};

// Your friend code and QR; add a mate by their code or by scanning their QR; or add a player who doesn't use the app.
function AddFriendSheet({ people, friendIds, setFriendIds, myRef, makeRef, onFind, onSend, onAddFriend, onClose }) {
  const [code, setCode] = useState("");
  const [found, setFound] = useState(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [offline, setOffline] = useState(false);
  const qr = myRef ? qrPath(inviteLink(myRef)) : null;
  const find = async c => { setErr(""); setFound(null); setMsg(""); setBusy(true); try { setFound(await onFind(c)); } catch (e) { setErr(e.message || explain(e)); } setBusy(false); };
  const send = async () => {
    setBusy(true); setErr("");
    try { const r = await onSend(found); setMsg(r === "accepted" ? `You and ${found.name} are now friends.` : `Request sent to ${found.name}. You'll be friends once they accept.`); setFound(null); setCode(""); }
    catch (e) { setErr(/permission/.test((e && e.code) || "") ? "Couldn't send that. You may already be friends." : explain(e)); }
    setBusy(false);
  };
  const sample = ["dani", "omar"].filter(id => people[id] && !friendIds.includes(id));
  return (
    <Sheet title="Add a friend" onClose={onClose}>
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ padding: 10, background: "var(--chalk)", border: "3px solid var(--night)", display: "grid", justifyItems: "center", gap: 6, textAlign: "center" }}>
          <div className="cap" style={{ fontWeight: 600 }}>Your friend code</div>
          {myRef ? (
            <>
              <div className="px" aria-label="Your friend code" style={{ fontSize: 26, letterSpacing: 1 }}>{myRef}</div>
              <svg viewBox={`0 0 ${qr.n} ${qr.n}`} width="150" height="150" role="img" aria-label="Your friend QR code" shapeRendering="crispEdges" style={{ background: "#fff", display: "block" }}><path d={qr.d} fill="#14150F" /></svg>
              <div className="cap">A mate scans this, or types your code. Anyone new who signs up from your link becomes your friend straight away.</div>
              <button className="chip" onClick={() => shareLink(inviteLink(myRef), "Be my friend on Puntaro, a side game for your round.", setMsg)} style={{ padding: "7px 14px" }}>Share my link</button>
            </>
          ) : <button className="cta" disabled={busy} onClick={async () => { setBusy(true); try { await makeRef(); } catch (e) { setErr(explain(e)); } setBusy(false); }}>Get my friend code</button>}
        </div>
        <div>
          <div style={{ fontWeight: 700, marginBottom: 5 }}>Add a mate by their code</div>
          <div style={{ display: "flex", gap: 6 }}>
            <input aria-label="Friend code" placeholder="e.g. nic-7k2m" value={code} onChange={e => setCode(e.target.value)} autoCapitalize="none" autoCorrect="off" style={{ ...inp, flex: 1, minWidth: 0 }} />
            <button className="chip" disabled={busy || !code.trim()} onClick={() => find(code)} style={{ padding: "0 14px" }}>Find</button>
          </div>
          <button className="chip" onClick={() => { setErr(""); setScanning(true); }} style={{ width: "100%", marginTop: 7, padding: "8px 0", textAlign: "center" }}>Scan their QR code</button>
        </div>
        {found && (
          <div className="card" style={{ padding: 10, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1 }}><div className="hd" style={{ fontWeight: 700 }}>{found.name}</div><div className="cap">{found.friend ? "Already your friend." : `Code ${found.code}`}</div></div>
            {!found.friend && <button className="cta" style={{ width: "auto", minHeight: 40, padding: "6px 12px", fontSize: "14px" }} disabled={busy} onClick={send}>Send friend request</button>}
          </div>
        )}
        {err && <p className="cap" role="alert" style={{ color: "var(--red)", fontWeight: 600 }}>{err}</p>}
        {msg && <p role="status" style={{ fontWeight: 700 }}>{msg}</p>}
        <div style={{ borderTop: "2px solid var(--line)", paddingTop: 10 }}>
          <button className="chip" aria-expanded={offline} onClick={() => setOffline(o => !o)} style={{ width: "100%", padding: "8px 0", textAlign: "center" }}>{offline ? "Hide" : "Add a player who doesn't use the app"}</button>
          {offline && (
            <div style={{ marginTop: 10 }}>
              <PersonForm cta="Add player" onSubmit={p => { onAddFriend(p); onClose(); }} />
              {sample.length > 0 && <div className="cap" style={{ margin: "12px 0 4px", fontWeight: 600 }}>Sample golfers (demo)</div>}
              {sample.map(id => (
                <div key={id} style={{ display: "flex", alignItems: "center", gap: 9, padding: "5px 0" }}>
                  <Avatar p={people[id]} size={28} />
                  <div style={{ flex: 1 }}><div className="hd" style={{ fontWeight: 700 }}>{people[id].name}</div><div className="cap">HCP {fmtHcp(people[id])}</div></div>
                  <button onClick={() => setFriendIds(f => [...f, id])} className="chip">Add</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {scanning && <ScanSheet parse={refFromQr} aim="Point at the QR code on your mate's Add a friend screen." wrongHint="That isn't a Puntaro friend code. Ask your mate to open Friends, then Add." onClose={() => setScanning(false)} onCode={c => { setScanning(false); setCode(c); find(c); }} onFail={m => { setScanning(false); setErr(m); }} />}
    </Sheet>
  );
}

// Opened a mate's invite link or friend QR while already signed up: offer a friend request.
function FriendAsk({ who, onSend, onClose }) {
  const [state, setState] = useState(""); const [err, setErr] = useState("");
  return (
    <Sheet title="Add a friend" onClose={onClose}>
      {!state ? (
        <>
          <p style={{ fontWeight: 600 }}>Send {who.name} a friend request?</p>
          <p className="cap" style={{ marginTop: 3 }}>You'll be friends once they accept: you'll see each other's stats and can pick each other for rounds.</p>
          {err && <p className="cap" role="alert" style={{ color: "var(--red)", marginTop: 6 }}>{err}</p>}
          <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
            <button className="chip" onClick={onClose} style={{ flex: 1, padding: "9px 0", textAlign: "center" }}>Not now</button>
            <button className="chip on" onClick={async () => { try { setState(await onSend()); } catch (e) { setErr(explain(e)); } }} style={{ flex: 1, padding: "9px 0", textAlign: "center" }}>Send friend request</button>
          </div>
        </>
      ) : (
        <>
          <p role="status" style={{ fontWeight: 700 }}>{state === "accepted" ? `You and ${who.name} are now friends.` : `Request sent to ${who.name}.`}</p>
          <button className="cta" style={{ marginTop: 10 }} onClick={onClose}>Done</button>
        </>
      )}
    </Sheet>
  );
}

// Someone's profile: handicap and stats. Friends with accounts show their own stats; other players, the rounds you've played together.
function ProfileSheet({ id, people, history, card, onUnfriend, onRemove, onClose }) {
  const p = people[id]; const [ask, setAsk] = useState(false); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  if (!p) return null;
  const linked = !!p.uid;
  const st = k => (linked ? (card && card.stats && card.stats[k]) || null : statsFor(history, id, k));
  return (
    <Sheet title={linked ? (card && card.name) || p.name : `${p.name}${p.last ? ` ${p.last}` : ""}`} onClose={onClose}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Avatar p={p} size={52} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>HCP {fmtHcp(p)}</div>
          <div className="cap">{linked ? "Puntaro friend. Stats from all their rounds." : "Player without the app. Stats from rounds you've played together."}</div>
        </div>
      </div>
      {[["month", "This month"], ["season", "This season"], ["all", "All time"]].map(([k, l]) => {
        const s = st(k);
        return (
          <div key={k} style={{ marginTop: 10 }}>
            <div className="cap" style={{ fontWeight: 700 }}>{l}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 6, marginTop: 4 }}>
              {[["Rounds", s ? s.rounds : 0], ["Wins", s ? s.wins : 0], ["NTPs", s ? s.ntp : 0], ["Avg pts", s && s.pts != null ? s.pts.toFixed(1) : "–"]].map(([n, v]) => (
                <div key={n} className="card" style={{ padding: "6px 8px", boxShadow: "2px 2px 0 var(--night)" }}><div className="px" style={{ fontSize: 22 }}>{v}</div><div className="cap">{n}</div></div>
              ))}
            </div>
          </div>
        );
      })}
      {err && <p className="cap" role="alert" style={{ color: "var(--red)", marginTop: 8 }}>{err}</p>}
      <div style={{ marginTop: 14 }}>
        {!ask ? <button className="chip" onClick={() => setAsk(true)} style={{ width: "100%", padding: "9px 0", textAlign: "center", color: "var(--red)" }}>{linked ? "Unfriend" : "Remove from friends"}</button> : (
          <div className="card" style={{ padding: 10, boxShadow: "none" }}>
            <div style={{ fontWeight: 700 }}>{linked ? `Unfriend ${p.name}?` : `Remove ${p.name}?`}</div>
            <div className="cap" style={{ marginTop: 2 }}>{linked ? "You'll both drop off each other's friends list. Rounds you've played together stay." : "They'll come off your friends list. Rounds you've played together stay."}</div>
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <button className="chip" onClick={() => setAsk(false)} style={{ flex: 1, padding: "8px 0", textAlign: "center" }}>Keep</button>
              <button className="chip" disabled={busy} onClick={async () => { setBusy(true); try { await (linked ? onUnfriend(p.uid) : onRemove(id)); onClose(); } catch (e) { setErr(explain(e)); setBusy(false); } }} style={{ flex: 1, padding: "8px 0", textAlign: "center", background: "var(--red)", color: "#fff" }}>{linked ? "Unfriend" : "Remove"}</button>
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
}

function Friends({ people, friendIds, history, onAddFriend, setFriendIds, friendCards = {}, requests = [], onAccept, onDecline, onFind, onSend, onUnfriend, myRef, makeRef }) {
  const [metric, setMetric] = useState("pts");
  const [period, setPeriod] = useState("month");
  const [sheet, setSheet] = useState(false);
  const [open, setOpen] = useState(null);
  const [busy, setBusy] = useState("");
  const val = (id, k) => {
    const p = people[id];
    const s = p && p.uid ? ((friendCards[p.uid] || {}).stats || {})[period] : statsFor(history, id, period);
    return s ? s[k] : null;
  };
  const rows = ["me", ...friendIds].filter(id => people[id]).map(id => ({ id, v: val(id, metric) })).sort((a, b) => (a.v == null) - (b.v == null) || b.v - a.v);
  const act = async (id, f) => { setBusy(id); try { await f(id); } catch (e) { /* the list updates itself */ } setBusy(""); };
  return (
    <div style={{ paddingBottom: 19 }}>
      <div className="stripes" style={{ padding: "20px 16px 18px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <h1>Friends</h1>
        <button className="px" aria-label="Add" onClick={() => setSheet(true)} style={{ background: "var(--flag)", color: "var(--dk)", border: "3px solid var(--night)", padding: "6px 12px", fontSize: 20, lineHeight: 1, display: "flex", gap: 6, alignItems: "center" }}><UserPlus size={18} />ADD FRIEND</button>
      </div>
      <div style={{ padding: 12, display: "grid", gap: 10 }}>
        {requests.length > 0 && (
          <div className="card" style={{ padding: 10 }}>
            <div style={{ fontWeight: 700 }}>Friend requests</div>
            {requests.map(r => {
              const c = friendCards[r.id];
              return (
                <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 0", borderTop: "1px solid var(--line)", marginTop: 6 }}>
                  <Avatar p={{ name: r.name, first: c ? c.first : r.name, last: c ? c.li : "", color: (c && c.color) || "#5E6B66" }} size={30} />
                  <div style={{ flex: 1, minWidth: 0 }}><div className="hd" style={{ fontWeight: 700 }}>{r.name}</div>{c && <div className="cap">HCP {fmtHcp(c)}</div>}</div>
                  <button className="chip" disabled={busy === r.id} onClick={() => act(r.id, onDecline)}>Decline</button>
                  <button className="chip on" disabled={busy === r.id} onClick={() => act(r.id, onAccept)} aria-label={`Accept ${r.name}`}>Accept</button>
                </div>
              );
            })}
          </div>
        )}
        <div style={{ display: "flex", gap: 6 }}>
          {[["month", "This month"], ["season", "This season"]].map(([k, l]) => (
            <button key={k} className={`chip ${period === k ? "on" : ""}`} onClick={() => setPeriod(k)} style={{ flex: 1, padding: "5px 0", textAlign: "center" }}>{l}</button>
          ))}
        </div>
        <p className="cap">Tap a player for their profile. Friends with Puntaro accounts show stats from all their rounds; others, the rounds you've played together.</p>
        <div className="card" style={{ padding: "3px 11px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "24px minmax(0,1fr) repeat(4, 44px)", gap: 4, alignItems: "center", padding: "8px 0", borderBottom: "2px solid var(--night)" }}>
            <span /><span className="cap">Player</span>
            {METRICS.map(x => (
              <button key={x.id} onClick={() => setMetric(x.id)} aria-pressed={metric === x.id} className="cap" style={{ textAlign: "right", fontWeight: 700, color: metric === x.id ? "var(--fair)" : "var(--muted)", textDecoration: metric === x.id ? "underline" : "none" }}>{x.label}{metric === x.id ? " ▾" : ""}</button>
            ))}
          </div>
          {rows.map((r, i) => (
            <button key={r.id} onClick={() => r.id !== "me" && setOpen(r.id)} aria-label={r.id === "me" ? "You" : `View ${people[r.id].name}`} style={{ width: "100%", textAlign: "left", display: "grid", gridTemplateColumns: "24px minmax(0,1fr) repeat(4, 44px)", gap: 4, alignItems: "center", padding: "8px 0", borderTop: i ? "1px solid var(--line)" : "none" }}>
              <div style={{ display: "grid", placeItems: "center", fontWeight: 800, color: "var(--muted)" }}>
                {i === 0 && r.v != null ? <Sprite name="crown" size={2} /> : i + 1}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                <Avatar p={people[r.id]} size={28} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{people[r.id].name}{people[r.id].uid && <span className="pill" style={{ marginLeft: 5, padding: "0 4px", fontSize: 10, background: "var(--mint)" }}>APP</span>}</div>
                  <div className="cap" style={{ fontSize: 11 }}>HCP {fmtHcp(people[r.id])}</div>
                </div>
              </div>
              {METRICS.map(x => {
                const v = val(r.id, x.id);
                return <div key={x.id} style={{ textAlign: "right", fontWeight: metric === x.id ? 800 : 600, color: metric === x.id ? "var(--ink)" : "var(--muted)" }}>{v == null ? "–" : x.fmt(v)}</div>;
              })}
            </button>
          ))}
        </div>
        {friendIds.length === 0 && <p className="cap" style={{ textAlign: "center" }}>No friends yet. Tap Add to share your code or scan a mate's.</p>}
      </div>
      {sheet && <AddFriendSheet people={people} friendIds={friendIds} setFriendIds={setFriendIds} myRef={myRef} makeRef={makeRef} onFind={onFind} onSend={onSend} onAddFriend={onAddFriend} onClose={() => setSheet(false)} />}
      {open && <ProfileSheet id={open} people={people} history={history} card={people[open] && people[open].uid ? friendCards[people[open].uid] : null} onUnfriend={onUnfriend} onRemove={id => setFriendIds(f => f.filter(x => x !== id))} onClose={() => setOpen(null)} />}
    </div>
  );
}

// "14.2" plus EST (estimated) or APP (from Puntaro rounds) when it isn't an official handicap.
const fmtHcp = p => { const t = hcpTag(p && p.hk); return `${Number((p && p.hi) ?? 0).toFixed(1)}${t ? ` ${t}` : ""}`; };
const displayName = p => `${(p.first || p.name || "").trim()}${p.last ? ` ${p.last.trim()[0].toUpperCase()}.` : ""}`.slice(0, 30) || "A Puntaro player";

// Your own invite link, and who signed up with it.
function InviteCard({ myRef, makeRef, cloud }) {
  const [joins, setJoins] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  useEffect(() => { if (myRef) cloud.listJoins(myRef).then(setJoins).catch(() => setJoins([])); }, [myRef]); // eslint-disable-line react-hooks/exhaustive-deps
  const get = async () => { setBusy(true); setMsg(""); try { await makeRef(); } catch (e) { setMsg(explain(e)); } setBusy(false); };
  const share = async () => {
    const url = inviteLink(myRef);
    try { if (navigator.share) { await navigator.share({ title: "Puntaro", text: "Play Puntaro with me: a side game for your round. Bank it or bust.", url }); return; } } catch (e) { return; }
    try { await navigator.clipboard.writeText(url); setMsg("Link copied"); setTimeout(() => setMsg(""), 1800); } catch (e) { setMsg(url); }
  };
  return (
    <div className="card" style={{ padding: 12 }}>
      <div className="cap" style={{ fontWeight: 600 }}>Invite friends</div>
      {!myRef ? (
        <>
          <p className="cap" style={{ marginTop: 3 }}>Get your own invite link. Anyone who signs up with it shows up here.</p>
          <button className="cta" style={{ marginTop: 8 }} disabled={busy} onClick={get}>{busy ? "Making your link…" : "Get my invite link"}</button>
        </>
      ) : (
        <>
          <div className="px" style={{ marginTop: 5, fontSize: 16, wordBreak: "break-all" }}>{inviteLink(myRef).replace(/^https?:\/\//, "")}</div>
          <button className="cta" style={{ marginTop: 8 }} onClick={share}>Share my invite link</button>
          <p className="cap" style={{ marginTop: 6 }}>Your live round QR codes and links count too.</p>
          <div style={{ marginTop: 8, borderTop: "1px solid var(--line)", paddingTop: 7 }}>
            <div style={{ fontWeight: 700 }}>{joins == null ? "Checking who's joined…" : joins.length === 0 ? "No one has joined with your link yet" : `${joins.length} joined with your link`}</div>
            {joins && joins.length > 0 && <div className="cap" style={{ marginTop: 2 }}>{joins.sort((a, b) => (b.at || 0) - (a.at || 0)).map(j => j.name).join(", ")}</div>}
          </div>
        </>
      )}
      {msg && <p className="cap" role="status" style={{ marginTop: 5, fontWeight: 600 }}>{msg}</p>}
    </div>
  );
}

function Me({ people, setPeople, dark, setDark, saved, history, onAbout, user, onSignOut, onStartFresh, onDeleteAccount, myRef, makeRef, cloud }) {
  const me = people.me;
  const [ask, setAsk] = useState(null); // "fresh" | "delete"
  // Changing it by hand keeps an official handicap official; otherwise it becomes your own estimate.
  const setHi = v => setPeople(p => ({ ...p, me: { ...p.me, hi: Math.round(Math.min(MAX_INDEX, Math.max(-10, v)) * 10) / 10, hk: p.me.hk === "ga" ? "ga" : "est" } }));
  const counted = history.length; // finished rounds, for the explanation below
  const s = statsFor(history, "me", "season") || { rounds: 0, wins: 0, ntp: 0, pts: null };
  const tiles = [["Rounds", s.rounds], ["Puntaro wins", s.wins], ["NTPs", s.ntp], ["Avg points", s.pts == null ? "–" : s.pts.toFixed(1)]];
  return (
    <div style={{ paddingBottom: 19 }}>
      <div className="stripes" style={{ padding: "23px 16px 20px", display: "flex", alignItems: "center", gap: 11 }}>
        <Avatar p={me} size={54} />
        <div><h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.8 }}>You</h1><p style={{ opacity: 0.8 }}>Season stats</p></div>
      </div>
      <div style={{ padding: 12, display: "grid", gap: 11 }}>
        <InviteCard myRef={myRef} makeRef={makeRef} cloud={cloud} />
        <div className="card" style={{ padding: "8px 11px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 9 }}>
          <div><div style={{ fontWeight: 700, fontSize: 13 }}>Dark mode</div><div className="cap">Easier on the eyes on the course at dusk.</div></div>
          <Toggle on={dark} onChange={setDark} />
        </div>
        <SoundRow />
        <HapticRow />
        <div className="card" style={{ padding: 12 }}>
          <div className="cap" style={{ fontWeight: 600 }}>Your initials</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 5 }}>
            <input aria-label="Your first name" placeholder="First name" maxLength={20} value={me.first || ""} onChange={e => setPeople(p => ({ ...p, me: { ...p.me, first: e.target.value } }))} style={inp} />
            <input aria-label="Your last name" placeholder="Last name" maxLength={20} value={me.last || ""} onChange={e => setPeople(p => ({ ...p, me: { ...p.me, last: e.target.value } }))} style={inp} />
          </div>
          <p className="cap" style={{ marginTop: 5 }}>Shown on your avatar. Everyone still calls you "You" on your own phone.</p>
        </div>
        <div className="card" style={{ padding: 12 }}>
          <div className="cap" style={{ fontWeight: 600 }}>Handicap index{hcpTag(me.hk) ? ` · ${hcpTag(me.hk)}` : ""}</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 5 }}>
            <button onClick={() => setHi(me.hi - 0.1)} aria-label="Lower handicap" style={{ width: 40, height: 40, borderRadius: "50%", border: "1.5px solid var(--line)", display: "grid", placeItems: "center" }}><Minus size={22} /></button>
            <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: -1.5 }}>{me.hi.toFixed(1)}</div>
            <button onClick={() => setHi(me.hi + 0.1)} aria-label="Raise handicap" style={{ width: 40, height: 40, borderRadius: "50%", border: "1.5px solid var(--line)", display: "grid", placeItems: "center" }}><Plus size={22} /></button>
          </div>
          <p className="cap" style={{ marginTop: 6 }}>{me.hk === "ga" ? "Your official handicap. Keep it up to date here when it changes." : me.hk === "app" ? `Worked out by Puntaro from your live rounds with mates, the World Handicap System way. It drops straight away after a good round and rises at most 1.0 a round. Not an official GA handicap.` : `An estimate. After ${ROUNDS_NEEDED} live rounds with mates, Puntaro works out your handicap from your scores.`}</p>
          <div className="cap" style={{ fontWeight: 600, marginTop: 10 }}>Golf ID (optional)</div>
          <input aria-label="Golf ID" inputMode="numeric" placeholder="Your Golf Australia Golf ID" maxLength={12} value={me.golfId || ""} onChange={e => setPeople(p => ({ ...p, me: { ...p.me, golfId: e.target.value.replace(/[^0-9]/g, "").slice(0, 12) } }))} style={{ ...inp, marginTop: 4 }} />
          <p className="cap" style={{ marginTop: 4 }}>Golf Australia doesn't let apps check handicaps yet. Add your Golf ID and Puntaro can verify your handicap with a GA badge if they do.</p>
        </div>
        <button className="chip" onClick={onAbout} style={{ padding: "8px 0", textAlign: "center" }}>About this alpha</button>
        <div className="card" style={{ padding: 12 }}>
          <div className="cap" style={{ fontWeight: 600 }}>Your account</div>
          <div style={{ fontWeight: 700, marginTop: 3, wordBreak: "break-all" }}>{(user && user.email) || "Signed in"}</div>
          <p className="cap" style={{ marginTop: 3 }}>Your rounds, stats, friends and courses are saved to this account, so they're the same on any phone you sign in on.</p>
          <button className="chip" style={{ marginTop: 9, padding: "7px 0", textAlign: "center", width: "100%" }} onClick={onSignOut}>Sign out</button>
          <p className="cap" style={{ marginTop: 4 }}>Signing out also clears the offline copy from this phone.</p>
          {ask === null && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 10 }}>
              <button className="chip" style={{ padding: "6px 0", textAlign: "center" }} onClick={() => setAsk("fresh")}>Start fresh</button>
              <button className="chip" style={{ padding: "6px 0", textAlign: "center", color: "var(--red)" }} onClick={() => setAsk("delete")}>Delete account</button>
            </div>
          )}
          {ask && (
            <div role="alert" style={{ marginTop: 10, padding: 9, border: "2px solid var(--red)" }}>
              <p style={{ fontWeight: 700 }}>{ask === "fresh" ? "Wipe your rounds and stats?" : "Delete your account?"}</p>
              <p className="cap" style={{ marginTop: 3 }}>{ask === "fresh" ? "Deletes every round, stat, friend, guest, course and paused round in this account. You stay signed in and start again. Live rounds you played stay with the other players. This can't be undone." : "Deletes everything in this account and your login. Live rounds you played stay with the other players. This can't be undone."}</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 8 }}>
                <button className="chip" style={{ padding: "6px 0", textAlign: "center" }} onClick={() => setAsk(null)}>Keep it</button>
                <button className="cta" style={{ padding: "6px 0", background: "var(--red)", borderColor: "var(--red)", color: "#fff" }} onClick={() => (ask === "fresh" ? onStartFresh() : onDeleteAccount())}>{ask === "fresh" ? "Wipe it" : "Delete"}</button>
              </div>
            </div>
          )}
        </div>
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
/* ───────────── LIVE ROUND SHEETS ───────────── */
const sheetWrap = { position: "fixed", inset: 0, maxWidth: 430, margin: "0 auto", zIndex: 40, display: "flex", alignItems: "flex-end", background: "rgba(0,0,0,.6)" };
const sheetBox = { width: "100%", padding: 12, boxShadow: "none", maxHeight: "88vh", overflowY: "auto" };
const firstOpenHole = d => { const ids = d.base.playerIds; for (let h = 0; h < 18; h++) if (!ids.every(id => d.s && d.s[id] && d.s[id][h] != null)) return h; return 17; };

function JoinSheet({ initial, onClose, onJoined }) {
  const [text, setText] = useState(initial || "");
  const [scanning, setScanning] = useState(false);
  const [found, setFound] = useState(null); // { code, doc, uid }
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const find = async (raw = text) => {
    const code = cleanCode(raw);
    if (!code) { setErr("Codes look like PUNT-7KQ4M."); return; }
    setBusy(true); setErr("");
    try {
      const b = await backend();
      const doc = await b.get(code);
      if (!doc) setErr("No live round with that code. Check it with whoever started the round.");
      else setFound({ code, doc, uid: b.uid });
    } catch (e) { setErr("Couldn't reach live rounds. Check your connection and try again."); }
    setBusy(false);
  };
  useEffect(() => { if (initial) find(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const pick = async pid => {
    setBusy(true); setErr("");
    try {
      const b = await backend();
      const pairs = [[["members", found.uid], true]];
      if (pid && !(found.doc.claims && found.doc.claims[pid] === found.uid)) pairs.push([["claims", pid], found.uid], [["who"], pid]);
      await b.update(found.code, pairs);
      onJoined(found.code, pid, found.doc);
    } catch (e) { setErr("Couldn't join. Try again."); setBusy(false); }
  };
  const d = found && found.doc;
  return (
    <div style={sheetWrap} onClick={onClose}>
      <div className="sheet card" role="dialog" aria-label="Join a live round" onClick={e => e.stopPropagation()} style={sheetBox}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 className="h2">{d ? "Which one are you?" : "Join a live round"}</h2>
          <button onClick={onClose} aria-label="Close"><X size={22} /></button>
        </div>
        {!d && (
          <>
            <button className="cta" style={{ marginTop: 10 }} disabled={busy} onClick={() => { setErr(""); setScanning(true); }}>Scan QR code</button>
            <p className="cap" style={{ marginTop: 8 }}>Point it at the QR code on the host's screen. Or type their code:</p>
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              <input aria-label="Join code" placeholder="PUNT-7KQ4M" autoCapitalize="characters" autoCorrect="off" value={text} onChange={e => setText(e.target.value.toUpperCase())} onKeyDown={e => { if (e.key === "Enter") find(); }} style={{ ...inp, flex: 1, fontSize: 18, letterSpacing: 2 }} />
              <button className="cta" style={{ width: "auto", padding: "8px 14px" }} disabled={busy} onClick={() => find()}>{busy ? "…" : "Find"}</button>
            </div>
          </>
        )}
        {d && (
          <>
            <p className="cap" style={{ marginTop: 4 }}>{d.base.course.name} · {d.scoring === "one" ? `${d.people.me ? d.people.me.name : "The host"} is keeping score` : "Everyone enters their own score"}</p>
            <div style={{ display: "grid", gap: 6, marginTop: 10 }}>
              {d.base.playerIds.map(id => {
                const by = d.claims && d.claims[id]; const taken = by && by !== found.uid;
                return (
                  <button key={id} className="chip" disabled={busy || taken} onClick={() => pick(id)} style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 9px", textAlign: "left" }}>
                    <Avatar p={{ id, ...d.people[id] }} size={28} />
                    <span style={{ flex: 1 }}>{d.people[id].name}<span className="cap"> HCP {fmtHcp(d.people[id])}</span></span>
                    <span className="cap">{taken ? "Joined" : by ? "That's you" : ""}</span>
                  </button>
                );
              })}
              <button className="chip" disabled={busy} onClick={() => pick(null)} style={{ padding: "7px 0", textAlign: "center" }}>I'm not playing, just watch</button>
            </div>
          </>
        )}
        {err && <p className="cap" role="alert" style={{ color: "var(--red)", fontWeight: 600, marginTop: 8 }}>{err}</p>}
      </div>
      {scanning && <ScanSheet onClose={() => setScanning(false)} onCode={code => { setScanning(false); setText(code); find(code); }} onFail={m => { setScanning(false); setErr(m); }} />}
    </div>
  );
}

// Full-screen camera that looks for a Puntaro join QR code.
const joinFromQr = text => { try { return cleanCode(new URL(text).searchParams.get("join")); } catch (e) { return cleanCode(text); } };
const refFromQr = text => { try { return cleanRef(new URL(text).searchParams.get("ref")); } catch (e) { return cleanRef(text); } };
function ScanSheet({ onClose, onCode, onFail, parse = joinFromQr, aim = "Point at the QR code on the host's screen.", wrongHint = "That QR code isn't a Puntaro round. Scan the code on the host's LIVE screen." }) {
  const video = useRef(null);
  const [hint, setHint] = useState("Starting the camera…");
  useEffect(() => {
    let stream = null; let stop = false; let timer = 0;
    const canvas = document.createElement("canvas");
    (async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw Object.assign(new Error("no camera api"), { name: "NotFoundError" });
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        if (stop) return;
        const v = video.current; v.srcObject = stream; v.setAttribute("playsinline", ""); await v.play().catch(() => {});
        const decode = await makeDecoder();
        setHint(aim);
        let wrong = 0;
        const tick = async () => {
          if (stop) return;
          try {
            const text = await decode(v, canvas);
            if (text) {
              const code = parse(text);
              if (code) { SFX.tap(); onCode(code); return; }
              if (++wrong > 3) setHint(wrongHint);
            }
          } catch (e) { /* try the next frame */ }
          timer = setTimeout(tick, 120);
        };
        tick();
      } catch (e) { if (!stop) onFail(cameraProblem(e)); }
    })();
    return () => { stop = true; clearTimeout(timer); if (stream) stream.getTracks().forEach(t => t.stop()); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div role="dialog" aria-label="Scan QR code" style={{ position: "fixed", inset: 0, maxWidth: 430, margin: "0 auto", zIndex: 60, background: "#000", display: "flex", flexDirection: "column" }}>
      <div style={{ position: "relative", flex: 1, overflow: "hidden" }}>
        <video ref={video} muted playsInline autoPlay style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        <div aria-hidden="true" style={{ position: "absolute", left: "50%", top: "45%", width: 230, height: 230, transform: "translate(-50%,-50%)", boxShadow: "0 0 0 9999px rgba(0,0,0,.45)", border: "4px solid #EDE8DD" }} />
        <p role="status" style={{ position: "absolute", left: 16, right: 16, bottom: 20, textAlign: "center", color: "#EDE8DD", fontWeight: 700, textShadow: "2px 2px 0 #000" }}>{hint}</p>
      </div>
      <div style={{ padding: "12px 12px 18px", background: "#14150F" }}>
        <button className="cta" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

// Shown while a live round is being created, or if Firebase turned it down.
function LiveStartSheet({ state, onClose }) {
  return (
    <div style={sheetWrap} onClick={state.busy ? undefined : onClose}>
      <div className="sheet card" role="dialog" aria-label="Live round" onClick={e => e.stopPropagation()} style={sheetBox}>
        <h2 className="h2">{state.busy ? "Setting up your live round…" : "Live round didn't start"}</h2>
        {state.busy
          ? <p className="cap" style={{ marginTop: 4 }}>Getting a join code. This takes a second.</p>
          : <><p style={{ marginTop: 6 }}>{state.err}</p><p className="cap" style={{ marginTop: 6 }}>You can still score this round on your phone. It just won't be shared.</p>
            <button className="cta" style={{ marginTop: 10 }} onClick={onClose}>OK</button></>}
      </div>
    </div>
  );
}

function LiveSheet({ code, doc, uid, onClose, onScoring, onRelease, onLeave, refCode }) {
  const qr = qrPath(joinLink(code, refCode));
  const [copied, setCopied] = useState(false);
  const host = doc && doc.host === uid;
  const share = async () => {
    const url = joinLink(code, refCode);
    try { if (navigator.share) { await navigator.share({ title: "Join my Puntaro round", text: `Join my round with code ${code}`, url }); return; } } catch (e) { return; }
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch (e) { /* fine */ }
  };
  return (
    <div style={sheetWrap} onClick={onClose}>
      <div className="sheet card" role="dialog" aria-label="Live round" onClick={e => e.stopPropagation()} style={sheetBox}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 className="h2">Live round</h2>
          <button onClick={onClose} aria-label="Close"><X size={22} /></button>
        </div>
        <p className="cap" style={{ marginTop: 4 }}>Mates scan this with their phone camera, or tap Join a live round and type the code.</p>
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "12px 0", background: "var(--chalk)", border: "3px solid var(--night)" }}>
          <svg viewBox={`0 0 ${qr.n} ${qr.n}`} width="196" height="196" role="img" aria-label={`QR code to join ${code}`} shapeRendering="crispEdges" style={{ background: "#fff", display: "block" }}>
            <path d={qr.d} fill="#14150F" />
          </svg>
          <div className="px" style={{ fontSize: 31, letterSpacing: 3 }}>{code}</div>
        </div>
        <button className="cta" style={{ marginTop: 9 }} onClick={share}>{copied ? "Link copied" : "Share invite link"}</button>
        <p className="cap" style={{ marginTop: 6, textAlign: "center" }}>Need it again later? Tap the red LIVE button on the scoring screen, or on Home.</p>
        {doc && (
          <>
            <div className="cap" style={{ fontWeight: 600, marginTop: 13 }}>Players</div>
            <div style={{ marginTop: 4 }}>
              {doc.base.playerIds.map((id, i) => (
                <div key={id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderTop: i ? "1px solid var(--line)" : "none" }}>
                  <Avatar p={{ id, ...doc.people[id] }} size={24} />
                  <div className="hd" style={{ flex: 1, fontWeight: 700 }}>{doc.people[id].name}</div>
                  <span className="cap" style={{ color: doc.claims && doc.claims[id] ? "var(--fair)" : "var(--muted)", fontWeight: 600 }}>{doc.claims && doc.claims[id] ? (doc.claims[id] === uid ? "You" : "Joined") : "Not joined"}</span>
                  {host && doc.claims && doc.claims[id] && doc.claims[id] !== uid && <button className="chip" style={{ padding: "1px 6px", fontSize: 11 }} onClick={() => onRelease(id)}>Free seat</button>}
                </div>
              ))}
            </div>
            <div className="cap" style={{ fontWeight: 600, marginTop: 11 }}>Who enters scores</div>
            {host ? (
              <div className="seg" style={{ marginTop: 6 }}>
                <button className={`chip ${doc.scoring === "each" ? "on" : ""}`} onClick={() => onScoring("each")}>Everyone scores</button>
                <button className={`chip ${doc.scoring === "one" ? "on" : ""}`} onClick={() => onScoring("one")}>One scorer</button>
              </div>
            ) : <p style={{ marginTop: 3 }}>{doc.scoring === "one" ? `${doc.people.me ? doc.people.me.name : "The host"} keeps score.` : "Everyone enters their own score."}</p>}
            {host && <p className="cap" style={{ marginTop: 6 }}>Phone died? Free that player's seat so the round isn't held up. Anyone can then score for them, or they can rejoin.</p>}
          </>
        )}
        <button className="chip" style={{ marginTop: 13, padding: "7px 0", textAlign: "center", width: "100%" }} onClick={onLeave}>Stop following live (keep a copy here)</button>
      </div>
    </div>
  );
}

function Game({ user, cloud, profile, now0, finished }) {
  const start = parseJSON(now0 && now0.json, {});
  const [people, setPeople] = useState(() => {
    const p = parseJSON(profile.people, {});
    return { ...p, me: { id: "me", name: "You", color: ME_COLOR, ...(p.me || {}), first: (p.me && p.me.first) || profile.first || "", last: (p.me && p.me.last) || profile.last || "", hi: p.me && p.me.hi != null ? p.me.hi : profile.hi ?? 18, hk: (p.me && p.me.hk) || profile.hcpKind || "", golfId: (p.me && p.me.golfId) || profile.golfId || "" } };
  });
  // Daylight by default: easiest to read on a sunny course. The choice is remembered on this phone.
  const [dark, setDarkRaw] = useState(() => { try { return localStorage.getItem("puntaro.dark") === "1"; } catch (e) { return false; } });
  const setDark = v => { setDarkRaw(v); try { localStorage.setItem("puntaro.dark", v ? "1" : "0"); } catch (e) { /* fine */ } };
  const [friendIds, setFriendIds] = useState(() => (Array.isArray(profile.friendIds) ? profile.friendIds : []));
  const [tab, setTab] = useState("home");
  const [view, setView] = useState("tabs");
  // Every new screen (a round you just teed off, a tab, the rules) opens at the top, not wherever the last one was scrolled to.
  useEffect(() => { try { window.scrollTo(0, 0); } catch (e) { /* fine */ } }, [view, tab]);
  const [round, setRound] = useState(() => { if (start.round) applyHoles(start.round.holes || null); return start.round || null; });
  // Finished rounds live in your account (users/{uid}/rounds). Removing one from the list only hides it: stats keep it.
  const recent = finished.filter(r => !r.hidden).sort((a, b) => b.at - a.at).map(r => ({ id: r.id, course: r.course, when: fmtDay(r.at), gross: r.gross, net: r.net, note: r.note, hasCard: !!r.round }));
  const history = finished.map(r => ({ at: r.at, course: r.course, players: r.players || {} }));
  const [openRec, setOpenRec] = useState(null);
  // Witnessed 18-hole rounds, oldest first, for the Puntaro handicap.
  const hcpDiffs = finished.filter(f => f.witnessed && typeof f.diff === "number").sort((a, b) => a.at - b.at).map(f => f.diff);
  // Your invite code. Accounts made before invites get one the first time they open the Invite card.
  const [myRef, setMyRef] = useState(profile.refCode || null);
  // Already signed up: an invite link (or a live round QR) from someone becomes a friend request offer instead.
  const [friendAsk, setFriendAsk] = useState(null); // { owner, name, code } offered after opening someone's link
  useEffect(() => {
    const code = unstash(REF_KEY); stash(REF_KEY, null);
    if (code && code !== profile.refCode) cloud.getRef(code).then(r => { if (r && r.owner !== user.uid) setFriendAsk({ owner: r.owner, name: r.name, code }); }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const makeRef = async () => {
    if (myRef) return myRef;
    for (let k = 0; k < 4; k++) {
      const code = newRefCode(people.me.first);
      try { await cloud.createRef(code, displayName(people.me)); await cloud.setMine("", { refCode: code }, true); setMyRef(code); return code; }
      catch (e) { if (!/permission/.test((e && e.code) || "")) throw e; } // taken: try another
    }
    throw new Error("Couldn't make an invite code. Try again.");
  };
  /* ---- Friends with accounts ---- */
  const [friendList, setFriendList] = useState([]); // [{ id: uid, via }]
  const [friendCards, setFriendCards] = useState({}); // uid -> their profile card
  const [requests, setRequests] = useState([]); // [{ id: uid, name }] waiting for you to accept
  useEffect(() => {
    if (!cloud.watchFriends) return undefined;
    const a = cloud.watchFriends(setFriendList, () => {}); const b = cloud.watchRequests(setRequests, () => {});
    return () => { a && a(); b && b(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const cardWatch = useRef({});
  useEffect(() => {
    const want = new Set([...friendList.map(f => f.id), ...requests.map(r => r.id)]);
    Object.keys(cardWatch.current).forEach(u => { if (!want.has(u)) { cardWatch.current[u](); delete cardWatch.current[u]; } });
    want.forEach(u => { if (!cardWatch.current[u]) cardWatch.current[u] = cloud.watchProfile(u, c => setFriendCards(m => ({ ...m, [u]: c })), () => {}); });
  }, [friendList, requests]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => Object.values(cardWatch.current).forEach(f => f()), []);
  // Friends with accounts join your players list (id u_<uid>), so you can pick them for a round.
  useEffect(() => {
    const ids = friendList.filter(f => friendCards[f.id]).map(f => `u_${f.id}`);
    setPeople(p => {
      let changed = false; const n = { ...p };
      friendList.forEach(f => {
        const c = friendCards[f.id]; if (!c) return;
        const v = { id: `u_${f.id}`, uid: f.id, name: c.first || c.name || "Friend", last: c.li || "", hi: typeof c.hi === "number" ? c.hi : 18, hk: c.hk || "", color: c.color || "#5E6B66" };
        if (JSON.stringify(p[v.id]) !== JSON.stringify(v)) { n[v.id] = v; changed = true; }
      });
      return changed ? n : p;
    });
    setFriendIds(f => {
      const keep = f.filter(id => !id.startsWith("u_") || ids.includes(id));
      const add = ids.filter(id => !keep.includes(id));
      return add.length || keep.length !== f.length ? [...keep, ...add] : f;
    });
  }, [friendList, friendCards]); // eslint-disable-line react-hooks/exhaustive-deps
  // Your own card, for your friends: name, colour, handicap and stats. Only rewritten when it changes.
  const cardSent = useRef("");
  useEffect(() => {
    if (!cloud.setProfile) return undefined;
    const me = people.me;
    const card = { name: displayName(me), first: (me.first || "").slice(0, 20), li: (me.last || "").trim().slice(0, 1).toUpperCase(), color: me.color || ME_COLOR, hi: me.hi, hk: me.hk || "", ref: myRef || "",
      stats: Object.fromEntries(["month", "season", "all"].map(k => [k, statsFor(history, "me", k)])) };
    const j = JSON.stringify(card); if (j === cardSent.current) return undefined;
    const t = setTimeout(() => { cloud.setProfile(card).then(() => { cardSent.current = j; }).catch(() => {}); }, 1200);
    return () => clearTimeout(t);
  }, [people.me, history.length, myRef]); // eslint-disable-line react-hooks/exhaustive-deps
  const findFriendCode = async raw => {
    const code = cleanRef(raw);
    if (!code) throw new Error("That doesn't look like a friend code. It's a name and four letters or numbers, like pierre-7k2m.");
    const r = await cloud.getRef(code);
    if (!r) throw new Error("No one has that code. Check it with your mate.");
    if (r.owner === user.uid) throw new Error("That's your own code. Send it to a mate instead.");
    return { owner: r.owner, name: r.name, code, friend: friendList.some(f => f.id === r.owner) };
  };
  const sendFriendRequest = async who => {
    const mine = requests.find(r => r.id === who.owner);
    if (mine) { await cloud.acceptRequest(who.owner); return "accepted"; } // they'd already asked you: that's a yes from both
    if (await cloud.hasRequested(who.owner)) return "sent"; // already waiting on them
    await cloud.sendRequest(who.owner, displayName(people.me)); return "sent";
  };
  const unfriend = uid => cloud.unfriend(uid);
  const [fx, setFx] = useState(null);
  const [tipK, setTipK] = useState(null);
  // Big moments queue up and play one at a time: tap for the next, or each goes by itself after a few seconds.
  const [moments, setMoments] = useState([]);
  const showMoments = list => setMoments(q => [...q, ...list.map(m => ({ ...m, key: Date.now() + Math.random() }))]);
  const showMoment = m => showMoments([m]);
  const moment = moments[0] || null;
  const nextMoment = () => setMoments(q => q.slice(1));
  useEffect(() => {
    if (!moment) return undefined;
    try { if (moment.sound && SFX[moment.sound]) SFX[moment.sound](); } catch (e) { /* sound is optional */ }
    const busts = moment.ouch && moment.ouch.length && moment.sound !== "bust";
    const b = busts ? setTimeout(() => { try { SFX.bust(); } catch (e) { /* optional */ } }, 1300) : null;
    const long = (moment.also && moment.also.length) || busts;
    const k = moment.key; const t = setTimeout(() => setMoments(q => (q[0] && q[0].key === k ? q.slice(1) : q)), long ? 5000 : 4500);
    return () => { clearTimeout(t); if (b) clearTimeout(b); };
  }, [moment && moment.key]); // eslint-disable-line react-hooks/exhaustive-deps
  const [rowFx, setRowFx] = useState({});
  const rowStamp = (id, word, sub, color) => {
    const key = Date.now() + Math.random();
    setRowFx(r => ({ ...r, [id]: { word, sub, color, key } }));
    setTimeout(() => setRowFx(r => { if (!r[id] || r[id].key !== key) return r; const n = { ...r }; delete n[id]; return n; }), 3100);
  };
  const celebrate = (kind, text, sub, badge) => { const key = Date.now() + Math.random(); setFx({ key, kind, text, sub, badge }); setTimeout(() => setFx(f => (f && f.key === key ? null : f)), 1500); };
  const [del, setDel] = useState(null);
  const [rulesFrom, setRulesFrom] = useState("tabs");
  const [saved, setSaved] = useState(() => parseJSON(profile.courses, []));
  const splash = false; // the splash screen is shown before sign-in
  const [about, setAbout] = useState(false);
  /* live rounds: { code, myId } where myId is the player this phone claimed (null = watching) */
  const [live, setLive] = useState(() => (start.live && start.live.code ? start.live : null));
  const [liveDoc, setLiveDoc] = useState(null);
  const [liveUid, setLiveUid] = useState(null);
  const [liveErr, setLiveErr] = useState("");
  const [liveSheet, setLiveSheet] = useState(false);
  const [joinCode, setJoinCode] = useState(PENDING_JOIN);
  const GUEST_COLORS = ["#9A7B3F", "#5E6E55", "#8B6B4A", "#6F7F73", "#A5543A"];
  const newPerson = ({ name, last, hi, hk }, guest) => {
    const id = (guest ? "g" : "f") + Date.now() + Math.floor(Math.random() * 99);
    setPeople(p => ({ ...p, [id]: { id, name, last: last || "", hi, hk: hk || "", guest, color: GUEST_COLORS[Object.keys(p).length % GUEST_COLORS.length] } }));
    return id;
  };
  const addGuest = g => newPerson(g, true);
  // Hidden rather than deleted, so past rounds with this guest still show their name, and Undo can bring them back.
  const forgetGuest = (id, on) => setPeople(p => (p[id] ? { ...p, [id]: { ...p[id], forgot: on || undefined } } : p));
  const addFriend = f => { const id = newPerson(f, false); setFriendIds(x => [...x, id]); };
  const saveCourse = c => setSaved(s => [c, ...s.filter(x => x.id !== c.id)]);
  const [trash, setTrash] = useState(() => (Array.isArray(start.trash) ? start.trash.filter(x => Date.now() - x.at < TRASH_MS) : []));
  // Paused rounds: a round that a new one replaced. { id, at, round, live } kept for PARK_MS.
  const [parked, setParked] = useState(() => (Array.isArray(start.parked) ? start.parked.filter(x => Date.now() - x.at < PARK_MS) : []));
  const [askNew, setAskNew] = useState(false);
  // Save to your account. Writes are batched a moment after the last change, and sent at once if the app is closed.
  const pending = useRef({});
  const flush = () => { const p = pending.current; pending.current = {}; Object.entries(p).forEach(([path, [data, merge]]) => cloud.setMine(path, data, merge).catch(() => {})); };
  const queue = (path, data, merge) => { pending.current[path] = [data, merge]; clearTimeout(pending.timer); pending.timer = setTimeout(flush, 700); };
  useEffect(() => {
    const go = () => { if (document.visibilityState === "hidden") flush(); };
    document.addEventListener("visibilitychange", go); window.addEventListener("pagehide", flush);
    return () => { document.removeEventListener("visibilitychange", go); window.removeEventListener("pagehide", flush); flush(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // After each new witnessed round: a player without an official handicap gets one worked out from their rounds.
  // The first one replaces the estimate; after that it drops straight away but only rises 1.0 a round.
  const hcpApplied = useRef(profile.hcpRounds || 0);
  useEffect(() => {
    const n = hcpDiffs.length;
    if (people.me.hk === "ga" || n < ROUNDS_NEEDED || n <= hcpApplied.current) return;
    hcpApplied.current = n;
    const next = nextIndex(people.me.hk === "app" ? people.me.hi : null, indexFrom(hcpDiffs));
    setPeople(p => ({ ...p, me: { ...p.me, hi: next, hk: "app" } }));
    cloud.setMine("", { hcpRounds: n }, true).catch(() => {});
    note(`Your Puntaro handicap is now ${next.toFixed(1)}, from ${n} live rounds.`, 10000);
  }, [hcpDiffs.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const booted = useRef(0);
  useEffect(() => { if (booted.current++ < 1) return; queue("", { people: JSON.stringify(people), friendIds, courses: JSON.stringify(saved), first: people.me.first || "", last: people.me.last || "", hi: people.me.hi, hcpKind: people.me.hk || "", golfId: people.me.golfId || "" }, true); }, [people, friendIds, saved]); // eslint-disable-line react-hooks/exhaustive-deps
  // Skip the save on first load, unless loading dropped something (an expired paused round): then tidy the account too.
  const bootedNow = useRef((Array.isArray(start.parked) && start.parked.some(x => Date.now() - x.at >= PARK_MS)) || (Array.isArray(start.trash) && start.trash.some(x => Date.now() - x.at >= TRASH_MS)) ? 1 : 0);
  useEffect(() => { if (bootedNow.current++ < 1) return; queue("state/now", { json: JSON.stringify({ round, live, parked, trash }), at: Date.now() }, false); }, [round, live, parked, trash]); // eslint-disable-line react-hooks/exhaustive-deps

  // A finished round, recorded in your account. id: the live code, or a new id for a round on this phone only.
  const resultFor = (r, myId, joined) => {
    const t = totalsFor(r, myId); const players = {};
    try {
      const pc = puntCalc(r); const ids = r.playerIds;
      const team = r.mode === "2v2" && r.teams ? teamRows(r, pc) : null;
      let winners = [];
      if (team) { const best = Math.max(...team.map(x => x.total)); const w = team.filter(x => x.total === best); if (w.length === 1) winners = ids.filter(id => r.teams[id] === w[0].k); }
      else { const best = Math.max(...ids.map(id => pc[id].total)); winners = ids.filter(id => pc[id].total === best); }
      // A joined player only knows the host's player ids, so they keep just their own result (as "me").
      (joined ? [myId] : ids).forEach(id => { players[joined ? "me" : id] = { pts: pc[id].total, ntp: r.opts.ntp ? r.ntp.filter((w, h) => w === id && PAR[h] === 3).length : 0, win: winners.includes(id) }; });
    } catch (e) { /* stats are a bonus; never block saving */ }
    return { gross: t.gross, net: r.useHcp ? t.net : t.gross, players };
  };
  // witnessed: a live round at least one other person joined. Only those count towards a Puntaro handicap.
  const record = (id, r, ppl, myId, lv, witnessed = false) => {
    const joined = !!lv && myId !== "me";
    const res = resultFor(r, myId, joined);
    const diff = myId ? differential(r, myId) : null;
    const names = Object.fromEntries(r.playerIds.map(pid => { const p = ppl[pid] || {}; return [pid, { id: pid, name: p.name || "?", first: p.first || "", last: (p.last || "").slice(0, 1), color: p.color || "#6F7F73", hi: p.hi ?? null }]; }));
    return cloud.setMine(`rounds/${id}`, { id, at: Date.now(), course: r.course.name, ...res, note: lv ? "Live round" : "Puntaro round", round: JSON.stringify(r), people: JSON.stringify(names), hidden: false, live: lv ? { code: lv.code, myId: myId || null } : null, diff, witnessed: !!witnessed }, false);
  };
  useEffect(() => {
    if (!parked.length) return undefined;
    const id = setInterval(() => setParkTick(Date.now()), 30000);
    return () => clearInterval(id);
  }, [parked.length]);
  const [parkTick, setParkTick] = useState(0);
  useEffect(() => {
    const gone = parked.filter(x => Date.now() - x.at >= PARK_MS);
    if (!gone.length) return;
    setParked(p => p.filter(x => !gone.some(g => g.id === x.id)));
  }, [parkTick]); // eslint-disable-line react-hooks/exhaustive-deps
  // Put the round in progress (if any) to one side so it can be picked up again.
  const park = () => { if (!round) return; const at = Date.now(); setParked(p => [{ id: at, at, round, live }, ...p].slice(0, 5)); };
  const resumeParked = x => {
    park();
    setParked(p => p.filter(y => y.id !== x.id));
    applyHoles(x.round.holes || null); setRound(x.round); setLive(x.live || null);
    setView("round");
  };
  const dropParked = x => { const at = Date.now(); setParked(p => p.filter(y => y.id !== x.id)); setTrash(t => [{ id: at, kind: "round", item: x.round, live: x.live || null, at }, ...t]); setNow(at); };
  const [now, setNow] = useState(Date.now());
  const armed = useRef(false);
  const ready = () => armed.current; // a click only counts after a fresh press on the sheet, so the finger lifting after a hold is ignored
  useEffect(() => {
    if (!trash.length) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [trash.length]);
  useEffect(() => {
    const gone = trash.filter(x => now - x.at >= TRASH_MS);
    if (!gone.length) return;
    setTrash(t => t.filter(x => !gone.some(g => g.id === x.id)));
  }, [now]); // eslint-disable-line react-hooks/exhaustive-deps
  const confirmDelete = () => {
    const at = Date.now();
    if (del.kind === "round") { setTrash(t => [{ id: at, kind: "round", item: round, live, at }, ...t]); setRound(null); setLive(null); }
    else { const item = recent[del.i]; setTrash(t => [{ id: at, kind: "recent", item, at }, ...t]); if (item.id) cloud.setMine(`rounds/${item.id}`, { hidden: true }, true).catch(() => {}); }
    setNow(at); setDel(null);
  };
  const restore = x => {
    setTrash(t => t.filter(y => y.id !== x.id));
    if (x.kind === "round") {
      park(); // the round in progress is paused, not deleted
      applyHoles(x.item.holes || null); setRound(x.item); setLive(x.live || null);
    } else if (x.item && x.item.id) cloud.setMine(`rounds/${x.item.id}`, { hidden: false }, true).catch(() => {});
  };

  // Follow the live round: every change on any phone arrives in liveDoc.
  const [shown, setShown] = useState({}); // revealed bank calls, "pid_h" -> true / false / null (no call)
  const fetched = useRef(new Set());      // holes whose calls this phone has fetched
  const prevDoc = useRef(null);
  const [liveNotes, setLiveNotes] = useState([]); // short messages that stack, newest last
  const note = (t, ms = 5000) => { const id = Date.now() + Math.random(); setLiveNotes(n => [...n.filter(x => x.t !== t), { id, t }].slice(-3)); setTimeout(() => setLiveNotes(n => n.filter(x => x.id !== id)), ms); };
  useEffect(() => {
    fetched.current = new Set(); prevDoc.current = null; setShown({});
    if (!live) { setLiveDoc(null); setLiveErr(""); return undefined; }
    let off = () => {}; let dead = false;
    backend().then(b => {
      if (dead) return;
      setLiveUid(b.uid);
      off = b.watch(live.code, d => {
        if (!d) {
          // Not created yet, or no longer online (older versions removed finished rounds): keep our copy.
          if (prevDoc.current) { prevDoc.current = null; setLive(l => (l && !l.ended ? { ...l, ended: true } : l)); note("This live round is no longer online. Your copy is kept in your account."); }
          return;
        }
        setLiveErr(""); applyHoles(d.base.holes || null);
        const was = prevDoc.current; prevDoc.current = d;
        if (was && was.scoring !== d.scoring) note(`${d.people.me ? d.people.me.name : "The host"} switched to ${d.scoring === "one" ? "one scorer" : "everyone scores"}.`);
        setLiveDoc(d);
      }, () => setLiveErr("Offline. Scores you enter are saved and will sync when you're back."));
    }).catch(() => setLiveErr("Couldn't connect to live rounds. Scores are saved on this phone."));
    return () => { dead = true; off(); };
  }, [live && live.code]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reveal: once everyone has moved past a hole, fetch that hole's bank calls (now readable by all).
  useEffect(() => {
    if (!live || !liveDoc) return;
    const up = revealUpTo(liveDoc); const ids = liveDoc.base.playerIds;
    const firstLook = fetched.current.size === 0 && !fetched.current.started; fetched.current.started = true;
    for (let h = 0; h < up; h++) {
      if (fetched.current.has(h)) continue;
      fetched.current.add(h);
      const fresh = !firstLook && h === up - 1;
      backend().then(b => Promise.all(ids.map(id => b.getBank(live.code, id, h).catch(() => null)))).then(vals => {
        setShown(sh => { const n = { ...sh }; ids.forEach((id, k) => { n[bankKey(id, h)] = vals[k]; }); return n; });
        if (fresh && liveDoc.scoring === "each") {
          const who = ids.filter((id, k) => vals[k] && id !== live.myId).map(id => (liveDoc.people[id] || {}).name);
          if (who.length) { note(`Hole ${h + 1}: ${who.join(", ")} banked.`); ids.forEach((id, k) => { if (vals[k] && id !== live.myId) rowStamp(id, "BANKED", `HOLE ${h + 1}`, "#2F4A3A"); }); } else note(`Hole ${h + 1}: nobody else banked. Pots ride on.`);
        }
      });
    }
  }, [liveDoc]); // eslint-disable-line react-hooks/exhaustive-deps

  // Rebuild the round whenever the shared round, the revealed calls or my own calls change.
  const mine = (live && live.mine) || {};
  const dealt = useRef({}); // card hole -> the deal this phone checked and accepted
  useEffect(() => { dealt.current = {}; }, [live && live.code]);
  useEffect(() => {
    if (!live || !liveDoc) return;
    const r = docToRound(liveDoc, { bank: bankMap(liveDoc, shown, mine) });
    // Every deal is re-checked against the shared shuffle (drawSeed). The deal is a pure function of the
    // seed and the scores so far, so an honest deal always matches; a hand-picked one is ignored.
    const warn = [];
    if (r.opts.cards) range18.forEach(h => {
      if (!cardHole(h)) return;
      if (!canDeal(h, liveDoc)) { r.draws[h] = null; return; }
      if (!r.draws[h]) { if (dealt.current[h]) r.draws[h] = dealt.current[h]; return; } // not saved yet: this phone's own deal
      // The saved deal is what everyone plays with. It's checked against the shuffle: each card must be one the seed
      // could have dealt that player (blessing or curse, depending on the catch-up odds). Editing an earlier score
      // later changes the odds, so the saved deal is never re-dealt because of that.
      const saved = Object.fromEntries(r.playerIds.map(id => [id, r.draws[h][id]]));
      if (dealOk(r.drawSeed, h, r.playerIds, saved)) { dealt.current[h] = saved; r.draws[h] = saved; return; }
      const fair = dealt.current[h] || drawCards(r, h, mulberry32(r.drawSeed + h * 977));
      warn.push(h); dealt.current[h] = fair; r.draws[h] = fair;
    });
    warn.forEach(h => note(`The cards on hole ${h + 1} didn't match the shuffle, so this phone dealt them fairly itself.`));
    setRound(prev => ({ ...r, hole: prev ? prev.hole : firstOpenHole(liveDoc), seen: prev ? prev.seen : r.seen }));
  }, [liveDoc, shown, live && live.mine]); // eslint-disable-line react-hooks/exhaustive-deps

  const [dealTry, setDealTry] = useState(0); const dealRetry = useRef(null);
  // Card holes: in "everyone scores", deal only once the last hole's calls are revealed, so the catch-up odds see true totals.
  const canDeal = (h, d = liveDoc) => !live || !d || d.scoring !== "each" || revealUpTo(d) >= h;
  useEffect(() => {
    if (!live || !liveDoc || !round || !round.opts.cards) return;
    const h = round.hole;
    if (cardHole(h) && (!round.draws[h] || !(liveDoc.draws || {})[h]) && canDeal(h)) {
      // The deal is the same on every phone (the shared shuffle plus the scores so far), so show it here
      // straight away rather than waiting on the network, and keep trying to save it for the group.
      const d = dealt.current[h] || drawCards(round, h, mulberry32(round.drawSeed + h * 977));
      if (!round.draws[h]) { dealt.current[h] = d; setRound(r => (r && !r.draws[h] ? { ...r, draws: r.draws.map((x, i) => (i === h ? d : x)) } : r)); }
      if (!(liveDoc.draws || {})[h] && (amHost() || liveDoc.scoring === "each")) {
        backend().then(b => b.setIfAbsent(live.code, ["draws", h], d, [[["deal"], h]], amHost())).catch(() => {
          clearTimeout(dealRetry.current); dealRetry.current = setTimeout(() => setDealTry(n => n + 1), 4000);
        });
      }
    }
  }, [liveDoc, shown, round && round.hole, dealTry]); // eslint-disable-line react-hooks/exhaustive-deps

  const amHost = () => !!(liveDoc && liveUid && liveDoc.host === liveUid);
  const push = (pairs, quiet) => { if (!live || live.ended) return Promise.resolve(); return backend().then(b => b.update(live.code, pairs, amHost())).catch(() => { if (!quiet) setLiveErr("Offline. Scores you enter are saved and will sync when you're back."); }); };
  // Moving on locks your bank call for the hole you left. Never goes backwards.
  const moveOn = h => { if (live && !live.ended && live.myId && liveDoc && h > ((liveDoc.at || {})[live.myId] || 0)) push([[["at", live.myId], Math.min(18, h)], [["who"], live.myId]]); };
  const nextEvent = (x, k) => ({ ...Object.fromEntries(Object.entries(x || {}).filter(([e]) => (x && x[k]) || !(CLASH[k] || []).includes(e))), [k]: !(x && x[k]) });
  const [liveStart, setLiveStart] = useState(null); // { busy } while creating, { err } if it failed
  const startLive = async (r, cfg) => {
    const code = newCode();
    setLiveStart({ busy: true }); setLiveSheet(true);
    try {
      const b = await backend();
      const name = cfg.live.name || people.me.first || "Host";
      if (cfg.live.name && !people.me.first) setPeople(p => ({ ...p, me: { ...p.me, first: cfg.live.name } }));
      // Wait for Firebase to accept the round, so the code we show really works.
      // With no signal it never answers: after 8 seconds go ahead, and it syncs when the phone reconnects.
      const made = b.create(code, roundToDoc(r, people, { code, uid: b.uid, scoring: cfg.live.scoring, myName: name }));
      await Promise.race([made, new Promise(res => setTimeout(res, 8000))]);
      setLive({ code, myId: "me", mine: {} }); setLiveStart(null);
    } catch (e) { setLiveStart({ err: explain(e) }); }
  };
  const joined = (code, pid, d) => {
    if (round && !(live && live.code === code)) park();
    applyHoles(d.base.holes || null);
    setRound(docToRound(d, { hole: Math.max(firstOpenHole(d), pid && d.at ? d.at[pid] || 0 : 0) }));
    setLiveDoc(d); setLive({ code, myId: pid, mine: {} }); setJoinCode(null); setView("round");
  };
  const leaveLive = () => { setLive(null); setLiveSheet(false); };

  const api = {
    celebrate, moment: showMoment, moments: showMoments, rowStamp,
    setScore: (id, h, v) => {
      const prev = round.scores[id][h]; const who = (live && live.myId) || "watch";
      const pairs = [[["s", id, h], v], [["by", bankKey(id, h)], who]];
      // Tapping +/- while on the hole is just entering the score. It's an edit when the hole is
      // already finished: the group has moved past it, or this phone has.
      const holeDone = liveDoc && (h < revealUpTo(liveDoc) || (live.myId && h < ((liveDoc.at || {})[live.myId] || 0)));
      if (live && holeDone && prev != null && prev !== v && liveDoc.s && liveDoc.s[id] && liveDoc.s[id][h] != null) pairs.push([["ed", bankKey(id, h)], who]);
      push(pairs); setRound(r => ({ ...r, scores: { ...r.scores, [id]: r.scores[id].map((x, i) => (i === h ? v : x)) } }));
    },
    setBank: (id, h, v) => {
      if (v) { SFX.bank(); try { const st = puntCalc(round)[id]; const pot = st.potAt[h] != null ? st.potAt[h] : st.pot; if (pot > 0) rowStamp(id, "BANKING", `AFTER HOLE ${h + 1}`, "#2F4A3A"); } catch (e) { /* fine */ } }
      if (live && !live.ended && liveDoc && liveDoc.scoring === "each") {
        // Secret call: stored where only this phone can read it until the reveal.
        setLive(l => ({ ...l, mine: { ...(l.mine || {}), [bankKey(id, h)]: v } }));
        backend().then(b => b.putBank(live.code, id, h, v)).catch(() => setLiveErr("That bank call didn't save. It may be locked, or you're offline."));
      } else push([[["bk", id, h], v]]);
      return setRound(r => ({ ...r, bank: { ...r.bank, [id]: r.bank[id].map((x, i) => (i === h ? v : x)) } }));
    },
    setNtp: (h, id) => { push([[["ntp", h], round.ntp[h] === id ? null : id]]); setRound(r => ({ ...r, ntp: r.ntp.map((x, i) => (i === h ? (x === id ? null : id) : x)) })); },
    setEvent: (id, h, k) => { push([[["ev", id, h], nextEvent(round.events[id][h], k)]]); setRound(r => ({ ...r, events: { ...r.events, [id]: r.events[id].map((x, i) => (i === h ? nextEvent(x, k) : x)) } })); },
    setWolf: (h, v) => { push([[["wolf", h], v]]); setRound(r => ({ ...r, wolf: r.wolf.map((x, i) => (i === h ? v : x)) })); },
    setBbb: (h, k, id) => { const x = round.bbb[h]; push([[["bbb", h], { ...(x || {}), [k]: x && x[k] === id ? null : id }]]); setRound(r => ({ ...r, bbb: r.bbb.map((x, i) => (i === h ? { ...(x || {}), [k]: x && x[k] === id ? null : id } : x)) })); },
    markSeen: h => setRound(r => ({ ...r, seen: r.seen.map((x, i) => (i === h ? true : x)) })),
    setHole: h => {
      moveOn(h);
      setRound(r => {
        let draws = r.draws;
        // Live rounds deal through the shared round (see above); a solo round deals here.
        if (!live && r.opts.cards && cardHole(h) && !draws[h]) { draws = draws.slice(); draws[h] = drawCards(r, h, mulberry32(r.drawSeed + h * 977)); }
        return { ...r, hole: h, draws };
      });
    },
  };

  const board = ["me", ...friendIds].filter(id => people[id]).map(id => ({ id, v: (statsFor(history, id, "month") || {}).pts })).filter(r => r.v != null).sort((a, b) => b.v - a.v);

  // Finish: a round on this phone is recorded straight away. A live round is finished for everyone
  // (host, or anyone once it's been quiet for 6 hours); every player's account then records it.
  const save = () => {
    if (live && !live.ended && liveDoc) { finishLive(); return; }
    const myId = live ? live.myId : "me";
    if (live && !myId) { setLive(null); setRound(null); setView("tabs"); setTab("home"); return; }
    record(live ? live.code : `r${Date.now()}`, round, roundPeople, myId, live).catch(() => note("Couldn't save that round. Check your connection and try again."));
    setLive(null); setRound(null); setView("tabs"); setTab("history");
  };
  const finishLive = () => {
    backend().then(b => b.finish(live.code, amHost())).catch(e => note(explain(e)));
  };
  // Record a finished live round in this account: fetch every bank call (all readable once it's finished).
  const recordLive = async (lv, d) => {
    if (!lv || !lv.myId) return;
    if (finished.some(f => f.id === d.code)) return; // already in this account
    const b = await backend(); const ids = d.base.playerIds; const shownAll = {};
    await Promise.all(ids.flatMap(id => range18.map(h => b.getBank(d.code, id, h).then(v => { shownAll[bankKey(id, h)] = v; }).catch(() => { shownAll[bankKey(id, h)] = null; }))));
    const r = docToRound({ ...d, done: true }, { bank: bankMap({ ...d, done: true }, shownAll, {}) });
    Object.entries(dealt.current || {}).forEach(([h, v]) => { r.draws[h] = v; });
    const ppl = Object.fromEntries(Object.entries(d.people).map(([k, v]) => [k, { id: k, ...v }]));
    await record(d.code, r, ppl, lv.myId, lv, Object.keys(d.claims || {}).length >= 2);
  };
  const recording = useRef(false);
  useEffect(() => {
    if (!live || !liveDoc || !liveDoc.done || recording.current) return;
    recording.current = true;
    const lv = live;
    recordLive(lv, liveDoc).then(() => {
      setLive(l => (l && l.code === lv.code ? null : l)); setRound(r => (r && live && live.code === lv.code ? null : r));
      setView(v => (v === "round" || v === "summary" ? "tabs" : v)); setTab(lv.myId ? "history" : "home");
      note(lv.myId ? "Round finished. It's saved in your Round history." : "Round finished.");
    }).catch(() => note("Couldn't save the finished round. It'll try again next time you open the app.")).finally(() => { recording.current = false; });
  }, [liveDoc && liveDoc.done]); // eslint-disable-line react-hooks/exhaustive-deps
  // Paused live rounds that were finished while you were away: record them and clear them out.
  useEffect(() => {
    const waiting = parked.filter(x => x.live && x.live.code);
    if (!waiting.length) return;
    backend().then(b => Promise.all(waiting.map(async x => {
      const d = await b.get(x.live.code).catch(() => null);
      if (d && d.done) { await recordLive(x.live, d); setParked(p => p.filter(y => y.id !== x.id)); }
    }))).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const tabs = [["home", "Home", HomeIcon], ["history", "History", ClockIcon], ["friends", "Friends", UsersIcon], ["me", "Me", UserIcon]];
  const openRound = id => {
    const rec = finished.find(f => f.id === id); if (!rec || !rec.round) return;
    const r = parseJSON(rec.round, null); if (!r) return;
    applyHoles(r.holes || null);
    setOpenRec({ rec, round: r, people: parseJSON(rec.people, {}) }); setView("card");
  };
  // Live round footer on the summary: the host finishes it for everyone; others wait (or finish after 6 quiet hours).
  const liveFooter = () => {
    if (!live || live.ended || !liveDoc) return null;
    const host = liveDoc.host === liveUid;
    const quiet = liveDoc.hostAt && Date.now() - liveDoc.hostAt > 6 * 3600 * 1000; // the host's phone has been silent
    const hostName = liveDoc.people.me ? liveDoc.people.me.name : "The host";
    if (host || quiet) return (
      <>
        <p className="cap" style={{ textAlign: "center", marginBottom: 6 }}>{host ? "This finishes the live round for everyone and saves it to every player's account." : `Nothing from ${hostName}'s phone for 6 hours, so anyone in the round can finish it.`}</p>
        <button className="cta" onClick={finishLive}>{host ? "Finish round" : "Finish for everyone"}</button>
      </>
    );
    return (
      <>
        <p className="cap" style={{ textAlign: "center", marginBottom: 6 }}>{hostName} finishes the round for everyone. It's saved to your account automatically when they do.</p>
        <button className="cta" disabled>Waiting for {hostName}</button>
        <button className="chip" style={{ marginTop: 6, padding: "7px 0", textAlign: "center", width: "100%" }} onClick={() => { setView("tabs"); setTab("home"); }}>Back to Home</button>
      </>
    );
  };
  // Account actions
  const signOut = async () => { flush(); try { await cloud.signOut(); } catch (e) { /* fine */ } location.reload(); };
  const wipe = async () => {
    flush();
    const ids = await cloud.listMine("rounds").catch(() => []);
    await Promise.all(ids.map(id => cloud.deleteMine(`rounds/${id}`)));
    await cloud.deleteMine("state/now").catch(() => {});
    await cloud.deleteMine("");
  };
  const startFresh = async () => { try { await wipe(); location.reload(); } catch (e) { note(explain(e)); } };
  const deleteAccount = async () => {
    // Deleting your account also ends your friendships and removes the card your friends see.
    if (cloud.unfriend) { await Promise.all(friendList.map(f => cloud.unfriend(f.id).catch(() => {}))); await cloud.deleteProfile().catch(() => {}); }
    try { await wipe(); } catch (e) { note(explain(e)); return; }
    try { await cloud.deleteLogin(); await cloud.signOut().catch(() => {}); location.reload(); }
    catch (e) { note(/requires-recent-login/.test((e && e.code) || "") ? "Your rounds and stats are deleted. To remove your login too, sign out, sign in again, then tap Delete account." : explain(e)); }
  };

  const roundPeople = live && liveDoc ? { ...people, ...Object.fromEntries(Object.entries(liveDoc.people).map(([k, v]) => [k, { id: k, ...v }])) } : people;
  const can = live && liveDoc ? {
    ...rights(liveDoc, liveUid, mine),
    live: { code: live.code, hostName: liveDoc.people.me ? liveDoc.people.me.name : "The host", myId: live.myId },
    canDeal,
    // Players on other phones who haven't reached hole h yet (cards on h wait for them).
    waitingOn: h => liveDoc.base.playerIds.filter(id => (liveDoc.claims || {})[id] && ((liveDoc.at || {})[id] || 0) < h && id !== live.myId).map(id => (liveDoc.people[id] || {}).name || "a player"),
    enteredBy: (id, h) => { const by = liveDoc.by && liveDoc.by[bankKey(id, h)]; return by && by !== id ? (by === "watch" ? "a watcher" : (liveDoc.people[by] || {}).name || "someone") : null; },
    edited: (id, h) => !!(liveDoc.ed && liveDoc.ed[bankKey(id, h)]),
  } : live ? { score: () => true, bank: () => true, hidden: () => false, host: true, canDeal: () => true, live: { code: live.code, hostName: "The host", myId: live.myId } }
    : { score: () => true, bank: () => true, hidden: () => false, host: true, canDeal: () => true, live: null };

  return (
    <LiveCtx.Provider value={can}>
    <TipCtx.Provider value={setTipK}>
    <div className={`sg${dark ? " dark" : ""}`} onClickCapture={e => { if (e.target.closest && e.target.closest("button")) setTimeout(() => { if (SFX.sinceSpecial() > 60) SFX.tap(); }, 0); }}>
      <style>{CSS}</style>
      <Celebrate fx={fx} />
      <Moment m={moment} more={moments.length > 1} onDone={nextMoment} />
      {friendAsk && !friendList.some(f => f.id === friendAsk.owner) && <FriendAsk who={friendAsk} onSend={() => sendFriendRequest(friendAsk)} onClose={() => setFriendAsk(null)} />}
      <TipSheet k={tipK} onClose={() => setTipK(null)} />
      {about && <AboutSheet onClose={() => setAbout(false)} />}
      {askNew && round && (
        <div style={{ position: "fixed", inset: 0, maxWidth: 430, margin: "0 auto", zIndex: 40, display: "flex", alignItems: "flex-end", background: "rgba(0,0,0,.6)" }} onClick={() => setAskNew(false)}>
          <div className="sheet card" role="dialog" aria-label="Round in progress" onClick={e => e.stopPropagation()} style={{ width: "100%", padding: 12, boxShadow: "none" }}>
            <h2 className="h2">You've got a round going</h2>
            <p className="cap" style={{ marginTop: 3 }}>{round.course.name}, hole {round.hole + 1} of 18{live ? `, live ${live.code}` : ""}.</p>
            <div style={{ display: "grid", gap: 6, marginTop: 10 }}>
              <button className="cta" onClick={() => { setAskNew(false); setView("round"); }}>Resume {round.course.name}</button>
              <button className="chip" style={{ padding: "8px 0", textAlign: "center" }} onClick={() => { setAskNew(false); setView("setup"); }}>Start a new round</button>
            </div>
            <p className="cap" style={{ marginTop: 7, textAlign: "center" }}>Start a new one and {round.course.name} moves to Paused rounds on Home for 24 hours, so you can pick it up again.{live && live.myId ? " While it's paused, your group's bank calls can't be revealed until you're back or the host frees your seat." : ""}</p>
          </div>
        </div>
      )}
      {joinCode != null && !splash && <JoinSheet initial={joinCode} onClose={() => { stash(JOIN_KEY, null); setJoinCode(null); }} onJoined={(...a) => { stash(JOIN_KEY, null); joined(...a); }} />}
      {liveSheet && !live && liveStart && <LiveStartSheet state={liveStart} onClose={() => { setLiveSheet(false); setLiveStart(null); }} />}
      {liveSheet && live && <LiveSheet refCode={myRef} code={live.code} doc={liveDoc} uid={liveUid} onClose={() => setLiveSheet(false)} onScoring={v => push([[["scoring"], v]])} onRelease={pid => push([[["claims", pid], DELETE]])} onLeave={leaveLive} />}
      {liveNotes.length > 0 && <div role="status" style={{ position: "fixed", left: 0, right: 0, top: 10, maxWidth: 430, margin: "0 auto", zIndex: 45, padding: "0 12px", pointerEvents: "none", display: "grid", gap: 6 }}>{liveNotes.map(n => <div key={n.id} style={{ background: "var(--flag)", color: "var(--dk)", fontWeight: 700, fontSize: 13, padding: "7px 10px", border: "3px solid var(--night)" }}>{n.t}</div>)}</div>}
      {liveErr && view === "round" && <div role="status" style={{ position: "fixed", left: 0, right: 0, bottom: 74, maxWidth: 430, margin: "0 auto", zIndex: 25, padding: "0 12px", pointerEvents: "none" }}><div className="cap" style={{ background: "var(--dk)", color: "#EDE8DD", padding: "6px 9px", border: "2px solid var(--night)" }}>{liveErr}</div></div>}
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
      {view === "setup" && <Setup people={people} friendIds={friendIds} saved={saved} onSaveCourse={saveCourse} onAddGuest={addGuest} onForgetGuest={forgetGuest} friendKit={{ setFriendIds, myRef, makeRef, onFind: findFriendCode, onSend: sendFriendRequest, onAddFriend: addFriend }} onBack={() => setView("tabs")} onGo={cfg => { SFX.swing(); park(); const r = buildRound(cfg, people, false); setLive(null); setLiveErr(""); setRound(r); setView("round"); if (cfg.live) startLive(r, cfg); }} />}
      {view === "round" && round && <Round round={round} people={roundPeople} api={api} rowFx={rowFx} onLive={() => setLiveSheet(true)} onBack={() => { setView("tabs"); setTab("home"); }} onFinish={() => { moveOn(18); setView("summary"); }} onRules={() => { setRulesFrom("round"); setView("rules"); }} />}
      {view === "rules" && <Rules onBack={() => setView(rulesFrom)} />}
      {view === "summary" && round && <Summary round={round} people={roundPeople} onSave={save} onBack={() => setView("round")} footer={liveFooter()} />}
      {view === "card" && openRec && <Summary record={openRec.rec} round={openRec.round} people={openRec.people} onBack={() => { setOpenRec(null); setView("tabs"); }} />}
      {view === "tabs" && (
        <>
          <div style={{ flex: 1 }}>
            {tab === "home" && <Home onAbout={() => setAbout(true)} onRules={() => { setRulesFrom("tabs"); setView("rules"); }} askDelete={(kind, i) => { armed.current = false; setDel({ kind, i }); }} trash={trash} now={now} onRestore={restore} dark={dark} setDark={setDark} people={people} round={round} recent={recent} board={board} onOpenRound={openRound} onStart={() => (round ? setAskNew(true) : setView("setup"))} onLiveDetails={() => setLiveSheet(true)} parked={parked} onResumeParked={resumeParked} onDropParked={dropParked} onJoin={() => setJoinCode("")} liveCode={live ? live.code : null} onResume={() => setView("round")} goFriends={() => setTab("friends")} />}
            {tab === "history" && <History recent={recent} askDelete={(kind, i) => { armed.current = false; setDel({ kind, i }); }} onOpenRound={openRound} trash={trash} now={now} onRestore={restore} />}
            {tab === "friends" && <Friends history={history} people={people} friendIds={friendIds} setFriendIds={setFriendIds} onAddFriend={addFriend} friendCards={friendCards} requests={requests} onAccept={id => cloud.acceptRequest(id)} onDecline={id => cloud.declineRequest(id)} onFind={findFriendCode} onSend={sendFriendRequest} onUnfriend={unfriend} myRef={myRef} makeRef={makeRef} />}
            {tab === "me" && <Me history={history} people={people} setPeople={setPeople} dark={dark} setDark={setDark} saved={saved} onAbout={() => setAbout(true)} user={user} onSignOut={signOut} onStartFresh={startFresh} onDeleteAccount={deleteAccount} myRef={myRef} makeRef={makeRef} cloud={cloud} />}
          </div>
          <nav style={{ position: "sticky", bottom: 0, display: "flex", background: "var(--card)", borderTop: "4px solid var(--night)", padding: "6px 9px 11px", gap: 5 }}>
            {tabs.map(([k, l, I]) => (
              <button key={k} onClick={() => setTab(k)} aria-current={tab === k} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "6px 0", borderRadius: 16, background: tab === k ? "var(--sel)" : "transparent", color: tab === k ? "var(--ink)" : "var(--muted)", fontWeight: 700, fontSize: 11 }}>
                <span style={{ position: "relative", display: "grid" }}><I size={22} />{k === "friends" && requests.length > 0 && <span aria-label={`${requests.length} friend request${requests.length > 1 ? "s" : ""}`} style={{ position: "absolute", top: -4, right: -9, minWidth: 16, height: 16, padding: "0 3px", background: "var(--red)", color: "#fff", fontSize: 11, fontWeight: 700, display: "grid", placeItems: "center" }}>{requests.length}</span>}</span>{l}
              </button>
            ))}
          </nav>
        </>
      )}
    </div>
    </TipCtx.Provider>
    </LiveCtx.Provider>
  );
}

/* ───────────── ACCOUNTS ───────────── */
const screen = { minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "24px 16px", gap: 14, maxWidth: 430, margin: "0 auto" };

function Loading({ text = "Loading your rounds…" }) {
  return <div style={{ ...screen, alignItems: "center" }} role="status"><Tiles size={22} /><p className="cap" style={{ marginTop: 6 }}>{text}</p></div>;
}

function SignIn({ cloud, startErr }) {
  const link = cloud && cloud.isEmailLink(START_URL) ? START_URL : null;
  const stored = (() => { try { return localStorage.getItem(EMAIL_KEY) || ""; } catch (e) { return ""; } })();
  const [email, setEmail] = useState(stored);
  const [sent, setSent] = useState(false);
  const [pasted, setPasted] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(startErr || "");
  const okEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
  const finish = async (em, url) => {
    if (!okEmail(em)) { setErr("Enter the email address you sent the link to."); return; }
    setBusy(true); setErr("");
    try { await cloud.finishEmailLink(em.trim(), url); try { window.history.replaceState(null, "", location.pathname); } catch (e) { /* fine */ } }
    catch (e) { setErr(explain(e)); setBusy(false); }
  };
  useEffect(() => { if (link && stored) finish(stored, link); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const google = async () => { setBusy(true); setErr(""); try { await cloud.signInGoogle(); } catch (e) { setErr(explain(e)); setBusy(false); } };
  const send = async () => {
    if (!okEmail(email)) { setErr("Enter your email address."); return; }
    setBusy(true); setErr("");
    try { await cloud.sendEmailLink(email.trim()); setSent(true); } catch (e) { setErr(explain(e)); }
    setBusy(false);
  };
  const usePasted = () => {
    const url = pasted.trim();
    if (!cloud.isEmailLink(url)) { setErr("That isn't a Puntaro sign-in link. Copy the whole link from the email."); return; }
    finish(email, url);
  };
  return (
    <div style={screen}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}><Tiles size={26} /></div>
      {link && !stored ? (
        <>
          <h1 style={{ textAlign: "center" }}>Finish signing in</h1>
          <p className="cap" style={{ textAlign: "center" }}>Confirm the email address you sent the link to.</p>
          <input aria-label="Email address" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} style={{ ...inp, fontSize: 16 }} />
          <button className="cta" disabled={busy} onClick={() => finish(email, link)}>{busy ? "Signing in…" : "Sign in"}</button>
        </>
      ) : link ? (
        <Loading text="Signing you in…" />
      ) : (
        <>
          <h1 style={{ textAlign: "center" }}>Sign in to play</h1>
          <p className="cap" style={{ textAlign: "center" }}>Your rounds, scoresheets and stats are saved to your account, so they're safe and the same on any phone.</p>
          <button className="cta" disabled={busy} onClick={google}>Continue with Google</button>
          <div className="cap" style={{ textAlign: "center" }}>or</div>
          {!sent ? (
            <>
              <input aria-label="Email address" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => { if (e.key === "Enter") send(); }} style={{ ...inp, fontSize: 16 }} />
              <button className="chip" disabled={busy} style={{ padding: "9px 0", textAlign: "center" }} onClick={send}>Email me a sign-in link</button>
              <p className="cap" style={{ textAlign: "center" }}>No password. We email you a link; tap it to sign in.</p>
            </>
          ) : (
            <div className="card" style={{ padding: 12 }}>
              <p style={{ fontWeight: 700 }}>Check your email</p>
              <p className="cap" style={{ marginTop: 3 }}>We sent a sign-in link to {email.trim()}. Open it on this phone. Can't see it? Check junk.</p>
              <p className="cap" style={{ marginTop: 9 }}>Using Puntaro from your iPhone home screen? Links open in Safari instead, so copy the link from the email (press and hold it) and paste it here:</p>
              <input aria-label="Paste sign-in link" placeholder="Paste the link" value={pasted} onChange={e => setPasted(e.target.value)} style={{ ...inp, marginTop: 6 }} />
              <button className="cta" style={{ marginTop: 6 }} disabled={busy || !pasted.trim()} onClick={usePasted}>Sign in</button>
              <button className="chip" style={{ marginTop: 6, padding: "6px 0", textAlign: "center", width: "100%" }} onClick={() => { setSent(false); setPasted(""); }}>Use a different email</button>
            </div>
          )}
        </>
      )}
      {err && <p className="cap" role="alert" style={{ color: "var(--red)", fontWeight: 600, textAlign: "center" }}>{err}</p>}
    </div>
  );
}

// What's on this phone from before accounts, ready to move into the account. Sample data is left behind.
const DEMO_IDS = ["sam", "priya", "jake", "maya", "leo", "dani", "omar"];
function phoneData() {
  const s = loadAppState(); const courses = loadSaved();
  if (!s && !courses.length) return null;
  const hist = s && Array.isArray(s.history) ? s.history : [];
  const realRecent = s && Array.isArray(s.recent) ? s.recent.filter(r => !r.sample) : [];
  const playing = s && s.round && !s.round.sample ? s.round : null;
  const parked = s && Array.isArray(s.parked) ? s.parked.filter(x => Date.now() - x.at < PARK_MS) : [];
  if (!hist.length && !courses.length && !playing && !parked.length) return null;
  const used = new Set(["me"]);
  hist.forEach(h => Object.keys(h.players || {}).forEach(id => used.add(id)));
  [playing, ...parked.map(x => x.round)].forEach(r => r && r.playerIds.forEach(id => used.add(id)));
  const ppl = (s && s.people) || {};
  const people = Object.fromEntries(Object.entries(ppl).filter(([id]) => used.has(id) || !DEMO_IDS.includes(id)));
  const friendIds = (s && Array.isArray(s.friendIds) ? s.friendIds : []).filter(id => people[id]);
  // Older saves kept a one-line summary (recent, newest first) and the stats (history, oldest first) separately.
  const records = hist.map((h, i) => {
    const r = realRecent.length === hist.length ? realRecent[hist.length - 1 - i] : null;
    return { id: `imp${h.at || i}`, at: h.at || Date.now(), course: h.course || (r && r.course) || "Round", gross: r ? r.gross : null, net: r ? r.net : null, note: "From your phone", players: h.players || {}, round: null, people: null, hidden: false, live: null };
  });
  return { people, friendIds, courses, records, now: { round: playing, live: playing && s.live ? s.live : null, parked, trash: [] }, counts: { rounds: records.length, courses: courses.length, playing: !!playing || parked.length > 0 } };
}
const forgetPhoneData = () => { try { localStorage.removeItem(STATE_KEY); localStorage.removeItem(SAVED_KEY); } catch (e) { /* fine */ } };

function ProfileSetup({ cloud, user, onDone }) {
  const local = useState(phoneData)[0];
  const [inviter, setInviter] = useState(null); // { code, name }
  useEffect(() => {
    const code = unstash(REF_KEY); if (!code) return;
    cloud.getRef(code).then(r => { if (r && r.owner !== user.uid) setInviter({ code, name: r.name, owner: r.owner }); }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const guess = (user.name || "").trim().split(/\s+/);
  const [first, setFirst] = useState(guess[0] || "");
  const [last, setLast] = useState(guess.length > 1 ? guess[guess.length - 1] : "");
  const [hp, setHp] = useState({ mode: null, hi: "", usual: null });
  const [bring, setBring] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const go = async () => {
    const picked = pickHcp(hp);
    if (!first.trim()) { setErr("Enter your first name."); return; }
    if (picked.err) { setErr(picked.err); return; }
    setBusy(true); setErr("");
    const me = { ...((local && bring && local.people.me) || {}), id: "me", name: "You", color: ME_COLOR, first: first.trim(), last: last.trim(), hi: picked.hi, hk: picked.hk };
    const people = { ...(local && bring ? local.people : {}), me };
    // Your own invite code (first name + 4 characters); retried if it's taken.
    let refCode = null;
    for (let k = 0; k < 4 && !refCode; k++) { const c = newRefCode(me.first); try { await cloud.createRef(c, displayName(me)); refCode = c; } catch (e) { /* taken or offline */ } }
    const profile = { first: me.first, last: me.last, hi: me.hi, hcpKind: me.hk, hcpRounds: 0, email: user.email || "", createdAt: Date.now(), refCode, referredBy: inviter ? inviter.code : null, people: JSON.stringify(people), friendIds: local && bring ? local.friendIds : [], courses: JSON.stringify(local && bring ? local.courses : []) };
    const now = local && bring ? { json: JSON.stringify(local.now), at: Date.now() } : null;
    try {
      await cloud.setMine("", profile, false);
      if (now) await cloud.setMine("state/now", now, false);
      if (local && bring) await Promise.all(local.records.map(r => cloud.setMine(`rounds/${r.id}`, r, false)));
      if (inviter) {
        await cloud.addJoin(inviter.code, displayName(me)).catch(() => {}); // counts for whoever invited you
        if (cloud.befriendInviter) await cloud.befriendInviter(inviter.code, inviter.owner).catch(() => {}); // and you're friends straight away
      }
      stash(REF_KEY, null);
      forgetPhoneData(); // the account has it now; nothing stays on the phone
      onDone(profile, now);
    } catch (e) { setErr(explain(e)); setBusy(false); }
  };
  // One question at a time: your name, then your handicap.
  const [step, setStep] = useState(0);
  const next = () => { if (!first.trim()) { setErr("Enter your first name."); return; } setErr(""); setStep(1); };
  const dots = <div style={{ display: "flex", gap: 6, justifyContent: "center" }} aria-label={`Step ${step + 1} of 2`}>{[0, 1].map(k => <span key={k} style={{ width: k === step ? 22 : 10, height: 10, background: k <= step ? "var(--pine)" : "var(--line)", border: "2px solid var(--night)" }} />)}</div>;
  return (
    <div style={screen}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}><Tiles size={22} /></div>
      {dots}
      {inviter && <p style={{ textAlign: "center", fontWeight: 700 }}>Invited by {inviter.name}. You'll be friends straight away.</p>}
      {step === 0 ? (
        <div key="name" className="slidein" style={{ display: "grid", gap: 10 }}>
          <h1 style={{ textAlign: "center" }}>Welcome! What's your name?</h1>
          <p className="cap" style={{ textAlign: "center" }}>Signed in as {user.email || "you"}. Only your last initial is ever shown to other players.</p>
          <input aria-label="First name" placeholder="First name" maxLength={20} value={first} onChange={e => { setFirst(e.target.value); setErr(""); }} onKeyDown={e => { if (e.key === "Enter") next(); }} style={{ ...inp, fontSize: 18, padding: "12px 12px" }} />
          <input aria-label="Last name" placeholder="Last name" maxLength={20} value={last} onChange={e => setLast(e.target.value)} onKeyDown={e => { if (e.key === "Enter") next(); }} style={{ ...inp, fontSize: 18, padding: "12px 12px" }} />
          <button className="cta" onClick={next}>Next</button>
        </div>
      ) : (
        <div key="hcp" className="slidein" style={{ display: "grid", gap: 10 }}>
          <h1 style={{ textAlign: "center" }}>Nice to meet you, {first.trim()}. Do you have a handicap?</h1>
          <p className="cap" style={{ textAlign: "center" }}>No handicap is fine. Puntaro works one out for you.</p>
          <HcpPicker value={hp} onChange={v => { setHp(v); setErr(""); }} />
          {local && (
            <div className="card" style={{ padding: 11, display: "flex", gap: 9, alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>Bring this phone's rounds into your account</div>
                <div className="cap">{[local.counts.rounds ? `${local.counts.rounds} finished round${local.counts.rounds > 1 ? "s" : ""} and stats` : null, local.counts.courses ? `${local.counts.courses} saved course${local.counts.courses > 1 ? "s" : ""}` : null, local.counts.playing ? "a round in progress" : null].filter(Boolean).join(", ")}. Either way, it's removed from the phone.</div>
              </div>
              <Toggle on={bring} onChange={setBring} />
            </div>
          )}
          <button className="cta" disabled={busy} onClick={go}>{busy ? "Saving…" : "Let's play"}</button>
          <button className="chip" onClick={() => { setErr(""); setStep(0); }} style={{ padding: "8px 0", textAlign: "center" }}>Back</button>
        </div>
      )}
      {err && <p className="cap" role="alert" style={{ color: "var(--red)", fontWeight: 600, textAlign: "center" }}>{err}</p>}
    </div>
  );
}

export default function App() {
  const [splash, setSplash] = useState(true);
  const [cloud, setCloud] = useState(null);
  const [user, setUser] = useState(undefined); // undefined while checking
  const [boot, setBoot] = useState(null); // { profile, now } | "loading" | { error }
  const [finished, setFinished] = useState([]);
  const [startErr, setStartErr] = useState("");
  useEffect(() => {
    let off = () => {};
    backend().then(b => { setCloud(b); off = b.watchAuth(u => setUser(u)); }).catch(e => { setStartErr(explain(e)); setUser(null); });
    return () => off();
  }, []);
  useEffect(() => {
    if (!user || !cloud) { setBoot(null); setFinished([]); return undefined; }
    let dead = false; setBoot("loading");
    Promise.all([cloud.getMine(""), cloud.getMine("state/now")])
      .then(([profile, now]) => { if (!dead) setBoot({ profile, now }); })
      .catch(e => { if (!dead) setBoot({ error: explain(e) }); });
    const off = cloud.watchMine("rounds", rows => { if (!dead) setFinished(rows); }, () => {});
    return () => { dead = true; off(); };
  }, [user && user.uid, cloud]); // eslint-disable-line react-hooks/exhaustive-deps

  const ready = !splash && user && boot && boot !== "loading" && !boot.error && boot.profile;
  if (ready) return <Game key={user.uid} user={user} cloud={cloud} profile={boot.profile} now0={boot.now} finished={finished} />;
  return (
    <div className="sg dark">
      <style>{CSS}</style>
      {splash ? <Splash onDone={() => setSplash(false)} />
        : user === undefined || boot === "loading" ? <Loading text={user === undefined ? "Starting up…" : "Loading your rounds…"} />
        : !user ? <SignIn cloud={cloud} startErr={startErr} />
        : boot && boot.error ? <div style={screen}><p role="alert" style={{ textAlign: "center" }}>{boot.error}</p><button className="cta" onClick={() => location.reload()}>Try again</button></div>
        : <ProfileSetup cloud={cloud} user={user} onDone={(profile, now) => setBoot({ profile, now })} />}
    </div>
  );
}
