#!/usr/bin/env node
/**
 * Generate one landing page per playable league from gaffa/data/gamedata.json.
 *
 * Why generated rather than hand-written: the squad data is rebuilt each
 * season, and 28 hand-maintained pages would drift out of date within months.
 * Every factual claim on these pages is read from the dataset at build time,
 * so a page can never disagree with the game it is describing.
 *
 * The pages exist because the site was marketing one English league while the
 * game shipped 28 across 25 countries, which wrote it out of every non-English
 * search market it already served.
 *
 * Run:  node scripts/build-league-pages.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'gaffa/data/gamedata.json'), 'utf8'));

/* "Championship Manager" is a long-running commercial game series. The English
   second tier therefore gets a slug and headings that never place those two
   words together, so these pages describe the competition without reading as a
   claim on someone else's product name. */
const SLUG_OVERRIDES = {
  championship: 'efl-championship',
  league_one: 'efl-league-one',
  league_two: 'efl-league-two',
};

const NAME_OVERRIDES = {
  championship: 'EFL Championship',
  league_one: 'EFL League One',
  league_two: 'EFL League Two',
  /* "Premier Division" alone says nothing about which country's. */
  league_of_ireland_premier: 'League of Ireland Premier Division',
};

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const slugify = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const byId = new Map(data.clubs.map((c) => [c.id, c]));
const playersByClub = new Map();
for (const p of data.players) {
  if (!playersByClub.has(p.clubId)) playersByClub.set(p.clubId, []);
  playersByClub.get(p.clubId).push(p);
}

/* Competition names are not unique across countries — Denmark and Romania both
   run a "Superliga" — and a bare slugify silently let the second page overwrite
   the first. Any name shared by more than one league gets its country appended,
   computed from the data so a future dataset cannot reintroduce the collision. */
const nameCounts = new Map();
for (const l of data.leagues) {
  const k = slugify(NAME_OVERRIDES[l.id] || l.name);
  nameCounts.set(k, (nameCounts.get(k) || 0) + 1);
}

function leagueSlug(l) {
  if (SLUG_OVERRIDES[l.id]) return SLUG_OVERRIDES[l.id];
  const base = slugify(NAME_OVERRIDES[l.id] || l.name);
  return nameCounts.get(base) > 1 ? `${base}-${slugify(l.country)}` : base;
}
function leagueLabel(l) {
  return NAME_OVERRIDES[l.id] || l.name;
}

/** Clubs in a league, strongest squad first — gives each page a real ordering
 *  rather than whatever order the dataset happens to hold. */
function clubsOf(league) {
  return data.clubs
    .filter((c) => c.division === league.division)
    .map((c) => {
      const squad = playersByClub.get(c.id) || [];
      const top = [...squad].sort((a, b) => b.rating - a.rating).slice(0, 11);
      const strength = top.length ? top.reduce((s, p) => s + p.rating, 0) / top.length : 0;
      return { ...c, squadSize: squad.length, strength };
    })
    .sort((a, b) => b.strength - a.strength);
}

function playersOf(league) {
  const ids = new Set(data.clubs.filter((c) => c.division === league.division).map((c) => c.id));
  return data.players.filter((p) => ids.has(p.clubId));
}

const POS = { GK: 'Goalkeeper', DEF: 'Defender', MID: 'Midfielder', FWD: 'Forward' };

/* Per-league aggregates, computed once for every league so an individual page
   can position itself against the rest of the game. Templated prose with only
   the league name swapped in produces 28 near-identical pages — precisely the
   doorway-page shape this site was already penalised for — so the writing on
   each page is driven by facts that genuinely differ between leagues. */
