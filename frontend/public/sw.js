// Bump the version when the caching strategy changes; activate deletes every
// cache not listed here.
const SHELL_CACHE = "tyyni-shell-v2";
const RUNTIME_CACHE = "tyyni-runtime-v2";
const STATIC_CACHE = "tyyni-static-v2";
const CURRENT_CACHES = new Set([SHELL_CACHE, RUNTIME_CACHE, STATIC_CACHE]);

// Hashed build files from older deploys are never requested again; keep only
// the most recent ones.
const STATIC_CACHE_MAX_ENTRIES = 120;

const PRECACHE_URLS = [
  "/",
  "/ground",
  "/wins",
  "/journal",
  "/anchor",
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
            .filter((key) => !CURRENT_CACHES.has(key))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

/** Deletes the oldest entries (keys come back in insertion order). */
async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  const excess = keys.length - maxEntries;
  if (excess <= 0) return;
  await Promise.all(keys.slice(0, excess).map((key) => cache.delete(key)));
}

/**
 * Fetches from the network and saves a copy of a successful response. Must
 * be called while the fetch event is still active (synchronously, or before
 * `respondWith` settles), because it registers the save with `waitUntil`.
 */
function fetchAndCache(event, request, cacheName, maxEntries) {
  const network = fetch(request).then((response) => ({
    response,
    copy: response.ok ? response.clone() : null,
  }));
  event.waitUntil(
    network
      .then(async ({ copy }) => {
        if (!copy) return;
        const cache = await caches.open(cacheName);
        await cache.put(request, copy);
        if (maxEntries) await trimCache(cacheName, maxEntries);
      })
      .catch(() => undefined),
  );
  return network.then(({ response }) => response);
}

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

  // Document navigations & API data: network-first with offline cache fallback.
  // In local dev every request goes here, since dev chunks are not hashed.
  if (
    request.mode === "navigate" ||
    url.pathname.startsWith("/api/") ||
    isLocalDev
  ) {
    const cacheName = request.mode === "navigate" ? SHELL_CACHE : RUNTIME_CACHE;
    event.respondWith(
      fetchAndCache(event, request, cacheName).catch(async () => {
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

  // Production build output: file names carry a content hash, so a cached
  // copy never goes stale. Cache-first, no revalidation request.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches
        .match(request)
        .then(
          (cached) =>
            cached ||
            fetchAndCache(
              event,
              request,
              STATIC_CACHE,
              STATIC_CACHE_MAX_ENTRIES,
            ),
        )
        .catch(() => Response.error()),
    );
    return;
  }

  // Unhashed static files (/icons/, /apple-icon.png, /icon.svg, manifest):
  // stale-while-revalidate, since the same URL can get new content. The
  // refresh starts right away so its save is registered in time.
  const refreshed = fetchAndCache(event, request, RUNTIME_CACHE).catch(
    () => null,
  );
  event.respondWith(
    caches
      .match(request)
      .then((cached) => cached || refreshed)
      .then((response) => response || Response.error()),
  );
});
