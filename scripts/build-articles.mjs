#!/usr/bin/env node
/* build-articles.mjs — renders the long-form explainer pages from the content
   data in content/articles/ into static HTML at the repo root.

   Every page follows the same shell as the hand-written explainers
   (what-is-a-low-block-in-football.html is the reference): Consent Mode v2
   gtag block, canonical + OG/Twitter meta, a schema.org @graph with Article,
   an optional DefinedTerm, FAQPage and BreadcrumbList, then the shared
   topbar / guide-content / site-footer markup.

   The FAQ list is written once in the data and rendered twice — once as
   FAQPage schema, once as <details> markup — so the two can never drift.

   Usage: node scripts/build-articles.mjs
*/

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { articles, CATEGORIES } from '../content/articles/index.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://www.ballknw.com';
const HUB = 'football-guides.html';

/* ── helpers ── */

const esc = (s) => String(s)
  .replace(/&(?![a-zA-Z#0-9]+;)/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

// Strip tags for places that need plain text (schema, meta) from HTML copy.
const plain = (s) => String(s).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

const bySlug = new Map(articles.map((a) => [a.slug, a]));

// Hand-written pages that predate this generator. Related links may point at
// them by slug, so they need a link label here.
const EXISTING_PAGES = new Map([
  ['what-is-a-low-block-in-football', 'What is a low block?'],
  ['what-is-a-false-9', 'What is a false 9?'],
  ['what-is-a-gaffer-in-football', 'What is a gaffer?'],
  ['football-terms', 'Football glossary'],
  ['free-football-manager', 'Free football manager games'],
  ['football-manager-26', 'Football Manager 26 explained'],
  ['what-does-a-football-manager-do', 'What does a football manager do?'],
  ['how-to-become-a-football-manager', 'How to become a football manager'],
  ['football-manager-pa-ca-explained', 'PA and CA explained'],
]);

function related(article) {
  return (article.related || [])
    .map((slug) => {
      const target = bySlug.get(slug);
      if (target) return { slug, label: target.linkText || target.h1 };
      const label = EXISTING_PAGES.get(slug);
      if (!label) throw new Error(`${article.slug}: unknown related slug "${slug}"`);
      return { slug, label };
    });
}

/* ── head ── */

const ANALYTICS = `<!-- Google tag (gtag.js) -->
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  /* Consent Mode v2 defaults. Everything starts denied so no cookie is set
     before the visitor answers the banner; shared/consent.js relays their
     choice with gtag('consent','update'). Measurement still works in the
     meantime via cookieless pings, which is the point for EEA traffic. */
  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    wait_for_update: 500
  });
  gtag('js', new Date());
  gtag('config', 'G-YK8TS0NPNG');
</script>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-YK8TS0NPNG"></script>
<script defer src="/_vercel/insights/script.js"></script>`;

function schema(a) {
  const url = `${SITE}/${a.slug}.html`;
  const graph = [
    {
      '@type': 'Article',
      headline: a.title.replace(/\s*\|\s*BALLKNW$/, ''),
      url,
      description: a.schemaDescription || a.description,
      datePublished: a.published,
      dateModified: a.updated || a.published,
      author: { '@type': 'Organization', name: 'BALLKNW' },
      publisher: { '@id': `${SITE}/#org` },
      isPartOf: { '@id': `${SITE}/#website` },
      ...(a.term ? { about: { '@id': `${url}#term` } } : {}),
    },
  ];

  if (a.term) {
    graph.push({
      '@type': 'DefinedTerm',
      '@id': `${url}#term`,
      name: a.term.name,
      description: a.term.description,
      inDefinedTermSet: {
        '@type': 'DefinedTermSet',
        '@id': `${SITE}/football-terms.html#glossary`,
        name: 'Football and Soccer Terminology',
        url: `${SITE}/football-terms.html`,
      },
    });
  }

  graph.push({
    '@type': 'FAQPage',
    mainEntity: a.faq.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: plain(f.a) },
    })),
  });

  graph.push({
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: 'Football guides', item: `${SITE}/${HUB}` },
      { '@type': 'ListItem', position: 3, name: a.h1, item: url },
    ],
  });

  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }, null, 2);
}

const NAV = `  <header class="topbar">
    <nav class="nav">
      <div class="wrap nav-inner">
        <a href="/" class="brand"><span class="mark">B</span>BALL<b>KNW</b></a>
        <div class="nav-links">
          <a href="/">Home</a>
          <a href="/gaffa/">Play Gaffa</a>
          <a href="/${HUB}">Guides</a>
          <a href="/about.html">About</a>
        </div>
      </div>
    </nav>
  </header>`;