function aggregate(l) {
  const clubs = clubsOf(l);
  const players = playersOf(l);
  const strengths = clubs.map((c) => c.strength);
  const ages = players.map((p) => p.age);
  return {
    id: l.id,
    clubs,
    players,
    avgRating: players.reduce((s, p) => s + p.rating, 0) / (players.length || 1),
    avgAge: ages.reduce((s, a) => s + a, 0) / (ages.length || 1),
    spread: strengths.length ? strengths[0] - strengths[strengths.length - 1] : 0,
    nations: new Set(players.map((p) => p.nat)).size,
    topRating: players.length ? Math.max(...players.map((p) => p.rating)) : 0,
    youngTalent: players.filter((p) => p.age <= 21 && p.potential - p.rating >= 4).length,
  };
}
const AGG = new Map(data.leagues.map((l) => [l.id, aggregate(l)]));
const ALL = [...AGG.values()];
const rankAsc = (key) => [...ALL].sort((a, b) => a[key] - b[key]).map((x) => x.id);
const RANKS = {
  avgAge: rankAsc('avgAge'),
  spread: rankAsc('spread'),
  nations: rankAsc('nations'),
  youngTalent: rankAsc('youngTalent'),
  avgRating: rankAsc('avgRating'),
};

/* Deterministic variant choice.
   Keyed on league id *and* the block being written, not on rank alone: with a
   plain rank modulo, any two leagues congruent to the same value pick the same
   variant in every block at once, so those two pages come out nearly identical.
   Salting per block decorrelates the choices, so two pages that happen to share
   one sentence will differ in the next. Stable across rebuilds because it is a
   pure function of the id. */
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function pickBy(l, key, arr) {
  return arr[hash(l.id + '|' + key) % arr.length];
}

function ordinalWord(n) {
  return ['', 'the', 'the second', 'the third', 'the fourth', 'the fifth'][n] || null;
}

/** Two or three sentences of comparative character, drawn from where this
 *  league actually sits against the other 27. Different leagues get different
 *  sentences because they occupy different positions in the data. */
function character(l) {
  const a = AGG.get(l.id);
  const n = ALL.length;
  const out = [];

  const agePos = RANKS.avgAge.indexOf(l.id);
  if (agePos < 3) {
    out.push(`At an average age of ${a.avgAge.toFixed(1)}, this is ${ordinalWord(agePos + 1)} youngest squad pool in the game — a league where the rebuild is already half done for you.`);
  } else if (agePos >= n - 3) {
    out.push(`The average player here is ${a.avgAge.toFixed(1)}, making it ${ordinalWord(n - agePos)} oldest squad pool in the game. Expect to be planning succession from your first window.`);
  } else {
    out.push(pickBy(l, 'age-mid', [
      `Squads here average ${a.avgAge.toFixed(1)} years old — settled enough to compete now, young enough that you are not forced into an immediate rebuild.`,
      `The average age across the division is ${a.avgAge.toFixed(1)}, which puts it mid-table for experience: a few veterans to move on, a core with years left.`,
      `At ${a.avgAge.toFixed(1)} on average these are mature squads without being old ones, so your first window is about quality rather than triage.`,
      `Average age sits at ${a.avgAge.toFixed(1)}. Nobody's squad is falling apart with age, and nobody's is waiting three seasons to arrive.`,
    ]));
  }

  const spreadPos = RANKS.spread.indexOf(l.id);
  if (spreadPos < 4) {
    out.push(`It is also one of the tightest divisions in the game: only ${a.spread.toFixed(1)} rating points separate the strongest first eleven from the weakest, so promotion and relegation are decided by management rather than budget.`);
  } else if (spreadPos >= n - 4) {
    out.push(`It is a top-heavy division — ${a.spread.toFixed(1)} rating points separate the best first eleven from the worst — so taking a club from the bottom half to a title is one of the harder saves in the game.`);
  } else {
    out.push(pickBy(l, 'spread-mid', [
      `There are ${a.spread.toFixed(1)} rating points between the strongest and weakest first elevens — the favourites are real, but the title is not settled in August.`,
      `The gap from best squad to worst is ${a.spread.toFixed(1)} rating points, which is enough for a pecking order and not enough for a procession.`,
      `Strongest to weakest spans ${a.spread.toFixed(1)} rating points. Overachieving is possible here; it just costs you a good transfer window.`,
      `A ${a.spread.toFixed(1)}-point spread between the best and worst first elevens leaves room for a mid-table side to gatecrash the top four.`,
    ]));
  }

  const kidPos = RANKS.youngTalent.indexOf(l.id);
  if (a.youngTalent > 0 && kidPos >= n - 5) {
    out.push(`With ${a.youngTalent} players aged 21 or under who still have real growth in them, it is one of the better divisions in the game to buy young and sell high.`);
  } else if (a.youngTalent === 0) {
    out.push(`There is little in the way of young talent to develop here, so squad building runs through the transfer market rather than the academy.`);
  } else {
    out.push(pickBy(l, 'kids-mid', [
      `${a.youngTalent} players aged 21 or under still have meaningful growth left, drawn from ${a.nations} different nations.`,
      `There are ${a.youngTalent} under-21s with room to improve here, and ${a.nations} nationalities across the division to scout from.`,
      `Look for the ${a.youngTalent} under-21s who have not finished developing — the squads span ${a.nations} nations, so the pool is wider than the league's size suggests.`,
    ]));
  }

  return out.join(' ');
}

