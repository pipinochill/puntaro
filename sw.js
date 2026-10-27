const V = "puntaro-0.65";
const FILES = ["./", "index.html", "app.js", "manifest.webmanifest", "icons/tile-192.png", "icons/tile-512.png"];
const SDK = "https://www.gstatic.com/firebasejs/";
const JSQR = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js";
// cache: "reload" / "no-cache" skip the browser's HTTP cache (GitHub Pages allows 10 minutes),
// so a new deploy reaches phones on the next open instead of up to 10 minutes later.
self.addEventListener("install", e => { e.waitUntil(caches.open(V).then(c => c.addAll(FILES.map(u => new Request(u, { cache: "reload" }))))); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== V).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
// The page asks which version this worker is, and only reloads if it is running an older one.
self.addEventListener("message", e => { if (e.data === "version" && e.ports[0]) e.ports[0].postMessage(V); });
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  // The Firebase SDK and the QR reader are versioned and never change: keep them so they load with no signal.
  if (e.request.url.startsWith(SDK) || e.request.url === JSQR) {
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => { const c = r.clone(); caches.open(V).then(x => x.put(e.request, c)); return r; })));
    return;
  }
  if (new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request, { cache: "no-cache" }).then(r => { const c = r.clone(); caches.open(V).then(x => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request).then(r => r || caches.match("./"))));
});
