#!/usr/bin/env node
/**
 * Generate player-data pages from gaffa/data/gamedata.json.
 *
 * These answer the questions people actually search every transfer window —
 * who the wonderkids are, who is cheap, whose contract is running down — using
 * data the site already owns. Nobody else in the niche can produce them as
 * cheaply, and they regenerate for free when the squads are rebuilt.
 *
 * Honesty rule, and it is not decorative: every page says on its face that
 * these are Gaffa's own in-game ratings for gameplay balance, not scouting
 * advice about real footballers. The site states that in its About page, its
 * FAQ and its structured data, and a page listing named real people with
 * numbers against them is exactly where that claim has to be visible rather
 * than buried.
 *
 * Run:  node scripts/build-player-pages.mjs
 *
 * NOTE: the page shell is duplicated from build-league-pages.mjs rather than
 * shared. That is a deliberate trade — factoring it out would mean editing a
 * generator that has already shipped 29 live pages, and the shell is stable.
 * If a third generator appears, extract it then.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'gaffa/data/gamedata.json'), 'utf8'));

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const CLUB = new Map(data.clubs.map((c) => [c.id, c]));
const LEAGUE_BY_DIV = new Map(data.leagues.map((l) => [l.division, l]));
const leagueOf = (p) => {
  const c = CLUB.get(p.clubId);
  return c ? LEAGUE_BY_DIV.get(c.division) : null;
};
const clubName = (p) => CLUB.get(p.clubId)?.name ?? '';
const leagueName = (p) => leagueOf(p)?.name ?? '';

const POS = { GK: 'Goalkeeper', DEF: 'Defender', MID: 'Midfielder', FWD: 'Forward' };

/** Money, rounded to something a person would say out loud. */
function money(v) {
  if (!v) return 'Free';
  if (v >= 1_000_000) return `£${(v / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1)}m`;
  if (v >= 1_000) return `£${Math.round(v / 1_000)}k`;
  return `£${v}`;
}

const players = data.players.filter((p) => CLUB.has(p.clubId));

/* ── the four datasets ── */

const growth = (p) => p.potential - p.rating;

const wonderkids = [...players]
  .filter((p) => p.age <= 21 && growth(p) >= 5)
  .sort((a, b) => b.potential - a.potential || growth(b) - growth(a))
  .slice(0, 50);

/* "Bargain" has to mean something. Requiring real headroom AND a low fee keeps
   out both the cheap players who will never improve and the expensive ones who
   obviously will. */
const bargains = [...players]
  .filter((p) => growth(p) >= 8 && p.value > 0 && p.value <= 2_000_000)
  .sort((a, b) => growth(b) - growth(a) || a.value - b.value)
  .slice(0, 50);

/* Deliberately "expiring contracts", not "free agents": these players are still
   at a club. Calling them free agents would be wrong, and the distinction is
   the whole reason the page is useful.
   
   The year is the season the data was built for, not the earliest year present.
   Taking the minimum picked 2025 — already in the past, and a page headed
   "contracts running out in 2025" is nonsense on a site read in 2026. Those
   rows are historic leftovers; the players actually in a final year are the
   ones whose deal ends in the current season. */
const BUILD_YEAR = Number(String(data.meta.built).slice(0, 4));
const EXPIRY_YEAR = players.some((p) => p.contractUntil === BUILD_YEAR)
  ? BUILD_YEAR
  : Math.min(...players.map((p) => p.contractUntil).filter((y) => typeof y === 'number' && y >= BUILD_YEAR));
const expiring = [...players]
  .filter((p) => p.contractUntil === EXPIRY_YEAR)
  .sort((a, b) => b.rating - a.rating)
  .slice(0, 50);

const best = [...players].sort((a, b) => b.rating - a.rating).slice(0, 40);
const bestByPos = Object.fromEntries(
  ['GK', 'DEF', 'MID', 'FWD'].map((k) => [
    k,
    [...players].filter((p) => p.pos === k).sort((a, b) => b.rating - a.rating).slice(0, 10),
  ]),
);