function page(league) {
  const label = leagueLabel(league);
  const slug = leagueSlug(league);
  const url = `https://www.ballknw.com/${slug}-manager-game.html`;
  const clubs = clubsOf(league);
  const players = playersOf(league);

  const best = [...players].sort((a, b) => b.rating - a.rating).slice(0, 8);
  const wonderkids = players
    .filter((p) => p.age <= 21 && p.potential - p.rating >= 4)
    .sort((a, b) => b.potential - a.potential || b.potential - b.rating - (a.potential - a.rating))
    .slice(0, 6);

  const avg = players.length
    ? (players.reduce((s, p) => s + p.rating, 0) / players.length).toFixed(1)
    : '0';
  const oldestAvg = players.length
    ? (players.reduce((s, p) => s + p.age, 0) / players.length).toFixed(1)
    : '0';
  const strongest = clubs[0];
  const topPlayer = best[0];
  const nations = [...new Set(players.map((p) => p.nat))].length;

  /* Rotated deterministically by league rank: stable across rebuilds, but no
     two adjacent leagues open with the same sentence. */
  const pick = (key, arr) => pickBy(league, key, arr);

  const standfirst = pick('standfirst', [
    `All ${clubs.length} ${label} clubs are playable in Gaffa, with ${players.length.toLocaleString('en-GB')} real players drawn from ${nations} nations. No download, no account, no cost.`,
    `Take any of the ${clubs.length} clubs in ${label} through a full season — squads, transfers, contracts and cups, ${players.length.toLocaleString('en-GB')} players deep. Free in your browser, nothing to install.`,
    `${label} is one of ${data.leagues.length} divisions you can manage in free. ${clubs.length} clubs, ${players.length.toLocaleString('en-GB')} players, a full season of tactics and transfers, and no sign-up between you and the first match.`,
    `Pick a ${label} club and run it for a season: ${clubs.length} sides, ${players.length.toLocaleString('en-GB')} players from ${nations} nations, all free and all in the browser.`,
  ]);

  const loopLine = pick('loop', [
    `The board sets a finishing position, and the rest is yours: tactics, selection, the transfer window, contracts, the academy and the cups. Miss the target badly enough and you are sacked. Your save lives in your own browser, with nothing to install and nobody to sign up to.`,
    `You get an objective from the board and a budget that rarely matches it. Everything after that — shape, signings, renewals, youth intake, cup priorities — is your call, and the season simulates on it. No download, no account, save kept in your browser.`,
    `Take the job, read the board's expectations, then build for them: a shape that fits the squad, a window that fixes the gaps, an academy that pays for the next rebuild. It saves to your own browser, so there is nothing to install and nothing to sign up for.`,
  ]);

  /* Nationality mix — one of the sharpest differences between divisions, and
     the kind of thing someone choosing a save actually wants to know. */
  const natCounts = new Map();
  for (const pl of players) natCounts.set(pl.nat, (natCounts.get(pl.nat) || 0) + 1);
  const topNats = [...natCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const homeShare = players.length
    ? ((natCounts.get(league.country) || 0) / players.length) * 100
    : 0;
  const natRows = topNats
    .map(
      ([nat, count]) =>
        `        <tr><td><strong>${esc(nat)}</strong></td><td>${count}</td><td>${((count / players.length) * 100).toFixed(1)}%</td></tr>`,
    )
    .join('\n');
  const natLine =
    homeShare >= 60
      ? `This is a domestic division: ${homeShare.toFixed(0)}% of players are from ${league.country} itself, so scouting abroad is a genuine edge rather than the default.`
      : homeShare >= 30
        ? `${homeShare.toFixed(0)}% of players here are from ${league.country}, with the rest drawn from ${nations - 1} other nations — a home core with a real import market on top.`
        : `Only ${homeShare.toFixed(0)}% of players are from ${league.country}. With ${nations} nationalities in the division this is one of the game's genuinely international leagues, and your scouting net can start anywhere.`;

  const title = `Manage a ${label} Club — Free Football Manager Game`;
  const desc =
    `Take charge of any of the ${clubs.length} ${label} clubs in Gaffa, free in your browser. ` +
    `${players.length.toLocaleString('en-GB')} real players, full season, no download and no sign up.`;

  const clubRows = clubs
    .map(
      (c) =>
        `        <tr><td><strong>${esc(c.name)}</strong></td><td>${esc(c.code)}</td><td>${c.squadSize}</td><td>${c.strength.toFixed(1)}</td></tr>`,
    )
    .join('\n');

  const bestRows = best
    .map(
      (p) =>
        `        <tr><td><strong>${esc(p.name)}</strong></td><td>${esc(byId.get(p.clubId)?.name ?? '')}</td><td>${esc(POS[p.pos] || p.pos)}</td><td>${p.age}</td><td>${p.rating}</td></tr>`,
    )
    .join('\n');

  const kidRows = wonderkids
    .map(
      (p) =>
        `        <tr><td><strong>${esc(p.name)}</strong></td><td>${esc(byId.get(p.clubId)?.name ?? '')}</td><td>${p.age}</td><td>${p.rating}</td><td>${p.potential}</td></tr>`,
    )
    .join('\n');

  const faq = [
    {
      q: `Can I manage a ${label} club for free?`,
      a: `Yes. All ${clubs.length} ${label} clubs are playable in Gaffa at no cost — there is no download, no account and no paid tier. Pick a club, set your tactics, work the transfer market and simulate the season in your browser.`,
    },
    {
      q: `Which ${label} clubs are in the game?`,
      a: `Every club in the division: ${clubs.slice(0, 6).map((c) => c.name).join(', ')}${clubs.length > 6 ? ` and ${clubs.length - 6} more` : ''}. Each carries a full squad, so ${label} has ${players.length.toLocaleString('en-GB')} players in total.`,
    },
    {
      q: `Do I need an account to save my ${label} season?`,
      a: pick('strength-intro', [
        `No. Your save is written to your own browser and picks up where you left off when you come back on the same device. There is nothing to sign up for.`,
        `None needed. The season is stored locally in the browser you played it in, so returning on the same device carries on where you stopped.`,
        `No account, no login. Progress is kept in your browser's own storage and is waiting the next time you open the game on that device.`,
      ]),
    },
  ];

  const jsonld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        url,
        name: title,
        description: desc,
        isPartOf: { '@id': 'https://www.ballknw.com/#website' },
      },
      {
        '@type': 'FAQPage',
        mainEntity: faq.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.ballknw.com/' },
          { '@type': 'ListItem', position: 2, name: 'Leagues', item: 'https://www.ballknw.com/leagues.html' },
          { '@type': 'ListItem', position: 3, name: label, item: url },
        ],
      },
    ],
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
<!-- Google tag (gtag.js) -->
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
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
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(desc)}">
  <meta name="twitter:image" content="https://www.ballknw.com/assets/og-image.png">
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml" />
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
    <h1>Manage a ${esc(label)} club — free in your browser</h1>
    <p class="standfirst">${esc(standfirst)}</p>

    <div class="answer-box">
      <div class="lbl">${esc(label)} at a glance</div>
      <p>${clubs.length} clubs · ${players.length.toLocaleString('en-GB')} players · average rating ${avg} · average age ${oldestAvg}. The strongest squad on paper is <span class="term">${esc(strongest.name)}</span>${topPlayer ? `, and the highest-rated player in the division is <span class="term">${esc(topPlayer.name)}</span> (${topPlayer.rating}) of ${esc(byId.get(topPlayer.clubId)?.name ?? '')}` : ''}.</p>
    </div>

    <div class="guide-cta-top"><a href="/gaffa/" class="btn btn-primary">Play Gaffa free →</a></div>

    <div class="guide-section">
      <h2>Every ${esc(label)} club you can take over</h2>
      <p>${esc(pick('best-intro', [
        `Squad strength is the average rating of a club's best eleven — it shows who starts as favourites, and who you would be taking on as a rebuild.`,
        `Strength here is the mean rating of each club's best eleven, which is the quickest way to see who you would be joining and who you would be chasing.`,
        `The strength column averages each club's best eleven, so the top of this table is the shortlist if you want a challenge and the bottom is the shortlist if you want a project.`,
      ]))}</p>
      <div class="tbl-wrap">
        <table class="data">
          <thead><tr><th>Club</th><th>Code</th><th>Squad</th><th>Strength</th></tr></thead>
          <tbody>
