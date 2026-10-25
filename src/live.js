/* ───────────── LIVE ROUNDS ─────────────
   One Firestore document per live round: rounds/{CODE}.
   The fixed setup lives in `base`; everything players change is stored as small
   per-field maps (s.sam.6 = 4) so phones tapping at once never overwrite each other.
   Each phone keeps its own `hole` and `seen` locally. */

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCbpuDe36t6yX4ejdoWA4wBfeptAfmApI0",
  authDomain: "puntaro.firebaseapp.com",
  projectId: "puntaro",
  storageBucket: "puntaro.firebasestorage.app",
  messagingSenderId: "881535044269",
  appId: "1:881535044269:web:abb62a079df11d8bc51424",
};
const FB = "https://www.gstatic.com/firebasejs/10.12.2/";
export const FIREBASE_SDK_PREFIX = FB;

// Unambiguous characters only: no 0/O, 1/I/L.
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const newCode = () => "PUNT-" + Array.from({ length: 5 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("");
export const cleanCode = raw => {
  const t = String(raw || "").toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^PUNT/, "");
  return t.length === 5 ? `PUNT-${t}` : null;
};
export const joinLink = code => `${location.origin}${location.pathname}?join=${encodeURIComponent(code)}`;

/* ---------- round <-> document ---------- */
const BASE_KEYS = ["course", "holes", "mode", "teams", "playerIds", "games", "useHcp", "hcp", "opts", "drawSeed", "stake", "split"];
const perPlayer = (r, key) => Object.fromEntries(r.playerIds.map(id => [id, Object.fromEntries(r[key][id].map((v, h) => [h, v]).filter(([, v]) => v != null && v !== false))]));
const perHole = arr => Object.fromEntries(arr.map((v, h) => [h, v]).filter(([, v]) => v != null));
const arr18 = (m, fill) => Array.from({ length: 18 }, (_, h) => (m && m[h] !== undefined && m[h] !== null ? m[h] : fill));

export function roundToDoc(r, people, { code, uid, scoring, myName }) {
  const base = Object.fromEntries(BASE_KEYS.map(k => [k, r[k] === undefined ? null : r[k]]));
  const ppl = Object.fromEntries(r.playerIds.map(id => {
    const p = people[id] || {};
    const name = id === "me" ? (myName || p.first || "Host") : p.name;
    return [id, { name, first: p.first || "", last: p.last || "", hi: p.hi ?? 0, color: p.color || "#6F7F73", guest: !!p.guest }];
  }));
  return {
    v: 1, code, host: uid, scoring, createdAt: Date.now(),
    base, people: ppl,
    claims: { me: uid }, members: { [uid]: true },
    s: perPlayer(r, "scores"), bk: perPlayer(r, "bank"), ev: perPlayer(r, "events"),
    ntp: perHole(r.ntp), wolf: perHole(r.wolf), bbb: perHole(r.bbb), draws: perHole(r.draws),
    by: {}, ed: {},
  };
}

export function docToRound(d, local = {}) {
  const b = d.base;
  const per = (m, fill) => Object.fromEntries(b.playerIds.map(id => [id, arr18(m && m[id], fill)]));
  return {
    ...b,
    scores: per(d.s, null), bank: per(d.bk, false), events: per(d.ev, null),
    ntp: arr18(d.ntp, null), ntpOk: Array(18).fill(false), wolf: arr18(d.wolf, null), bbb: arr18(d.bbb, null), draws: arr18(d.draws, null),
    hole: local.hole ?? 0, seen: local.seen || Array(18).fill(false),
  };
}

/* ---------- who may change what ---------- */
export function rights(meta, uid) {
  if (!meta) return { score: () => true, bank: () => true, host: true };
  const host = meta.host === uid;
  const mine = id => meta.claims && meta.claims[id] === uid;
  const free = id => !(meta.claims && meta.claims[id]);
  if (meta.scoring === "one") return { score: () => host, bank: () => host, host };
  // Everyone scores: anyone fills gaps, but a bank call is yours alone (or the host's for players nobody has claimed).
  return { score: () => true, bank: id => mine(id) || free(id), host };
}

/* ---------- backends ---------- */
// The test harness can swap in an in-memory store via window.__puntaroLiveBackend.
let backendP = null;
export function backend() {
  if (typeof window !== "undefined" && window.__puntaroLiveBackend) return Promise.resolve(window.__puntaroLiveBackend);
  if (!backendP) backendP = firebaseBackend().catch(e => { backendP = null; throw e; });
  return backendP;
}

async function firebaseBackend() {
  const load = u => import(/* @vite-ignore */ u);
  const [{ initializeApp }, A, F] = await Promise.all([load(FB + "firebase-app.js"), load(FB + "firebase-auth.js"), load(FB + "firebase-firestore.js")]);
  const app = initializeApp(FIREBASE_CONFIG);
  const auth = A.getAuth(app);
  let db;
  try { db = F.initializeFirestore(app, { localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() }), ignoreUndefinedProperties: true }); }
  catch (e) { db = F.getFirestore(app); }
  const uid = await new Promise((res, rej) => {
    const off = A.onAuthStateChanged(auth, u => { if (u) { off(); res(u.uid); } });
    A.signInAnonymously(auth).catch(err => { off(); rej(err); });
  });
  const ref = code => F.doc(db, "rounds", code);
  const fp = path => new F.FieldPath(...path.map(String));
  return {
    uid,
    create: (code, data) => F.setDoc(ref(code), { ...data, updatedAt: F.serverTimestamp() }),
    get: async code => { const s = await F.getDoc(ref(code)); return s.exists() ? s.data() : null; },
    update: (code, pairs) => {
      const args = []; pairs.forEach(([p, v]) => args.push(fp(p), v)); args.push(fp(["updatedAt"]), F.serverTimestamp());
      return F.updateDoc(ref(code), ...args);
    },
    setIfAbsent: (code, path, value) => F.runTransaction(db, async tx => {
      const s = await tx.get(ref(code)); if (!s.exists()) return;
      let cur = s.data(); for (const k of path) cur = cur == null ? undefined : cur[String(k)];
      if (cur == null) tx.update(ref(code), fp(path), value);
    }),
    watch: (code, cb, onErr) => F.onSnapshot(ref(code), s => cb(s.exists() ? s.data() : null), onErr),
  };
}