/* ── rendering ── */

function table(rows, cols) {
  return `      <div class="tbl-wrap">
        <table class="data">
          <thead><tr>${cols.map((c) => `<th>${esc(c.h)}</th>`).join('')}</tr></thead>
          <tbody>
${rows.map((p) => `            <tr>${cols.map((c) => `<td>${c.f(p)}</td>`).join('')}</tr>`).join('\n')}
          </tbody>
        </table>
      </div>`;
}

const C = {
  name: { h: 'Player', f: (p) => `<strong>${esc(p.name)}</strong>` },
  club: { h: 'Club', f: (p) => esc(clubName(p)) },
  league: { h: 'League', f: (p) => esc(leagueName(p)) },
  pos: { h: 'Position', f: (p) => esc(POS[p.pos] || p.pos) },
  role: { h: 'Role', f: (p) => esc(p.role) },
  age: { h: 'Age', f: (p) => p.age },
  nat: { h: 'Nation', f: (p) => esc(p.nat) },
  rating: { h: 'Now', f: (p) => p.rating },
  potential: { h: 'Potential', f: (p) => p.potential },
  growth: { h: 'Room to grow', f: (p) => `+${growth(p)}` },
  value: { h: 'Value', f: (p) => money(p.value) },
  rated: { h: 'Rating', f: (p) => p.rating },
  until: { h: 'Contract ends', f: (p) => p.contractUntil ?? '—' },
};

const DISCLAIMER =
  'Every number here is Gaffa&rsquo;s own in-game rating, generated for gameplay ' +
  'balance from publicly available squad data. They are not scouting assessments ' +
  'of real footballers and are not sourced from any third-party ratings provider.';

function page({ slug, title, desc, h1, standfirst, sections, faq }) {
  const url = `https://www.ballknw.com/${slug}.html`;
  const jsonld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebPage', url, name: title, description: desc, isPartOf: { '@id': 'https://www.ballknw.com/#website' } },
      {
        '@type': 'FAQPage',
        mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
      },
    ],
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('consent', 'default', { ad_storage:'denied', ad_user_data:'denied', ad_personalization:'denied', analytics_storage:'denied', wait_for_update:500 });
  gtag('js', new Date());
  gtag('config', 'G-YK8TS0NPNG');
</script>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-YK8TS0NPNG"></script>
<script defer src="/_vercel/insights/script.js"></script>
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#0b120d">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}">
  <link rel="canonical" href="${url}" />
  <meta property="og:site_name" content="BALLKNW">
  <meta property="og:url" content="${url}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:image" content="https://www.ballknw.com/assets/og-image.png">
  <meta property="og:type" content="article">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="https://www.ballknw.com/assets/og-image.png">
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml" />
  <link rel="manifest" href="/manifest.webmanifest">
  <link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="Gaffa">
  <meta name="mobile-web-app-capable" content="yes">
  <link rel="stylesheet" href="/theme.min.css">
  <link rel="stylesheet" href="/styles.min.css">
  <link rel="stylesheet" href="/explainer.css">
  <script type="application/ld+json">
${JSON.stringify(jsonld, null, 2)}
  </script>
</head>
<body>
<div id="app">
  <header class="topbar">
    <nav class="nav">
      <div class="wrap nav-inner">
        <a href="/" class="brand"><span class="mark">B</span>BALL<b>KNW</b></a>
        <div class="nav-links">
          <a href="/">Home</a>
          <a href="/gaffa/">Play Gaffa</a>
          <a href="/leagues.html">Leagues</a>
          <a href="/football-guides.html">Guides</a>
        </div>
      </div>
    </nav>
  </header>

  <main class="about guide-content">
    <h1>${esc(h1)}</h1>
    <p class="standfirst">${standfirst}</p>

    <div class="answer-box">
      <div class="lbl">Read this first</div>
      <p>${DISCLAIMER}</p>
    </div>

    <div class="guide-cta-top"><a href="/gaffa/" class="btn btn-primary">Play Gaffa free →</a></div>

    <div class="ad-slot" id="playerTopAd"><span class="ad-slot-label">Advertisement</span></div>