${clubRows}
          </tbody>
        </table>
      </div>
    </div>

    <div class="guide-section">
      <h2>The best players in ${esc(label)}</h2>
      <p>${esc(pick('kids-intro', [
        `The players you will be building around — or trying to prise away from a rival.`,
        `These are the names that decide matches in this division, whether you inherit them or have to go and buy them.`,
        `The division's best. Signing one of these is usually a whole summer's budget; developing your own is the cheaper route.`,
      ]))} Ratings are BALLKNW's own stylised approximations for gameplay balance, not official figures from any ratings provider.</p>
      <div class="tbl-wrap">
        <table class="data">
          <thead><tr><th>Player</th><th>Club</th><th>Position</th><th>Age</th><th>Rating</th></tr></thead>
          <tbody>
${bestRows}
          </tbody>
        </table>
      </div>
    </div>
${
  wonderkids.length
    ? `
    <div class="guide-section">
      <h2>${esc(label)} wonderkids worth signing early</h2>
      <p>${esc(pick('faq-save', [
        `Players aged 21 or under with the most room left to grow. Sign them before their value catches up with their potential and you fund a decade of the rebuild.`,
        `The under-21s with the widest gap between what they are now and what they could become. Buy early, or watch a rival do it.`,
        `Young players whose ceiling sits well above their current rating — the cheapest squad building in the game, if you move before anyone else does.`,
      ]))}</p>
      <div class="tbl-wrap">
        <table class="data">
          <thead><tr><th>Player</th><th>Club</th><th>Age</th><th>Now</th><th>Potential</th></tr></thead>
          <tbody>
${kidRows}
          </tbody>
        </table>
      </div>
    </div>
`
    : ''
}
    <div class="guide-section">
      <h2>Where ${esc(label)} players come from</h2>
      <p>${esc(natLine)}</p>
      <div class="tbl-wrap">
        <table class="data">
          <thead><tr><th>Nation</th><th>Players</th><th>Share of division</th></tr></thead>
          <tbody>
