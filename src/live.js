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
// Sentinel for "remove this field" in update pairs.
export const DELETE = { __delete: true };
export const appLink = () => `${location.origin}${location.pathname}`;
// ref: the sharer's invite code, so a new player who signs up from this link counts as theirs.
export const joinLink = (code, ref) => `${appLink()}?join=${encodeURIComponent(code)}${ref ? `&ref=${encodeURIComponent(ref)}` : ""}`;
export const inviteLink = ref => `${appLink()}?ref=${encodeURIComponent(ref)}`;
// Invite codes: first name plus 4 characters, e.g. pierre-7k3q.
const REF_CHARS = "abcdefghjkmnpqrstuvwxyz23456789";
export const newRefCode = first => {
  const base = String(first || "player").toLowerCase().normalize("NFKD").replace(/[^a-z]/g, "").slice(0, 10) || "player";
  return `${base}-${Array.from({ length: 4 }, () => REF_CHARS[Math.floor(Math.random() * REF_CHARS.length)]).join("")}`;
};
export const cleanRef = raw => { const t = String(raw || "").toLowerCase().trim(); return /^[a-z]{1,10}-[a-z0-9]{4}$/.test(t) ? t : null; };

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
    // Only a first name and last initial go online: enough for avatars, no full surnames.
    return [id, { name, first: p.first || "", last: (p.last || "").slice(0, 1), hi: p.hi ?? 0, hk: p.hk || "", color: p.color || "#6F7F73", guest: !!p.guest }];
  }));
  return {
    v: 1, code, host: uid, scoring, createdAt: Date.now(),
    base, people: ppl,
    claims: { me: uid }, members: { [uid]: true }, at: {},
    s: perPlayer(r, "scores"), bk: {}, ev: perPlayer(r, "events"),
    ntp: perHole(r.ntp), wolf: perHole(r.wolf), bbb: perHole(r.bbb), draws: perHole(r.draws),
    by: {}, ed: {},
  };
}

export function docToRound(d, local = {}) {
  const b = d.base;
  const per = (m, fill) => Object.fromEntries(b.playerIds.map(id => [id, arr18(m && m[id], fill)]));
  return {
    ...b,
    scores: per(d.s, null), bank: local.bank || per(d.bk, false), events: per(d.ev, null),
    ntp: arr18(d.ntp, null), ntpOk: Array(18).fill(false), wolf: arr18(d.wolf, null), bbb: arr18(d.bbb, null), draws: arr18(d.draws, null),
    hole: local.hole ?? 0, seen: local.seen || Array(18).fill(false),
  };
}

/* ---------- secret bank calls ---------- */
// Holes below this number are revealed: every joined player has moved past them.
export function revealUpTo(d) {
  if (!d) return 0;
  if (d.done) return 18; // a finished round has no secrets left
  const ids = d.base.playerIds.filter(id => d.claims && d.claims[id]);
  if (!ids.length) return 0;
  return Math.min(...ids.map(id => (d.at && d.at[id]) || 0));
}
export const bankKey = (id, h) => `${id}_${h}`;
// shown: revealed calls fetched from the server (null = no call made). mine: calls this phone made.
export function bankMap(d, shown, mine) {
  const up = revealUpTo(d);
  return Object.fromEntries(d.base.playerIds.map(id => [id, Array.from({ length: 18 }, (_, h) => {
    const k = bankKey(id, h); const bk = d.bk && d.bk[id] && d.bk[id][h] != null ? d.bk[id][h] : null;
    if (h < up && k in shown) return shown[k] ?? bk ?? false;
    return bk ?? (mine[k] ?? false);
  })]));
}

