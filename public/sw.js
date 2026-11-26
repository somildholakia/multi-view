const CACHE_NAME = "multiview-shell-v8";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key.startsWith("multiview-shell-") && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);

    // Keep navigations fresh, but fall back to the cached app shell offline.
    if (request.mode === "navigate") {
      try {
        const response = await fetch(request);
        if (response.ok) await cache.put("./index.html", response.clone());
        return response;
      } catch {
        return cached || await cache.match("./index.html") || Response.error();
      }
    }

    // Serve cached same-origin assets immediately. Production bundle filenames
    // are content-hashed; missing assets must not receive an HTML response.
    if (cached) return cached;

    try {
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    } catch {
      return Response.error();
    }
  })());
});
