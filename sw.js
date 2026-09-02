/* BALLKNW service worker.
 *
 * Deliberately conservative. A service worker sits in front of every request on
 * the origin and persists across visits, so a careless one can pin a stale site
 * in place for people who have no idea why — and on an ad-funded site that is
 * lost revenue you cannot see happening. The rules below exist to make that
 * failure mode impossible rather than unlikely:
 *
 *   • Same-origin GET only. Ads, analytics and font CDNs are never intercepted;
 *     their requests are not even passed through respondWith, so this file
 *     cannot break, delay or accidentally cache them.
 *   • Navigations are network-first. A page always comes from the network when
 *     the network is there, so publishing an update never waits on a cache.
 *     The cache is a fallback for being offline, nothing more.
 *   • Hashed build assets are cache-first, which is safe precisely because they
 *     are hashed: a changed file has a different URL.
 *   • No skipWaiting. A new worker takes over once the old tabs are gone,
 *     rather than swapping the chunk map out from under a game in progress.
 *   • /api/ is never touched. Prize-draw entries must not be served from a
 *     cache, and a cached 401 would be its own kind of bug.
 *
 * Bump CACHE_VERSION to invalidate everything; activate deletes any cache that
 * does not match, so a bad deploy is one version bump away from being gone.
 */

const CACHE_VERSION = 'v1';
const CACHE = `ballknw-${CACHE_VERSION}`;

/* The smallest set worth having before the first offline visit. Everything else
   is cached as it is used — precaching a hashed Next.js bundle would mean
   shipping a build manifest and keeping it in step, which is a maintenance
   burden for very little gain. */
const SHELL = ['/', '/gaffa/', '/manifest.webmanifest', '/assets/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      /* Individually, and tolerant of failure: one 404 in the shell list must
         not abort the whole install and leave the site with no worker. */
      Promise.all(SHELL.map((url) => cache.add(url).catch(() => null))),
    ),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/** Hashed or content-addressed assets: safe to serve from cache indefinitely. */
function isImmutable(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/gaffa/_next/static/') ||
    url.pathname.startsWith('/assets/') ||
    /\.(css|woff2?|png|svg|jpg|jpeg|webp)$/.test(url.pathname)
  );
}

function isNavigation(request) {
  return request.mode === 'navigate' || (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'));
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  /* Leave everything cross-origin entirely alone. */
  if (url.origin !== self.location.origin) return;

  /* Never cache the API, and never let a cached response stand in for it. */
  if (url.pathname.startsWith('/api/')) return;

  if (isNavigation(request)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          /* Only cache a genuine, complete response. Caching an opaque or
             error response would serve that error back while offline. */
          if (response.ok && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
          }
          return response;
        })
        .catch(() =>
          caches
            .match(request)
            .then((hit) => hit || caches.match('/gaffa/'))
            .then(
              (hit) =>
                hit ||
                new Response(
                  '<!doctype html><meta charset="utf-8"><title>Offline</title>' +
                    '<body style="font:16px system-ui;background:#0b120d;color:#edeae0;padding:40px">' +
                    '<h1>You are offline</h1><p>Open this page again once you have a connection.</p>',
                  { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
                ),
            ),
        ),
    );
    return;
  }

  if (isImmutable(url)) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((response) => {
            if (response.ok && response.type === 'basic') {
              const copy = response.clone();
              caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
            }
            return response;
          }),
      ),
    );
    return;
  }

  /* Everything else same-origin — the game's data JSON, mainly. Network first
     so a squad update lands immediately, cache as a fallback so a season can be
     played on a train. */
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
        }
        return response;
      })
      .catch(() => caches.match(request)),
  );
});

/* Escape hatch. Posting {type:'UNREGISTER'} from a page tears the worker down
   and empties its caches, so a bad release can be undone from the client
   without waiting for anyone to clear site data by hand. */
self.addEventListener('message', (event) => {
  if (event.data?.type === 'UNREGISTER') {
    event.waitUntil(
      caches
        .keys()
        .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        .then(() => self.registration.unregister()),
    );
  }
});
