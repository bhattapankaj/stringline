const CACHE = "stringline-v22";
const ASSETS = [
  "./",
  "./index.html",
  "./css/app.css",
  "./js/levels.js",
  "./js/audio.js",
  "./js/engine.js",
  "./js/app.js",
  "./manifest.json",
  "./assets/img/donnie-head.png",
  "./assets/img/donnie-body.png",
  "./assets/img/icon-192.png",
  "./assets/img/icon-512.png",
  "./assets/img/apple-touch-icon.png",
  "./assets/img/favicon.svg",
  "./assets/img/favicon-32.png",
  "./assets/fonts/LilitaOne.ttf",
  "./assets/fonts/Nunito.ttf"
];

self.addEventListener("install", function (event) {
  event.waitUntil(caches.open(CACHE).then(function (cache) { return cache.addAll(ASSETS); }));
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

// Network first so new builds show up right away. Cache is the offline fallback.
self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request).then(function (res) {
      const copy = res.clone();
      caches.open(CACHE).then(function (cache) { cache.put(event.request, copy); });
      return res;
    }).catch(function () {
      return caches.match(event.request, { ignoreSearch: true }).then(function (hit) {
        return hit || caches.match("./index.html");
      });
    })
  );
});