const FOOTER = `  <footer class="site-footer">
    <a href="/">Home</a> · <a href="/gaffa/">Play Gaffa</a> · <a href="/${HUB}">All guides</a> · <a href="/football-terms.html">Football glossary</a> · <a href="/free-football-manager.html">Free FM games</a> · <a href="/privacy.html">Privacy</a> · <a href="/terms.html">Terms</a>
    <p class="footer-disclaimer">BALLKNW is an unofficial fan-made project, not affiliated with Sports Interactive, SEGA, Nordeus, Gameforge, or any club, federation or governing body. Game and competition names are used for honest description and comparison only.</p>
    <button class="btn-link cookie-settings-link" id="cookieSettingsBtn">Cookie settings</button>
  </footer>`;

/* ── page ── */

function renderArticle(a) {
  const url = `${SITE}/${a.slug}.html`;
  const rel = related(a);
  const ogTitle = a.ogTitle || a.title;
  const twitterTitle = a.twitterTitle || a.h1;
  const updated = a.updated || a.published;
  const updatedLabel = new Date(`${updated}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });

  const toc = a.sections.map((s) => `        <li><a href="#${s.id}">${esc(s.tocLabel || s.h2)}</a></li>`).join('\n');

  // Two display units per page (top and end) plus the footer smartlink, which
  // matches the ad density of the hand-written explainers.
  const body = a.sections.map((s) => {
    const html = s.html.trim().split('\n').map((l) => (l ? `      ${l}` : l)).join('\n');
    return `    <section class="guide-section" id="${s.id}">
      <h2>${esc(s.h2)}</h2>
${html}
    </section>`;
  }).join('\n\n');

  const faqMarkup = a.faq.map((f) => `      <details class="faq-item">
        <summary>${esc(f.q)}</summary>
        <p>${f.a}</p>
      </details>`).join('\n');

  const relatedLinks = rel
    .map((r) => `<a href="/${r.slug}.html">${esc(r.label)} →</a>`)
    .join(' · ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
${ANALYTICS}
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#0b120d">
  <title>${esc(a.title)} | BALLKNW</title>
  <meta name="description" content="${esc(a.description)}">
  <meta name="keywords" content="${esc(a.keywords)}">
  <link rel="canonical" href="${url}" />
  <meta property="og:site_name" content="BALLKNW">
  <meta property="og:url" content="${url}">
  <meta property="og:title" content="${esc(ogTitle)}">
  <meta property="og:description" content="${esc(a.ogDescription || a.description)}">
  <meta property="og:image" content="${SITE}/assets/og-image.png">
  <meta property="og:type" content="article">
  <meta property="og:locale" content="en_US">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(twitterTitle)}">
  <meta name="twitter:description" content="${esc(a.ogDescription || a.description)}">
  <meta name="twitter:image" content="${SITE}/assets/og-image.png">
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml" />
  <link rel="stylesheet" href="/theme.min.css">
  <link rel="stylesheet" href="/styles.min.css">
  <link rel="stylesheet" href="/explainer.css">
  <script type="application/ld+json">
${schema(a)}
  </script>
</head>
<body>
<div id="app">
${NAV}

  <main class="about guide-content">
    <h1>${esc(a.h1)}</h1>
    <p class="standfirst">${a.standfirst}</p>
    <p class="byline">Updated ${updatedLabel} · BALLKNW</p>
${a.topNav ? `\n    ${a.topNav}\n` : ''}
    <div class="answer-box">
      <div class="lbl">Short answer</div>
      <p>${a.answer}</p>
    </div>

    <nav class="toc">
      <h2>On this page</h2>
      <ol>
${toc}
        <li><a href="#faq">Common questions</a></li>
      </ol>
    </nav>

    <div class="ad-slot" id="articleTopAd"><span class="ad-slot-label">Advertisement</span></div>

${body}

    <div class="ad-slot" id="articleEndAd"><span class="ad-slot-label">Advertisement</span></div>

    <section class="guide-section" id="faq">
      <h2>Common questions</h2>
${faqMarkup}
    </section>

    <div class="end-cta">
      <h3>${esc(a.cta?.h3 || 'Try it yourself')}</h3>
      <p>${a.cta?.p || 'Gaffa is a free browser football manager — pick a club, set your tactics and play a full season. No download, no account, nothing to install.'}</p>
      <p><a href="/gaffa/" class="btn btn-primary" style="display:inline-block;margin-top:14px">Play Gaffa free →</a></p>
      <p style="margin-top:16px;font-size:13px">${relatedLinks}</p>
    </div>
    <div class="ad-slot" id="ad-content-footer" data-adsterra-brand="smartlink"></div>
  </main>

${FOOTER}

</div>

<script src="/shared/consent.min.js" defer></script>
<script src="/shared/ads.min.js" defer></script>
</body>
</html>
`;
}

/* ── hub ── */

function renderHub() {
  // Newest article date, so the hub's byline tracks the content rather than
  // the day the build happened to run.
  const hubUpdated = new Date(`${articles
    .map((a) => a.updated || a.published)
    .sort()
    .at(-1)}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });

  const groups = CATEGORIES.map((cat) => {
    const items = articles
      .filter((a) => a.category === cat.id)
      .map((a) => `        <a class="guide-card" href="/${a.slug}.html">
          <span class="guide-card-title">${esc(a.h1)}</span>
          <span class="guide-card-desc">${esc(a.cardBlurb || plain(a.standfirst))}</span>
        </a>`)
      .join('\n');
    return `    <section class="guide-section" id="${cat.id}">
      <h2>${esc(cat.name)}</h2>
      <p>${esc(cat.blurb)}</p>
      <div class="guide-grid">
${items}
      </div>
    </section>`;
  }).join('\n\n');

  const itemList = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: 'Football Guides and Explainers',
        url: `${SITE}/${HUB}`,
        description: 'Every BALLKNW explainer in one place — tactical roles and formations, Football Manager 26 guides, and how football works off the pitch.',
        isPartOf: { '@id': `${SITE}/#website` },
        publisher: { '@id': `${SITE}/#org` },
      },
      {
        '@type': 'ItemList',
        itemListElement: articles.map((a, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: a.h1,
          url: `${SITE}/${a.slug}.html`,
        })),
      },
    ],
  }, null, 2);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