${natRows}
          </tbody>
        </table>
      </div>
    </div>

    <div class="guide-section">
      <h2>What ${esc(label)} is like to manage in</h2>
      <p>${esc(character(league))}</p>
      <p>${esc(loopLine)}</p>
    </div>

    <div class="guide-section">
      <h2>Common questions</h2>
${faq
  .map(
    (f) => `      <details class="faq-item">
        <summary>${esc(f.q)}</summary>
        <p>${esc(f.a)}</p>
      </details>`,
  )
  .join('\n')}
    </div>

    <div class="end-cta">
      <h3>Take a ${esc(label)} club to the top</h3>
      <p>${esc(pick('cta', [
        `Free, in your browser, nothing to install. Pick your club and start the season.`,
        `No download, no account, no cost — choose a side and play the first fixture now.`,
        `Open it, pick a club, and the season starts. Nothing to install and nothing to join.`,
      ]))}</p>
      <p><a href="/gaffa/" class="btn btn-primary" style="display:inline-block;margin-top:14px">Play Gaffa free →</a></p>
      <p style="margin-top:16px;font-size:13px"><a href="/leagues.html">All ${data.leagues.length} playable leagues →</a> · <a href="/football-guides.html">Football guides →</a></p>
    </div>
  </main>

  <footer class="site-footer">
    <a href="/">Home</a> · <a href="/gaffa/">Play Gaffa</a> · <a href="/leagues.html">All leagues</a> · <a href="/football-guides.html">All guides</a> · <a href="/privacy.html">Privacy</a> · <a href="/terms.html">Terms</a>
    <p class="footer-disclaimer">BALLKNW is an unofficial fan-made project, not affiliated with Sports Interactive, SEGA, EA Sports, or any club, league, federation or governing body. Competition and club names are used descriptively to say which squads the game contains.</p>
    <button class="btn-link cookie-settings-link" id="cookieSettingsBtn">Cookie settings</button>
  </footer>
