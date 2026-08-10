const CACHE_NAME = "alg-note-v7";
const APP_SHELL = [
  "./",
  "./index.html",
  "./favicon.svg",
  "./icon-192.png",
  "./icon-512.png",
  "./manifest.webmanifest",
  "./css/style.css",
  "./js/storage.js",
  "./js/data.js",
  "./js/normalize.js",
  "./js/render.js",
  "./js/app.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
    )),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request);
    }),
  );
});