${ANALYTICS}
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#0b120d">
  <title>Football Guides &amp; Explainers — Tactics, Roles and Football Manager | BALLKNW</title>
  <meta name="description" content="Every BALLKNW guide in one place: tactical roles and formations explained, Football Manager 26 walkthroughs, and how scouting, transfers and analytics actually work.">
  <meta name="keywords" content="football guides, football tactics explained, football manager 26 guides, football positions explained, football roles explained">
  <link rel="canonical" href="${SITE}/${HUB}" />
  <meta property="og:site_name" content="BALLKNW">
  <meta property="og:url" content="${SITE}/${HUB}">
  <meta property="og:title" content="Football Guides &amp; Explainers">
  <meta property="og:description" content="Tactical roles, formations, Football Manager 26 guides and football careers — explained plainly.">
  <meta property="og:image" content="${SITE}/assets/og-image.png">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="en_US">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Football Guides &amp; Explainers">
  <meta name="twitter:description" content="Tactical roles, formations, Football Manager 26 guides and football careers — explained plainly.">
  <meta name="twitter:image" content="${SITE}/assets/og-image.png">
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml" />
  <link rel="stylesheet" href="/theme.min.css">
  <link rel="stylesheet" href="/styles.min.css">
  <link rel="stylesheet" href="/explainer.css">
  <script type="application/ld+json">
${itemList}
  </script>
</head>
<body>
<div id="app">
${NAV}

  <main class="about guide-content">
    <h1>Football Guides &amp; Explainers</h1>
    <p class="standfirst">${articles.length} guides: what every role and formation actually does, how to win at Football Manager 26, and how the business of football works behind the scenes.</p>
    <p class="byline">Updated ${hubUpdated} · BALLKNW</p>

    <div class="ad-slot" id="hubTopAd"><span class="ad-slot-label">Advertisement</span></div>

${groups}

    <div class="end-cta">
      <h3>Put the theory to work</h3>
      <p>Gaffa is a free browser football manager — pick a club, set your tactics and play a full season. No download, no account, nothing to install.</p>
      <p><a href="/gaffa/" class="btn btn-primary" style="display:inline-block;margin-top:14px">Play Gaffa free →</a></p>
    </div>
    <div class="ad-slot" id="ad-content-footer" data-adsterra-brand="smartlink"></div>
  </main>

${FOOTER}

</div>

