# Puntaro (alpha)

A points-only golf side game that runs alongside your normal comp. Web app, installable to a phone home screen.

- `index.html`, `app.js`, `sw.js`, `manifest.webmanifest`, `icons/`: the published site.
- `src/app.jsx`, `src/main.jsx`: source. `app.js` is built from these with esbuild.

Course names and locations come from OpenStreetMap contributors (ODbL). Slope and rating are entered by the player. Not official Golf Australia data.

## Accounts and live rounds (Firebase)

Everything is stored in Firebase: each player's account (`users/{uid}`: profile, round in progress, finished
rounds) and live rounds (`rounds/{code}`). The phone only keeps Firestore's temporary offline cache, cleared on
sign-out. `src/live.js` holds the Firebase config, sign-in and sync code; the SDK loads from gstatic at runtime.

One-time Firebase console setup (project `puntaro`):
1. Authentication → Sign-in method: enable **Google**, and **Email/Password** with **Email link (passwordless sign-in)** on. Anonymous is no longer used.
2. Authentication → Settings → Authorized domains: `pipinochill.github.io`.
3. Firestore Database → Create database (if not done) → `australia-southeast1` (Sydney), production mode.
4. Firestore → Rules → paste `firestore.rules` → Publish. Re-publish whenever it changes.

Invite codes: `refs/{code}` (owner, display name) and `refs/{code}/joins/{uid}` (new players who signed up from that code).
To see who brought in whom, browse `refs` in the Firestore console.

Finished live rounds are kept for everyone who played and are read-only. Bank calls in "everyone scores"
live in `rounds/{code}/banks/{pid_h}` and stay unreadable until every joined player has moved past that hole.
