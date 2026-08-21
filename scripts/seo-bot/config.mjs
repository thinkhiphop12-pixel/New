/* config.mjs — everything about BALLKNW the rules need to know.

   Thresholds are the SERP truncation points Google actually renders at, not
   hard limits: a long title is not invalid HTML, it is a title that gets cut
   off with an ellipsis in the result. That is why they are warnings.
*/

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export const config = {
  /* Canonical origin. Every canonical, og:url and sitemap <loc> must use it —
     ballknw.com without the www is a redirect, so emitting it anywhere costs a
     hop and splits signals. */
  site: 'https://www.ballknw.com',

  /* The SEO surface: root-level marketing and guide pages.

     /gaffa/ is deliberately excluded. Vercel rebuilds it from
     src/games/football-manager on every deploy (see HANDOVER.md), so the
     committed copy is not what production serves and auditing it would report
     on markup no visitor ever receives. */
  pageGlob: '*.html',
  ignorePages: [
    // Kept out of the index with a noindex tag; it is a planning doc.
    'seo-plan-50.html',
  ],

  /* Directories the link checker may resolve static assets from. */
  assetDirs: ['assets', 'shared', 'public', 'content'],

  /* Routes that exist at deploy time but not as files in the repo. */
  virtualRoutes: ['/gaffa/', '/_vercel/insights/script.js'],

  title: {
    min: 25,
    max: 60,          // Google truncates around here on desktop.
    brand: '| BALLKNW',
  },

  description: {
    min: 70,
    max: 160,
  },

  content: {
    minWords: 300,    // Below this a guide page is thin for its keyword.
  },

  /* Pages allowed to skip the article-shaped structured data check. */
  nonArticlePages: ['index.html', 'privacy.html', 'terms.html', 'about.html', 'football-guides.html'],

  sitemap: 'sitemap.xml',
  robots: 'robots.txt',

  /* Default priority/changefreq for regenerated sitemap entries, most
     specific pattern first. */
  sitemapDefaults: [
    { match: /^\/$/, priority: '1.0', changefreq: 'daily' },
    { match: /^\/gaffa\/$/, priority: '0.9', changefreq: 'weekly' },
    { match: /^\/(privacy|terms|about)\.html$/, priority: '0.5', changefreq: 'yearly' },
    { match: /^\/football-guides\.html$/, priority: '0.9', changefreq: 'weekly' },
    { match: /./, priority: '0.8', changefreq: 'monthly' },
  ],
};

export default config;
