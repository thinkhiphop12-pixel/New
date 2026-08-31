'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker that makes the game installable and playable
 * offline.
 *
 * Only runs in the static export: `next dev` recompiles chunks on every edit,
 * and a cache-first worker sitting in front of that serves yesterday's build
 * until you remember to clear storage. The same NEXT_PUBLIC_BASE_PATH gate the
 * analytics scripts in app/layout.tsx use, for the same reason.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_BASE_PATH;
    if (!base || !('serviceWorker' in navigator)) return;
    // Registering from `${base}/` scopes the worker to the game, so it never
    // intercepts the hand-written pages at the site root.
    navigator.serviceWorker.register(`${base}/sw.js`, { scope: `${base}/` }).catch(() => {
      // An unavailable worker costs offline play, nothing else — the game
      // still runs from the network.
    });
  }, []);

  return null;
}
