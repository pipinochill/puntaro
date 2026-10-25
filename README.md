# Puntaro (alpha)

A points-only golf side game that runs alongside your normal comp. Web app, installable to a phone home screen.

- `index.html`, `app.js`, `sw.js`, `manifest.webmanifest`, `icons/`: the published site.
- `src/app.jsx`, `src/main.jsx`: source. `app.js` is built from these with esbuild.

Course names and locations come from OpenStreetMap contributors (ODbL). Slope and rating are entered by the player. Not official Golf Australia data.

## Live rounds (Firebase)

`src/live.js` holds the Firebase config and the sync code. The Firebase SDK is loaded from gstatic at runtime (no npm needed) and cached by the service worker for offline play.

One-time Firebase console setup (project `puntaro`):
1. Authentication → Sign-in method → enable **Anonymous**.
2. Authentication → Settings → Authorized domains → add `pipinochill.github.io`.
3. Firestore Database → Create database → location `australia-southeast1` (Sydney), production mode.
4. Firestore → Rules → paste `firestore.rules` → Publish.

Re-publish the rules whenever `firestore.rules` changes. Bank calls in "everyone scores" live in `rounds/{code}/banks/{pid_h}` and stay unreadable until every joined player has moved past that hole.
