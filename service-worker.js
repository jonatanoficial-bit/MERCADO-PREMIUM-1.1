/* ==========================================================
   Service Worker (PWA) — Cache simples e confiável
   ========================================================== */
const CACHE_NAME = "vale-games-mercado-v4";

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./admin.html",
  "./css/styles.css",
  "./js/app.js",
  "./js/admin.js",
  "./js/dlc-loader.js",
  "./dlc/manifest.json",
  "./assets/brand/logo%20vale%20games.jpeg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Só GET
  if (req.method !== "GET") return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match("./"));
    })
  );
});

