const CACHE_NAME = "multiview-shell-v3";
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
          .filter(key => key !== CACHE_NAME)
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
        return cached || await cache.match("./index.html");
      }
    }

    // Serve cached same-origin assets immediately and refresh them in the
    // background. This also handles Vite's hashed production asset names.
    if (cached) {
      event.waitUntil(
        fetch(request)
          .then(response => response.ok ? cache.put(request, response.clone()) : undefined)
          .catch(() => undefined)
      );
      return cached;
    }

    try {
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    } catch {
      return await cache.match("./index.html");
    }
  })());
});
