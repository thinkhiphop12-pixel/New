import type { MetadataRoute } from 'next';

// Required for `output: export` (STATIC_EXPORT=1 build) — Next won't
// prerender a dynamic metadata route into the static export without this.
export const dynamic = 'force-static';

// Lets iOS players get a real fullscreen experience: Safari doesn't support
// the Fullscreen API in a regular tab, only once a page is added to the
// home screen as an installed app, which is what this manifest enables.
// Desktop/Android already get an in-page fullscreen toggle (see
// FootballManagerGame.tsx) — this covers the platform that toggle can't.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Gaffa — BALLKNW',
    short_name: 'Gaffa',
    description: 'Free browser football management game — no login, no download.',
    start_url: `${basePath}/`,
    scope: `${basePath}/`,
    display: 'standalone',
    background_color: '#09090b',
    theme_color: '#09090b',
    orientation: 'any',
    icons: [
      { src: `${basePath}/icons/icon-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: `${basePath}/icons/icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: `${basePath}/icons/icon-512-maskable.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
