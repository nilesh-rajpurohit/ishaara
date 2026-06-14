const CACHE_NAME = "ishaara-v1";
const MODEL_CACHE = "ishaara-models-v1";

const STATIC_ASSETS = [
  "/",
  "/_next/static/css/app.css",
];

const ML_MODELS = [
  "/models/whisper-tiny-multilingual.onnx",
  "/models/isl-gesture-v1.onnx",
  "/models/lang-detect.onnx",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(MODEL_CACHE).then((cache) => {
      console.log("Caching ML models for offline use");
      return cache.addAll(ML_MODELS).catch(() => {
        console.log("Models not available yet - will cache on first load");
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== MODEL_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.url.includes("/models/")) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return cached || fetch(event.request).then((response) => {
          const clone = response.clone();
          caches.open(MODEL_CACHE).then((cache) => cache.put(event.request, clone));
          return response;
        });
      })
    );
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