${sections}

    <div class="ad-slot" id="playerEndAd"><span class="ad-slot-label">Advertisement</span></div>

    <div class="guide-section">
      <h2>Common questions</h2>
${faq.map((f) => `      <details class="faq-item">
        <summary>${esc(f.q)}</summary>
        <p>${esc(f.a)}</p>
      </details>`).join('\n')}
    </div>

    <div class="end-cta">
      <h3>Go and sign them</h3>
      <p>Pick a club, open the transfer market and see how far the budget stretches. Free, in your browser, nothing to install.</p>
      <p><a href="/gaffa/" class="btn btn-primary" style="display:inline-block;margin-top:14px">Play Gaffa free →</a></p>
      <p style="margin-top:16px;font-size:13px"><a href="/players.html">All player guides →</a> · <a href="/leagues.html">All 28 leagues →</a></p>
    </div>
  </main>

  <footer class="site-footer">
    <a href="/">Home</a> · <a href="/gaffa/">Play Gaffa</a> · <a href="/players.html">Players</a> · <a href="/leagues.html">Leagues</a> · <a href="/football-guides.html">Guides</a> · <a href="/privacy.html">Privacy</a> · <a href="/terms.html">Terms</a>
    <p class="footer-disclaimer">BALLKNW is an unofficial fan-made project, not affiliated with Sports Interactive, SEGA, EA Sports, or any club, league, federation or governing body. Player and club names are used descriptively to say which squads the game contains.</p>
    <button class="btn-link cookie-settings-link" id="cookieSettingsBtn">Cookie settings</button>
  </footer>
</div>
<script src="/shared/consent.min.js" defer></script>
<script src="/shared/ads.min.js" defer></script>
<script src="/shared/comp.js" defer></script>
<script src="/shared/auth.js" defer></script>
<script src="/shared/pwa.js" defer></script>
</body>
</html>
`;
}

/* ── the pages ── */

const PAGES = [
  {
    slug: 'football-manager-wonderkids',
    title: 'Best Wonderkids in Gaffa — Top Young Players to Sign',
    desc: `The ${wonderkids.length} highest-potential under-21s in Gaffa, with current rating, ceiling and asking price. Sign them before the fee catches up with the talent.`,
    h1: 'The best wonderkids to sign',
    standfirst: `Every player aged 21 or under with at least five rating points still to come, ranked by ceiling. ${wonderkids.length} names, across ${new Set(wonderkids.map((p) => leagueName(p))).size} leagues.`,
    sections:
      `    <div class="guide-section">
      <h2>Top ${wonderkids.length} by potential</h2>
      <p>Ordered by ceiling first, then by how far they still have to climb. The ones near the top of both columns are the ones a rival will pay for in two seasons' time.</p>
${table(wonderkids, [C.name, C.age, C.pos, C.club, C.league, C.rating, C.potential, C.growth, C.value])}
    </div>

    <div class="guide-section">
      <h2>The cheapest of them</h2>
      <p>Same list, reordered by asking price. This is where a lower-league budget actually goes furthest.</p>
