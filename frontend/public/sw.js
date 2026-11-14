const SHELL_CACHE = "tyyni-shell-v1";
const RUNTIME_CACHE = "tyyni-runtime-v1";

const PRECACHE_URLS = [
  "/",
  "/manifest.webmanifest",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/icon-maskable-512x512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SHELL_CACHE && key !== RUNTIME_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never intercept Next.js dev server MCP, HMR, or stack-frame endpoints
  if (
    url.pathname.startsWith("/_next/mcp") ||
    url.pathname.startsWith("/_next/webpack-hmr") ||
    url.pathname.startsWith("/__nextjs")
  ) {
    return;
  }

  const isLocalDev =
    self.location.hostname === "localhost" ||
    self.location.hostname === "127.0.0.1";

  // Document navigations & API data: network-first with offline cache fallback
  if (
    request.mode === "navigate" ||
    url.pathname.startsWith("/api/") ||
    isLocalDev
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            const targetCache =
              request.mode === "navigate" ? SHELL_CACHE : RUNTIME_CACHE;
            caches.open(targetCache).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          if (request.mode === "navigate") {
            const shell = await caches.match("/");
            if (shell) return shell;
          }
          return Response.error();
        }),
    );
    return;
  }

  // Production static assets (/_next/static/, /icons/, /apple-icon, /icon.svg): stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches
              .open(RUNTIME_CACHE)
              .then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    }),
  );
});
