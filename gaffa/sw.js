/*
 * Service worker for the Gaffa PWA.
 *
 * Scope is whatever directory this file is served from — `/gaffa/` in
 * production, `/` under `next dev` — so nothing here hardcodes the base path.
 *
 * Two strategies, chosen by what goes stale:
 *   - Navigations are network-first. The shell HTML names the current build's
 *     JS chunks, so a deploy has to be able to replace it; falling back to
 *     cache is what makes the game playable on a plane.
 *   - Everything else same-origin is cache-first. `_next/static/*` is
 *     content-hashed and therefore immutable, and the dataset below is a
 *     build artefact that only changes with a deploy (which changes the
 *     shell, not this file).
 *
 * Cross-origin requests (gtag, ads, Vercel analytics) are never touched —
 * they fall through to the network and simply fail offline, which is correct.
 */

const CACHE = 'gaffa-v1';

/*
 * The build's own chunks, fonts and stylesheets, filled in from out/_next/static
 * by scripts/export-static.sh. They have to be listed at build time because the
 * filenames are content-hashed and unknowable to a file written by hand.
 *
 * Without this the worker only caches chunks the game happens to request while
 * a controlling worker is already active — which on a first visit it is not, so
 * a visit-once-then-go-offline install would boot to a blank screen.
 *
 * Left empty here so the committed file stays valid on its own.
 */
const BUILD_ASSETS = [
  './_next/static/Gg-oSmzS999gBWcczHcge/_buildManifest.js',
  './_next/static/Gg-oSmzS999gBWcczHcge/_clientMiddlewareManifest.js',
  './_next/static/Gg-oSmzS999gBWcczHcge/_ssgManifest.js',
  './_next/static/chunks/0cz1d0mv5g_q7.js',
  './_next/static/chunks/0hx95gn8nx_st.css',
  './_next/static/chunks/158myu8e_yme3.js',
  './_next/static/chunks/16-82-criqmky.js',
  './_next/static/chunks/1o7jscoffs5tf.js',
  './_next/static/chunks/1rht_xhlg6fo7.js',
  './_next/static/chunks/1s0f3vjlqn8-j.js',
  './_next/static/chunks/1s4adn-g3lgp9.js',
  './_next/static/chunks/2-20qakj9qdgv.js',
  './_next/static/chunks/2-zvt4d8gc395.js',
  './_next/static/chunks/31iarpvmym1z2.js',
  './_next/static/chunks/3_c6ydq094p4y.js',
  './_next/static/chunks/3_u40lqvi0zmd.js',
  './_next/static/chunks/3o5_lo4v6gv8-.css',
  './_next/static/chunks/3xuz17pllrw6r.js',
  './_next/static/chunks/turbopack-14xu61siw5h2q.js',
  './_next/static/media/037b6aa687f94b32-s.0evsli58wo2lo.woff2',
  './_next/static/media/7e93c0a52799e849-s.081af6y49e67w.woff2',
  './_next/static/media/8e410338cab7e12e-s.2888ryxa0751p.woff2',
  './_next/static/media/9a800f173b8d9e8f-s.p.3nglv5iys3s0a.woff2',
  './_next/static/media/efadc3f7fcf6ac94-s.2dw4wc11szodo.woff2',
];

// The scope root, with its trailing slash: './' resolved against this file.
const ROOT = new URL('./', self.location).href;

/*
 * Precached on install so a first-run install is playable offline straight
 * away. gamedata.json is ~5 MB and is the one asset the game cannot start
 * without (lib/gamedata.ts fetches it before any career loads), so it is
 * worth the install cost rather than being left to a runtime fetch that may
 * never happen while online.
 */
const PRECACHE = [
  './',
  './data/gamedata.json',
  './favicon.svg',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
  './manifest.webmanifest',
  ...BUILD_ASSETS,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // Individually, so one 404 cannot fail the whole install.
      await Promise.all(
        PRECACHE.map((path) =>
          cache.add(new Request(new URL(path, ROOT), { cache: 'reload' })).catch(() => {}),
        ),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n !== CACHE).map((n) => caches.delete(n)));
      await self.clients.claim();
    })(),
  );
});

/** Serve the cached shell for a navigation the network could not answer. */
async function shellFallback(cache) {
  return (await cache.match(new URL('./', ROOT))) || Response.error();
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (!url.href.startsWith(ROOT)) return;

  // Navigations: network-first, so a new deploy wins whenever we can reach it.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        try {
          const fresh = await fetch(request);
          if (fresh.ok) cache.put(new URL('./', ROOT), fresh.clone());
          return fresh;
        } catch {
          return shellFallback(cache);
        }
      })(),
    );
    return;
  }

  // Everything else: cache-first, filling the cache as the game asks for it.
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(request);
      if (hit) return hit;
      const fresh = await fetch(request);
      // Opaque/partial responses are not useful to replay, so skip them.
      if (fresh.ok && fresh.type === 'basic') cache.put(request, fresh.clone());
      return fresh;
    })(),
  );
});
