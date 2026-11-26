const CACHE_NAME = "multiview-shell-v9";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      await cache.addAll(APP_SHELL);
      // Vite uses content-hashed bundle names. Cache entry assets at install.
      const index = await cache.match("./index.html");
      const html = await index.text();
      const assets = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
        .map(match => new URL(match[1], self.registration.scope))
        .filter(url => url.href.startsWith(self.registration.scope + "assets/"))
        .map(url => url.href);
      await cache.addAll([...new Set(assets)]);
    })
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
  if (url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;
  // Never cache arbitrary embedded pages or API responses as application assets.
  if (request.mode === "navigate" && url.pathname !== new URL("./",self.registration.scope).pathname && url.pathname !== new URL("index.html",self.registration.scope).pathname) return;
  if (request.mode !== "navigate" && !["script","style","image","font","manifest"].includes(request.destination)) return;

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