<script src="/shared/consent.min.js" defer></script>
<script src="/shared/ads.min.js" defer></script>
</body>
</html>
`;
}

/* ── sitemap ── */

const STATIC_URLS = [
  ['/', '1.0', 'daily'],
  ['/gaffa/', '0.9', 'weekly'],
  ['/privacy.html', '0.5', 'yearly'],
  ['/terms.html', '0.5', 'yearly'],
  ['/about.html', '0.7', 'yearly'],
  ['/gaffer-guide.html', '0.7', 'weekly'],
  ['/free-football-manager.html', '0.9', 'monthly'],
  ['/football-terms.html', '0.9', 'monthly'],
  ['/what-is-a-low-block-in-football.html', '0.8', 'monthly'],
  ['/what-is-a-false-9.html', '0.8', 'monthly'],
  ['/what-is-a-gaffer-in-football.html', '0.8', 'monthly'],
  ['/best-football-manager-games-pc.html', '0.8', 'monthly'],
  ['/best-football-manager-games-android.html', '0.8', 'monthly'],
  ['/best-football-manager-games-iphone.html', '0.8', 'monthly'],
  ['/football-manager-26.html', '0.9', 'monthly'],
  ['/what-does-a-football-manager-do.html', '0.8', 'monthly'],
  ['/how-to-become-a-football-manager.html', '0.8', 'monthly'],
  ['/football-manager-pa-ca-explained.html', '0.8', 'monthly'],
  ['/soccer-positions-explained.html', '0.9', 'monthly'],
  ['/how-many-players-on-a-soccer-team.html', '0.9', 'monthly'],
  ['/arsenal-transfer-round-up.html', '0.5', 'weekly'],
];

// lastmod for the hand-written pages, preserved from the previous sitemap so
// regenerating it doesn't falsely bump their freshness dates.
const STATIC_LASTMOD = new Map(Object.entries({
  '/': '2026-07-08',
  '/gaffa/': '2026-07-08',
  '/privacy.html': '2026-07-08',
  '/terms.html': '2026-07-08',
  '/about.html': '2026-07-08',
  '/gaffer-guide.html': '2026-07-08',
  '/free-football-manager.html': '2026-08-07',
  '/football-terms.html': '2026-08-07',
  '/what-is-a-low-block-in-football.html': '2026-08-08',
  '/what-is-a-false-9.html': '2026-08-07',
  '/what-is-a-gaffer-in-football.html': '2026-08-07',
  '/best-football-manager-games-pc.html': '2026-07-26',
  '/best-football-manager-games-android.html': '2026-07-26',
  '/best-football-manager-games-iphone.html': '2026-08-10',
  '/football-manager-26.html': '2026-08-10',
  '/what-does-a-football-manager-do.html': '2026-08-10',
  '/how-to-become-a-football-manager.html': '2026-08-10',
  '/football-manager-pa-ca-explained.html': '2026-08-10',
  '/soccer-positions-explained.html': '2026-08-11',
  '/how-many-players-on-a-soccer-team.html': '2026-08-11',
  '/arsenal-transfer-round-up.html': '2026-08-11',
}));

// Adding a URL to STATIC_URLS without a matching STATIC_LASTMOD entry used to
// emit <lastmod>undefined</lastmod>, which Google rejects as an invalid date
// while still accepting the rest of the file — so the sitemap looked fine
// locally and failed only once submitted. Fail the build instead.
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/u;
const missingLastmod = [];
for (const entry of STATIC_URLS) {
  const loc = entry[0];
  if (!ISO_DATE.test(String(STATIC_LASTMOD.get(loc) || ''))) missingLastmod.push(loc);
}
if (missingLastmod.length > 0) {
  throw new Error(
    `STATIC_LASTMOD is missing a YYYY-MM-DD date for: ${missingLastmod.join(', ')}`,
  );
}

function renderSitemap() {
  const hubDate = articles[0].updated || articles[0].published;
  const entries = [
    ...STATIC_URLS.map(([loc, priority, changefreq]) => ({
      loc, priority, changefreq, lastmod: STATIC_LASTMOD.get(loc),
    })),
    { loc: `/${HUB}`, priority: '0.9', changefreq: 'weekly', lastmod: hubDate },
    ...articles.map((a) => ({
      loc: `/${a.slug}.html`,
      priority: '0.8',
      changefreq: 'monthly',
      lastmod: a.updated || a.published,
    })),
  ];

  const body = entries.map((e) => `  <url>
    <loc>${SITE}${e.loc}</loc>
    <lastmod>${e.lastmod}</lastmod>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
}

/* ── run ── */

const slugs = new Set();
for (const a of articles) {
  if (slugs.has(a.slug)) throw new Error(`duplicate slug: ${a.slug}`);
  slugs.add(a.slug);
  for (const key of ['title', 'h1', 'description', 'keywords', 'standfirst', 'answer', 'published', 'category']) {
    if (!a[key]) throw new Error(`${a.slug}: missing ${key}`);
  }
  if (!a.sections?.length) throw new Error(`${a.slug}: no sections`);
  if (!a.faq?.length) throw new Error(`${a.slug}: no FAQ entries`);
  if (!CATEGORIES.some((c) => c.id === a.category)) throw new Error(`${a.slug}: unknown category ${a.category}`);
  if (a.description.length > 165) throw new Error(`${a.slug}: meta description too long (${a.description.length})`);
  writeFileSync(join(ROOT, `${a.slug}.html`), renderArticle(a));
}

writeFileSync(join(ROOT, HUB), renderHub());
writeFileSync(join(ROOT, 'sitemap.xml'), renderSitemap());

console.log(`Wrote ${articles.length} articles, ${HUB} and sitemap.xml`);
