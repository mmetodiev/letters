/* Moral Letters — minimal service worker for installability + offline shell */
const CACHE = "moral-letters-v1";
const PRECACHE = [
  "/",
  "/style.css",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.ok && (url.pathname.endsWith(".css") || url.pathname.endsWith(".js") || url.pathname.startsWith("/icons/") || url.pathname === "/manifest.webmanifest" || request.mode === "navigate" || request.destination === "document")) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);

      // Prefer network for navigations so content stays fresh; fall back to cache offline
      if (request.mode === "navigate" || request.destination === "document") {
        return network.then((response) => response || cached || caches.match("/"));
      }

      return cached || network;
    })
  );
});