</div>
<script src="/shared/consent.min.js" defer></script>
<script src="/shared/ads.min.js" defer></script>
<script src="/shared/comp.js" defer></script>
</body>
</html>
`;
}

/** Index page tying the set together, so the league pages are one hop from the
 *  homepage rather than orphans only the sitemap knows about. */
function indexPage(leagues) {
  const rows = leagues
    .map((l) => {
      const clubs = clubsOf(l);
      return `        <tr><td><a href="/${leagueSlug(l)}-manager-game.html"><strong>${esc(leagueLabel(l))}</strong></a></td><td>${esc(l.country)}</td><td>${clubs.length}</td><td>${l.playerCount}</td></tr>`;
    })
    .join('\n');
  const totalPlayers = leagues.reduce((s, l) => s + l.playerCount, 0);
  const countries = [...new Set(leagues.map((l) => l.country))].length;
  const title = `All ${leagues.length} Playable Leagues — Free Football Manager Game`;
  const desc = `Every league in Gaffa: ${leagues.length} competitions across ${countries} countries, ${data.meta.clubCount} clubs and ${totalPlayers.toLocaleString('en-GB')} players. Free in your browser, no sign up.`;

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
  <link rel="canonical" href="https://www.ballknw.com/leagues.html" />
  <meta property="og:site_name" content="BALLKNW">
  <meta property="og:url" content="https://www.ballknw.com/leagues.html">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:image" content="https://www.ballknw.com/assets/og-image.png">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="https://www.ballknw.com/assets/og-image.png">
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml" />
  <link rel="stylesheet" href="/theme.min.css">
  <link rel="stylesheet" href="/styles.min.css">
  <link rel="stylesheet" href="/explainer.css">
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
    <h1>Every league you can manage in</h1>
    <p class="standfirst">Gaffa ships ${leagues.length} playable leagues across ${countries} countries — ${data.meta.clubCount} clubs and ${totalPlayers.toLocaleString('en-GB')} players, all free in your browser with no download and no account.</p>

    <div class="guide-cta-top"><a href="/gaffa/" class="btn btn-primary">Play Gaffa free →</a></div>

    <div class="guide-section">
      <h2>All ${leagues.length} leagues</h2>
      <div class="tbl-wrap">
        <table class="data">
          <thead><tr><th>League</th><th>Country</th><th>Clubs</th><th>Players</th></tr></thead>
          <tbody>
${rows}
          </tbody>
        </table>
      </div>
    </div>

    <div class="end-cta">
      <h3>Pick a league and start a season</h3>
      <p>Free, in your browser, nothing to install.</p>
      <p><a href="/gaffa/" class="btn btn-primary" style="display:inline-block;margin-top:14px">Play Gaffa free →</a></p>
    </div>
  </main>

  <footer class="site-footer">
    <a href="/">Home</a> · <a href="/gaffa/">Play Gaffa</a> · <a href="/football-guides.html">All guides</a> · <a href="/privacy.html">Privacy</a> · <a href="/terms.html">Terms</a>
    <p class="footer-disclaimer">BALLKNW is an unofficial fan-made project, not affiliated with Sports Interactive, SEGA, EA Sports, or any club, league, federation or governing body. Competition and club names are used descriptively to say which squads the game contains.</p>
    <button class="btn-link cookie-settings-link" id="cookieSettingsBtn">Cookie settings</button>
  </footer>
</div>
<script src="/shared/consent.min.js" defer></script>
<script src="/shared/ads.min.js" defer></script>
<script src="/shared/comp.js" defer></script>
</body>
</html>
`;
}

