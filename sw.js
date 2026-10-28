// NetWorkKing service worker: keeps the app usable offline (phone / tablet install). Data itself lives in IndexedDB.
const V = "networkking-3.1.0";
const SHELL = ["./", "index.html", "manifest.webmanifest", "css/app.css", "js/i18n.js", "js/catalog-data.js",
  ...["util","icons","store","ui","entities","catalog","tables","doc","help","settings","dg","importers","dxf","ai"].map(f => `js/core/${f}.js`),
  ...["building","topology","portmap","rack","fiber","cctv","wifi"].map(f => `js/apps/${f}.js`), "js/main.js",
  "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png", "vendor/pdf.min.js", "vendor/pdf.worker.min.js"];
self.addEventListener("install", e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  // fonts: cache after the first online visit
  if (/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)){ e.respondWith(caches.open(V).then(c => c.match(e.request).then(r => r || fetch(e.request).then(n => { c.put(e.request, n.clone()); return n; })))); return; }
  if (u.origin !== location.origin) return;                  // catalog updates, AI lookup: always network
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(n => { if (n.ok){ const c = n.clone(); caches.open(V).then(x => x.put(e.request, c)); } return n; })));
});
