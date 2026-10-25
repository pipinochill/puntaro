const V = "puntaro-0.37";
const FILES = ["./", "index.html", "app.js", "manifest.webmanifest", "icons/tile-192.png", "icons/tile-512.png"];
// cache: "reload" / "no-cache" skip the browser's HTTP cache (GitHub Pages allows 10 minutes),
// so a new deploy reaches phones on the next open instead of up to 10 minutes later.
self.addEventListener("install", e => { e.waitUntil(caches.open(V).then(c => c.addAll(FILES.map(u => new Request(u, { cache: "reload" }))))); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== V).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request, { cache: "no-cache" }).then(r => { const c = r.clone(); caches.open(V).then(x => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request).then(r => r || caches.match("./"))));
});