${table([...wonderkids].sort((a, b) => a.value - b.value).slice(0, 15), [C.name, C.age, C.club, C.rating, C.potential, C.value])}
    </div>`,
    faq: [
      { q: 'What counts as a wonderkid in Gaffa?', a: `A player aged 21 or under whose potential rating is at least five points above their current one. On this squad set that is ${players.filter((p) => p.age <= 21 && growth(p) >= 5).length} players in total; the ${wonderkids.length} listed here are the highest ceilings among them.` },
      { q: 'Are these real scouting ratings?', a: 'No. They are Gaffa’s own in-game numbers, generated for gameplay balance from public squad data. They are not assessments of how good these players are in real life.' },
      { q: 'Will a wonderkid always reach their potential?', a: 'No. Potential is a ceiling, not a promise — game time, training and a bit of luck decide how close a player gets to it. Signing one and leaving them on the bench wastes them.' },
    ],
  },
  {
    slug: 'football-manager-bargains',
    title: 'Best Bargain Signings in Gaffa — Cheap Players Who Improve',
    desc: `Players under £2m with at least eight rating points of growth left. The cheapest route to a squad that gets better without a transfer budget.`,
    h1: 'Bargain signings: cheap now, good later',
    standfirst: `Players valued under £2m who still have eight or more rating points to gain. ${bargains.length} of them, and most are playing outside the leagues anyone scouts.`,
    sections:
      `    <div class="guide-section">
      <h2>Most growth for the least money</h2>
      <p>Sorted by how far they can still climb, then by price. A cheap player who improves is worth more than an expensive one who does not, and this table is the intersection.</p>
${table(bargains, [C.name, C.age, C.pos, C.club, C.league, C.rating, C.potential, C.growth, C.value])}
    </div>`,
    faq: [
      { q: 'How is a bargain defined here?', a: `A player valued at £2m or less whose potential is at least eight rating points above their current ability. Both conditions matter: cheap players who cannot improve are not bargains, and neither are good players who cost a fortune.` },
      { q: 'Why are so many of them in smaller leagues?', a: 'Because value tracks reputation as well as ability. A player at a lower-ranked club is priced by what their league is worth, which is exactly the gap you are trying to exploit.' },
      { q: 'Do these prices change during a save?', a: 'Yes. Value moves with form, age and contract length, so a bargain spotted early gets more expensive as they develop. The listed price is the starting point of a new game.' },
    ],
  },
  {
    slug: 'football-manager-expiring-contracts',
    title: `Players With Contracts Expiring in ${EXPIRY_YEAR} — Gaffa`,
    desc: `The best players whose deals run out in ${EXPIRY_YEAR}, ranked by ability. Short contracts mean lower fees and more willing sellers.`,
    h1: `Contracts running out in ${EXPIRY_YEAR}`,
    standfirst: `${players.filter((p) => p.contractUntil === EXPIRY_YEAR).length} players are into the last year of their deal. A club with a year left on an asset either sells or loses them, which is the cheapest leverage in any transfer window.`,
    sections:
      `    <div class="guide-section">
      <h2>Best players in their final year</h2>
      <p>Ranked by current ability. These are not free agents — every one is still under contract — but a selling club knows the clock is running, and that shows up in what they will accept.</p>
${table(expiring, [C.name, C.age, C.pos, C.club, C.league, C.rated, C.potential, C.until, C.value])}
    </div>`,
    faq: [
      { q: 'Are these players free agents?', a: `No, and the difference matters. Every player here is still contracted to a club until ${EXPIRY_YEAR}. What a short contract changes is the price — a club facing the loss of an asset for nothing is a more willing seller.` },
      { q: 'Is it better to wait until the contract expires?', a: 'Sometimes, but you are betting nobody else moves first and that the player does not simply re-sign. Buying in the last year usually costs a fraction of the same player two seasons earlier.' },
      { q: 'How many players are in this position?', a: `${players.filter((p) => p.contractUntil === EXPIRY_YEAR).length} across all 28 leagues. The table shows the ${expiring.length} highest-rated.` },
    ],
  },
  {
    slug: 'football-manager-best-players',
    title: 'Best Players in Gaffa — Highest Rated by Position',
    desc: `The highest-rated players in the game overall and in each position, with club, league and value. Who you are building around, or trying to sign.`,
    h1: 'The best players in the game',
    standfirst: `The strongest ${best.length} players across all 28 leagues, then the top ten in each position. These are the names that decide matches — and the ones a title challenge usually has to buy.`,
    sections:
      `    <div class="guide-section">
      <h2>Top ${best.length} overall</h2>