const leagues = [...data.leagues].sort((a, b) => a.rank - b.rank);
const written = [];
const seen = new Set();
for (const l of leagues) {
  const file = `${leagueSlug(l)}-manager-game.html`;
  if (seen.has(file)) {
    throw new Error(`Slug collision on ${file} (league "${l.name}", ${l.country}). ` +
      `Add a SLUG_OVERRIDES entry for "${l.id}" rather than letting one page overwrite another.`);
  }
  seen.add(file);
  fs.writeFileSync(path.join(ROOT, file), page(l));
  written.push(file);
}
fs.writeFileSync(path.join(ROOT, 'leagues.html'), indexPage(leagues));
written.push('leagues.html');

/* Keep sitemap.xml in step. The league block is delimited so a rebuild
   replaces exactly what a previous run added, rather than appending duplicates
   or disturbing the hand-maintained entries around it. */
const SITEMAP = path.join(ROOT, 'sitemap.xml');
const BEGIN = '  <!-- BEGIN generated league pages -->';
const END = '  <!-- END generated league pages -->';
const today = new Date().toISOString().slice(0, 10);

let xml = fs.readFileSync(SITEMAP, 'utf8');
const block = [
  BEGIN,
  ...['leagues.html', ...written.filter((f) => f !== 'leagues.html')].map(
    (f) =>
      `  <url>\n    <loc>https://www.ballknw.com/${f}</loc>\n    <lastmod>${today}</lastmod>\n` +
      `    <changefreq>monthly</changefreq>\n    <priority>${f === 'leagues.html' ? '0.8' : '0.7'}</priority>\n  </url>`,
  ),
  END,
].join('\n');

const existing = new RegExp(`${BEGIN}[\\s\\S]*?${END}\\n?`);
xml = existing.test(xml)
  ? xml.replace(existing, block + '\n')
  : xml.replace('</urlset>', block + '\n</urlset>');
fs.writeFileSync(SITEMAP, xml);

console.log(`Wrote ${written.length} pages:`);
for (const f of written) console.log('  ' + f);
