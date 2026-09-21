/* Haulwise Dispatch — service worker.
   Makes the app installable and lets it open with no connection (last data is kept by the page itself).
   It never touches requests to Google Sheets (those are POSTs) or map/geocoding services. */
const VERSION = "v2";                       // bump when the list of cached files changes
const SHELL = "haulwise-shell-" + VERSION;
const RUNTIME = "haulwise-runtime-" + VERSION;
const PRECACHE = [
  "./", "./index.html", "./manifest.webmanifest",
  "./icons/icon.svg", "./icons/icon-192.png", "./icons/icon-512.png",
  "./icons/icon-maskable-192.png", "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png", "./icons/favicon-32.png", "./icons/favicon-48.png"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(SHELL).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith("haulwise-") && k !== SHELL && k !== RUNTIME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;                         // saving to Google Sheets is a POST: always live
  const url = new URL(req.url);

  // The app page: network first, so a new deploy shows up straight away; the saved copy is used when offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then(res => { if (res.ok) { const copy = res.clone(); caches.open(SHELL).then(c => c.put("./index.html", copy)); } return res; })
        .catch(() => caches.match("./index.html").then(hit => hit || caches.match("./")))
    );
    return;
  }

  // Our own static files (icons, manifest): cache first.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(SHELL).then(c => c.put(req, copy)); }
        return res;
      }))
    );
    return;
  }

  // The map library: use the saved copy, refresh it in the background.
  if (url.hostname === "cdnjs.cloudflare.com") {
    event.respondWith(
      caches.open(RUNTIME).then(cache => cache.match(req).then(hit => {
        const fresh = fetch(req).then(res => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => hit);
        return hit || fresh;
      }))
    );
  }
  // Anything else (map tiles, Photon, OSRM, Google) goes straight to the network.
});