${table(best, [C.name, C.age, C.pos, C.role, C.nat, C.club, C.league, C.rated, C.value])}
    </div>

${['GK', 'DEF', 'MID', 'FWD'].map((k) => `    <div class="guide-section">
      <h2>Best ${POS[k].toLowerCase()}s</h2>
${table(bestByPos[k], [C.name, C.age, C.role, C.club, C.league, C.rated, C.potential, C.value])}
    </div>`).join('\n\n')}`,
    faq: [
      { q: 'Can I sign any of these players?', a: 'In principle, if you can afford the fee and the wages and they fancy the move. In practice the very top of this list is out of reach for most clubs in their first season, which is rather the point of a career save.' },
      { q: 'Do these ratings match other football games?', a: 'No. They are Gaffa’s own numbers, built for balance inside this match engine from public squad data. Comparing them to another game’s ratings is not meaningful.' },
      { q: 'How often does this list change?', a: 'It is regenerated whenever the squad data is rebuilt, which happens each season. Within a save, ratings move as players develop, age and lose form.' },
    ],
  },
];

/* ── index page ── */
function indexPage() {
  const cards = PAGES.map(
    (p) => `      <p style="margin:0 0 12px"><a href="/${p.slug}.html"><strong>${esc(p.h1)}</strong></a> — ${esc(p.desc)}</p>`,
  ).join('\n');
  return page({
    slug: 'players',
    title: 'Player Guides — Wonderkids, Bargains and the Best in Gaffa',
    desc: `Who to sign in Gaffa: the highest-potential wonderkids, the cheapest players who still improve, contracts running down, and the best in every position.`,
    h1: 'Who to sign',
    standfirst: `Four ways through ${players.length.toLocaleString('en-GB')} players across 28 leagues, depending on whether you have a budget, a rebuild, or a title to win now.`,
    sections: `    <div class="guide-section">
      <h2>The lists</h2>
${cards}
    </div>`,
    faq: [
      { q: 'Where does this data come from?', a: `Gaffa’s own squad dataset — ${players.length.toLocaleString('en-GB')} players across ${data.leagues.length} leagues, built from publicly available squad information. Ratings are our own stylised approximations for gameplay balance.` },
      { q: 'How often is it updated?', a: 'These pages are generated from the game data, so they refresh whenever the squads are rebuilt for a new season.' },
    ],
  });
}

const written = [];
for (const spec of PAGES) {
  fs.writeFileSync(path.join(ROOT, `${spec.slug}.html`), page(spec));
  written.push(`${spec.slug}.html`);
}
fs.writeFileSync(path.join(ROOT, 'players.html'), indexPage());
written.push('players.html');

/* Keep sitemap.xml in step, between markers so a rerun replaces rather than appends. */
const SITEMAP = path.join(ROOT, 'sitemap.xml');
const BEGIN = '  <!-- BEGIN generated player pages -->';
const END = '  <!-- END generated player pages -->';
const today = new Date().toISOString().slice(0, 10);
let xml = fs.readFileSync(SITEMAP, 'utf8');
const block = [
  BEGIN,
  ...['players.html', ...written.filter((f) => f !== 'players.html')].map(
    (f) =>
      `  <url>\n    <loc>https://www.ballknw.com/${f}</loc>\n    <lastmod>${today}</lastmod>\n` +
      `    <changefreq>monthly</changefreq>\n    <priority>${f === 'players.html' ? '0.8' : '0.7'}</priority>\n  </url>`,
  ),
  END,
].join('\n');
const existing = new RegExp(`${BEGIN}[\\s\\S]*?${END}\\n?`);
xml = existing.test(xml) ? xml.replace(existing, block + '\n') : xml.replace('</urlset>', block + '\n</urlset>');
fs.writeFileSync(SITEMAP, xml);

console.log(`Wrote ${written.length} pages:`);
for (const f of written) console.log('  ' + f);