/* ---------- who may change what ---------- */
export function rights(meta, uid, mine = {}) {
  if (!meta) return { score: () => true, bank: () => true, hidden: () => false, host: true };
  const host = meta.host === uid;
  const claims = meta.claims || {}; const at = meta.at || {};
  if (meta.done) return { score: () => false, bank: () => false, hidden: () => false, host, scoring: meta.scoring, done: true };
  if (meta.scoring === "one") return { score: () => host, bank: () => host, hidden: () => false, host, scoring: "one" };
  const up = revealUpTo(meta);
  const own = id => claims[id] === uid;
  const free = id => !claims[id];
  return {
    // Everyone scores: anyone can fill a gap in the scores.
    score: () => true,
    // Your call until you move on; a player with no phone, until the hole is revealed.
    bank: (id, h) => (own(id) && (at[id] || 0) <= h) || (free(id) && h >= up),
    // Another joined player's call that hasn't been revealed yet. (A player with no phone stays open to everyone.)
    hidden: (id, h) => h >= up && !own(id) && !free(id) && !(bankKey(id, h) in mine),
    host, scoring: "each",
  };
}

/* ---------- plain-words reasons for setup problems ---------- */
export function explain(e) {
  const c = (e && (e.code || e.name)) || ""; const m = (e && e.message) || "";
  if (/signed-out/.test(c)) return "You're signed out. Sign in again to play live.";
  if (/admin-restricted-operation|operation-not-allowed/.test(c)) return "That sign-in method isn't switched on yet in the Firebase console (Authentication, Sign-in method).";
  if (/unauthorized-domain/.test(c)) return "This site isn't allowed yet: add pipinochill.github.io under Firebase Authentication, Settings, Authorized domains.";
  if (/permission-denied/.test(c)) return "Firebase said no. Publish the latest firestore.rules in the Firebase console (Firestore, Rules).";
  if (/not-found|failed-precondition/.test(c) || /does not exist/.test(m)) return "The live rounds database isn't set up yet: create the Firestore database in the Firebase console.";
  if (/network|unavailable|Failed to fetch|dynamically imported/i.test(c + m)) return "Couldn't reach live rounds. Check your connection and try again.";
  if (/popup-closed-by-user|cancelled-popup-request/.test(c)) return "Sign-in was cancelled.";
  if (/popup-blocked/.test(c)) return "Your browser blocked the Google sign-in window. Allow pop-ups for this site, or use the email link.";
  if (/invalid-action-code|expired-action-code/.test(c)) return "That sign-in link has expired or was already used. Send yourself a new one.";
  if (/invalid-email/.test(c)) return "That email address doesn't look right.";
  if (/requires-recent-login/.test(c)) return "For your security, sign in again and then delete your account.";
  return "Something went wrong" + (c ? ` (${c})` : "") + ".";
}

/* ---------- backends ---------- */
// The test harness can swap in an in-memory store via window.__puntaroLiveBackend.
let backendP = null;
export function backend() {
  if (typeof window !== "undefined" && window.__puntaroLiveBackend) return Promise.resolve(window.__puntaroLiveBackend);
  if (!backendP) backendP = firebaseBackend().catch(e => { backendP = null; throw e; });
  return backendP;
}
export const EMAIL_KEY = "puntaro.signinEmail"; // only kept between sending a sign-in link and opening it

