/* ==========================================================
   Service Worker (PWA) — Cache simples e confiável
   ========================================================== */
const CACHE_NAME = "vale-games-mercado-v6-build-2026-03-09-1057";

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./admin.html",
  "./manifest.webmanifest",
  "./css/styles.css",
  "./js/app.js",
  "./js/categorizer.js",
  "./js/admin.js",
  "./js/dlc-loader.js",
  "./dlc/manifest.json",
  "./assets/brand/logo%20vale%20games.jpeg",
  "./assets/icons/accessibility.svg"
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

