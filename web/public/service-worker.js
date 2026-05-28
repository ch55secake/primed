/* Primed offline service worker.
 *
 * Hand-rolled (no Workbox) so it survives Expo Web's hashed-bundle
 * export without a build step. Strategy:
 *
 *  - App shell (navigations) → network-first, fall back to cached
 *    /index.html so deep links work offline.
 *  - Content (markdown + manifest.json) → network-first so an online
 *    launch is always fresh, offline falls back to the last cached copy.
 *  - Everything else same-origin (the content-hashed JS/CSS/img bundle,
 *    favicon) → cache-first; hashed names make this safe forever.
 *  - Mermaid CDN script → cache-first so diagrams render offline.
 *
 * Cache Storage is durable — unlike the Android WebView HTTP cache it is
 * not evicted under memory pressure — so once a page has been visited
 * online, it stays available offline. Open the app online once and the
 * whole site is cached.
 *
 * To force every client to re-cache after a breaking change, bump
 * CACHE_VERSION — the old cache is deleted on activate.
 */

const CACHE_VERSION = "v2";
const CACHE = `primed-${CACHE_VERSION}`;

const MERMAID_CDN =
  "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js";

// Self-hosted JetBrains Mono (code font). Precached so code blocks render
// in the right font offline, not just after a runtime fetch.
const FONT_URLS = [
  "/fonts/jetbrains-mono-400-normal.woff2",
  "/fonts/jetbrains-mono-700-normal.woff2",
  "/fonts/jetbrains-mono-400-italic.woff2",
];

// Same-origin content to seed at install time. Best-effort: a single 404
// (e.g. a renamed primer) must not abort the whole install.
const CONTENT_URLS = [
  "/manifest.json",
  "/patterns.md",
  "/neetcode-150.md",
  "/java-interview-primer.md",
  "/kotlin-interview-primer.md",
  "/postgres-interview-primer.md",
  "/sql-practice.md",
  "/csharp-interview-primer.md",
  "/system-design-patterns-primer.md",
  "/dsa-patterns-primer.md",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await Promise.allSettled([
        cache.add(new Request("/", { cache: "reload" })),
        cache.add(new Request("/index.html", { cache: "reload" })),
        ...CONTENT_URLS.map((u) =>
          cache.add(new Request(u, { cache: "reload" })),
        ),
        ...FONT_URLS.map((u) => cache.add(new Request(u, { cache: "reload" }))),
        cache.add(new Request(MERMAID_CDN, { mode: "no-cors" })),
      ]);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

function isContent(url) {
  return url.pathname.endsWith(".md") || url.pathname === "/manifest.json";
}

async function networkFirst(request, fallbackKey) {
  const cache = await caches.open(CACHE);
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.status === 200) {
      cache.put(fallbackKey || request, fresh.clone());
    }
    return fresh;
  } catch {
    const cached = await cache.match(fallbackKey || request);
    return cached || Response.error();
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const res = await fetch(request);
    if (res && (res.status === 200 || res.type === "opaque")) {
      const cache = await caches.open(CACHE);
      cache.put(request, res.clone());
    }
    return res;
  } catch {
    return cached || Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  // SPA navigations → network-first, cached shell offline.
  if (req.mode === "navigate") {
    event.respondWith(networkFirst(req, "/index.html"));
    return;
  }

  const url = new URL(req.url);

  // Markdown + manifest → network-first (fresh online, cached offline).
  if (url.origin === self.location.origin && isContent(url)) {
    event.respondWith(networkFirst(req));
    return;
  }

  // Hashed assets + mermaid CDN → cache-first.
  event.respondWith(cacheFirst(req));
});