async function firebaseBackend() {
  const load = u => import(/* @vite-ignore */ u);
  const [{ initializeApp }, A, F] = await Promise.all([load(FB + "firebase-app.js"), load(FB + "firebase-auth.js"), load(FB + "firebase-firestore.js")]);
  const app = initializeApp(FIREBASE_CONFIG);
  const auth = A.getAuth(app);
  let db;
  // A temporary offline copy so scoring works without signal. Cleared on sign-out.
  try { db = F.initializeFirestore(app, { localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() }), ignoreUndefinedProperties: true }); }
  catch (e) { db = F.getFirestore(app); }
  const me = () => { const u = auth.currentUser; if (!u) throw Object.assign(new Error("signed out"), { code: "signed-out" }); return u.uid; };
  const ref = code => F.doc(db, "rounds", code);
  const fp = path => new F.FieldPath(...path.map(String));
  const val = v => (v && v.__delete ? F.deleteField() : v);
  const bankRef = (code, id, h) => F.doc(db, "rounds", code, "banks", `${id}_${h}`);
  const userRef = p => (p ? F.doc(db, "users", me(), ...p.split("/")) : F.doc(db, "users", me()));
  const userCol = p => F.collection(db, "users", me(), ...p.split("/"));
  return {
    get uid() { return auth.currentUser ? auth.currentUser.uid : null; },

    /* accounts */
    watchAuth: cb => A.onAuthStateChanged(auth, u => cb(u ? { uid: u.uid, email: u.email || "", name: u.displayName || "" } : null)),
    signInGoogle: () => A.signInWithPopup(auth, new A.GoogleAuthProvider()),
    sendEmailLink: async email => {
      await A.sendSignInLinkToEmail(auth, email, { url: location.origin + location.pathname, handleCodeInApp: true });
      try { localStorage.setItem(EMAIL_KEY, email); } catch (e) { /* fine */ }
    },
    isEmailLink: url => A.isSignInWithEmailLink(auth, url),
    finishEmailLink: async (email, url) => { await A.signInWithEmailLink(auth, email, url); try { localStorage.removeItem(EMAIL_KEY); } catch (e) { /* fine */ } },
    // Sign out and wipe the offline copy, so nothing of yours stays on the phone.
    signOut: async () => { await A.signOut(auth); try { await F.terminate(db); await F.clearIndexedDbPersistence(db); } catch (e) { /* fine */ } },
    deleteLogin: () => A.deleteUser(auth.currentUser),

    /* your own data: users/{uid}/... */
    getMine: async p => { const s = await F.getDoc(userRef(p)); return s.exists() ? s.data() : null; },
    setMine: (p, data, merge = true) => F.setDoc(userRef(p), data, { merge }),
    deleteMine: p => F.deleteDoc(userRef(p)),
    watchMine: (p, cb, onErr) => F.onSnapshot(userCol(p), q => cb(q.docs.map(d => ({ id: d.id, ...d.data() }))), onErr),
    listMine: async p => (await F.getDocs(userCol(p))).docs.map(d => d.id),

    /* invites: refs/{code} = { owner, name }, refs/{code}/joins/{uid} = new players who signed up from it */
    getRef: async code => { const s = await F.getDoc(F.doc(db, "refs", code)); return s.exists() ? s.data() : null; },
    createRef: (code, name) => F.setDoc(F.doc(db, "refs", code), { owner: me(), name, createdAt: F.serverTimestamp() }),
    addJoin: (code, name) => F.setDoc(F.doc(db, "refs", code, "joins", me()), { name, at: F.serverTimestamp() }),
    listJoins: async code => (await F.getDocs(F.collection(db, "refs", code, "joins"))).docs.map(d => ({ id: d.id, name: d.data().name, at: d.data().at && d.data().at.toMillis ? d.data().at.toMillis() : null })),

    /* friends
       profiles/{uid}                 the card your friends see: name, colour, handicap, stats
       friends/{uid}/list/{friendUid} who you're friends with; each friendship is written to both lists
       requests/{to}/in/{from}        a friend request waiting to be accepted */
    setProfile: data => F.setDoc(F.doc(db, "profiles", me()), { ...data, updatedAt: F.serverTimestamp() }),
    /* usage log: a few plain events (app opened, round started...). Players can only add their own; only the admin reads them. */
    logEvent: (name, data) => F.addDoc(F.collection(db, "events"), { uid: me(), name, data: data || {}, at: F.serverTimestamp() }),
    /* Dev tab: everything the admin needs in one go. The rules refuse this for anyone else. */
    adminLoad: async (days = 30) => {
      const since = F.Timestamp.fromMillis(Date.now() - days * 864e5);
      const [u, r, f, e, v] = await Promise.all([
        F.getDocs(F.collection(db, "users")),
        F.getDocs(F.collectionGroup(db, "rounds")),
        F.getDocs(F.collection(db, "feedback")),
        F.getDocs(F.query(F.collection(db, "events"), F.where("at", ">=", since))),
        F.getDocs(F.collection(db, "voids")),
      ]);
      const raisesOf = x => { try { return ((JSON.parse(x.people || "{}") || {}).me || {}).raises || []; } catch (err) { return []; } };
      const ms = v => (v && v.toMillis ? v.toMillis() : v || null);
      return {
        users: u.docs.map(d => { const x = d.data(); return { uid: d.id, first: x.first || "", last: x.last || "", email: x.email || "", hi: x.hi, hcpKind: x.hcpKind || "", createdAt: ms(x.createdAt), referredBy: x.referredBy || null, refCode: x.refCode || null, raises: raisesOf(x) }; }),
        rounds: r.docs.filter(d => d.ref.parent.parent && d.ref.parent.parent.parent.id === "users").map(d => ({ owner: d.ref.parent.parent.id, ...d.data() })),
        live: r.docs.filter(d => !d.ref.parent.parent).map(d => { const x = d.data(); return { code: d.id, done: !!x.done, createdAt: ms(x.createdAt), updatedAt: ms(x.updatedAt) }; }),
        feedback: f.docs.map(d => { const x = d.data(); return { id: d.id, ...x, at: ms(x.at) }; }),
        events: e.docs.map(d => { const x = d.data(); return { uid: x.uid, name: x.name, data: x.data || {}, at: ms(x.at) }; }),
        voids: v.docs.map(d => { const x = d.data(); return { key: d.id, status: x.status, reason: x.reason || "", at: ms(x.at) }; }),
      };
    },
    adminFeedbackDone: (id, done) => F.updateDoc(F.doc(db, "feedback", id), { done }),
    /* Fair play: the admin voids a round (it stops counting on ladders and in stats) or clears a flag ("ok").
       Everyone reads the list so their own stats leave voided rounds out. */
    listVoids: async () => (await F.getDocs(F.collection(db, "voids"))).docs.map(d => ({ key: d.id, ...d.data() })),
    adminSetVoid: (key, status, reason) => F.setDoc(F.doc(db, "voids", key), { status, reason: String(reason || "").slice(0, 200), by: me(), at: F.serverTimestamp() }),
    adminClearVoid: key => F.deleteDoc(F.doc(db, "voids", key)),
    /* Dev tab: delete everything a player has stored (not their login: only Firebase itself can remove that).
       Rounds they played live stay in the other players' histories. */
    adminDeleteUser: async uid => {
      if (uid === me()) throw new Error("Not your own account");
      const refs = [];
      const add = q => q.docs.forEach(d => refs.push(d.ref));
      add(await F.getDocs(F.collection(db, "users", uid, "rounds")));
      add(await F.getDocs(F.collection(db, "users", uid, "state")));
      const mine = await F.getDocs(F.collection(db, "friends", uid, "list"));
      mine.docs.forEach(d => { refs.push(d.ref); refs.push(F.doc(db, "friends", d.id, "list", uid)); });
      add(await F.getDocs(F.collection(db, "requests", uid, "in")));
      (await F.getDocs(F.collectionGroup(db, "in"))).docs.filter(d => d.id === uid).forEach(d => refs.push(d.ref)); // requests they sent
      add(await F.getDocs(F.query(F.collection(db, "feedback"), F.where("uid", "==", uid))));
      add(await F.getDocs(F.query(F.collection(db, "events"), F.where("uid", "==", uid))));
      refs.push(F.doc(db, "profiles", uid));
      refs.push(F.doc(db, "users", uid)); // last, so a half-finished delete can be run again
      for (let i = 0; i < refs.length; i += 400) { const b = F.writeBatch(db); refs.slice(i, i + 400).forEach(r => b.delete(r)); await b.commit(); }
      return refs.length;
    },
    // Alpha feedback: anyone signed in can leave a note; only the Firebase console can read them.
    sendFeedback: (text, meta) => F.addDoc(F.collection(db, "feedback"), { uid: me(), text, ...meta, at: F.serverTimestamp() }),
    deleteProfile: () => F.deleteDoc(F.doc(db, "profiles", me())),
    watchProfile: (uid, cb, onErr) => F.onSnapshot(F.doc(db, "profiles", uid), s => cb(s.exists() ? s.data() : null), onErr),
    watchFriends: (cb, onErr) => F.onSnapshot(F.collection(db, "friends", me(), "list"), q => cb(q.docs.map(d => ({ id: d.id, via: d.data().via || "" }))), onErr),
    watchRequests: (cb, onErr) => F.onSnapshot(F.collection(db, "requests", me(), "in"), q => cb(q.docs.map(d => ({ id: d.id, name: d.data().name || "" }))), onErr),
    sendRequest: (to, name) => F.setDoc(F.doc(db, "requests", to, "in", me()), { name, at: F.serverTimestamp() }),
    hasRequested: async to => { try { return (await F.getDoc(F.doc(db, "requests", to, "in", me()))).exists(); } catch (e) { return false; } },
    acceptRequest: from => {
      const b = F.writeBatch(db), u = me();
      b.set(F.doc(db, "friends", u, "list", from), { since: F.serverTimestamp(), via: "request" });
      b.set(F.doc(db, "friends", from, "list", u), { since: F.serverTimestamp(), via: "request" });
      b.delete(F.doc(db, "requests", u, "in", from));
      return b.commit();
    },
    declineRequest: from => F.deleteDoc(F.doc(db, "requests", me(), "in", from)),
    // You signed up from their invite: you're friends straight away.
    befriendInviter: (code, owner) => {
      const b = F.writeBatch(db), u = me();
      b.set(F.doc(db, "friends", u, "list", owner), { since: F.serverTimestamp(), via: code });
      b.set(F.doc(db, "friends", owner, "list", u), { since: F.serverTimestamp(), via: code });
      return b.commit();
    },
    unfriend: fid => {
      const b = F.writeBatch(db), u = me();
      b.delete(F.doc(db, "friends", u, "list", fid)); b.delete(F.doc(db, "friends", fid, "list", u));
      return b.commit();
    },

    /* live rounds */
    create: (code, data) => F.setDoc(ref(code), { ...data, updatedAt: F.serverTimestamp(), hostAt: F.serverTimestamp() }),
    get: async code => { const s = await F.getDoc(ref(code)); return s.exists() ? s.data() : null; },
    // host: true when the host's phone is writing; it stamps hostAt, the clock behind the 6-hour fallback.
    update: (code, pairs, host = false) => {
      const args = []; pairs.forEach(([p, v]) => args.push(fp(p), val(v))); args.push(fp(["updatedAt"]), F.serverTimestamp());
      if (host) args.push(fp(["hostAt"]), F.serverTimestamp());
      return F.updateDoc(ref(code), ...args);
    },
    setIfAbsent: (code, path, value, extra = [], host = false) => F.runTransaction(db, async tx => {
      const s = await tx.get(ref(code)); if (!s.exists()) return;
      let cur = s.data(); for (const k of path) cur = cur == null ? undefined : cur[String(k)];
      if (cur == null) {
        const args = [fp(path), value]; extra.forEach(([p, v]) => args.push(fp(p), val(v))); args.push(fp(["updatedAt"]), F.serverTimestamp());
        if (host) args.push(fp(["hostAt"]), F.serverTimestamp());
        tx.update(ref(code), ...args);
      }
    }),
    // Finish a live round for everyone: it becomes read-only and every player's account records it.
    finish: (code, host = false) => F.updateDoc(ref(code), "done", true, "doneBy", me(), "updatedAt", F.serverTimestamp(), ...(host ? ["hostAt", F.serverTimestamp()] : [])),
    putBank: (code, id, h, v) => F.setDoc(bankRef(code, id, h), { pid: id, h, v, uid: me() }),
    // true / false = the call; null = no call made. Throws if it's still secret.
    getBank: async (code, id, h) => { const s = await F.getDoc(bankRef(code, id, h)); return s.exists() ? !!s.data().v : null; },
    watch: (code, cb, onErr) => F.onSnapshot(ref(code), s => {
      if (!s.exists()) { cb(null); return; }
      const d = s.data(); const ms = t => (t && t.toMillis ? t.toMillis() : t);
      cb({ ...d, updatedAt: ms(d.updatedAt), hostAt: ms(d.hostAt) });
    }, onErr),
  };
}
