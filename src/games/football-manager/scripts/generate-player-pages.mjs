/**
 * Generates SEO-optimized player and squad landing pages
 * Output:
 *   - public/players/[player-slug].html — individual player pages
 *   - public/squads/[club-slug].html — club squad pages
 *   - public/page-metadata.json — metadata for all pages (used in sitemap generation)
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GAMEDATA = join(__dirname, '..', 'public', 'data', 'gamedata.json');
const PLAYERS_OUT = join(__dirname, '..', 'public', 'players');
const SQUADS_OUT = join(__dirname, '..', 'public', 'squads');
const METADATA_OUT = join(__dirname, '..', 'public', 'page-metadata.json');

// Read gamedata
const gamedata = JSON.parse(readFileSync(GAMEDATA, 'utf8'));

// Utility: slugify names for URLs
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50);
}

// Generate player pages
function generatePlayerPage(player, club) {
  const slug = `${slugify(player.name)}-${player.id}`;
  const title = `${player.name} - ${club.name} - Ball KnW`;
  const description = `${player.name}, ${player.pos} for ${club.name}. Rating: ${player.rating}, Age: ${player.age}. Market value: £${(player.value / 1e6).toFixed(1)}M. Play as this player in Gaffa.`;

  const attrStr = `PAC: ${player.pac} | SHO: ${player.sho} | PAS: ${player.pas} | DRI: ${player.dri} | DEF: ${player.def} | PHY: ${player.phy}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://ballknw.com/players/${slug}.html">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <link rel="canonical" href="https://ballknw.com/players/${slug}.html">

  <!-- Schema.org Person markup -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": "${escapeJson(player.name)}",
    "jobTitle": "${escapeJson(player.pos)} for ${escapeJson(club.name)}",
    "nationality": "${escapeJson(player.nat)}",
    "description": "${escapeJson(description)}"
  }
  </script>

  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 800px; margin: 0 auto; padding: 2rem; }
    h1 { margin: 1rem 0; font-size: 2rem; }
    .meta { color: #666; font-size: 0.95rem; margin: 1rem 0; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 1rem; margin: 2rem 0; }
    .stat-box { border: 1px solid #ddd; padding: 1rem; border-radius: 8px; text-align: center; }
    .stat-label { font-size: 0.85rem; color: #666; }
    .stat-value { font-size: 1.5rem; font-weight: bold; color: #0066cc; }
    .back-link { color: #0066cc; text-decoration: none; }
    .back-link:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <a href="/" class="back-link">← Back to Ball KnW</a>
    <h1>${escapeHtml(player.name)}</h1>
    <div class="meta">
      <strong>${escapeHtml(club.name)}</strong> | ${player.pos} | ${player.nat} | Age ${player.age}
    </div>

    <div class="stats">
      <div class="stat-box">
        <div class="stat-label">Rating</div>
        <div class="stat-value">${player.rating}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Market Value</div>
        <div class="stat-value">£${(player.value / 1e6).toFixed(1)}M</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Weekly Wage</div>
        <div class="stat-value">£${player.wage.toLocaleString()}</div>
      </div>
    </div>

    <h2>Attributes</h2>
    <p>${attrStr}</p>

    <div style="margin-top: 2rem; padding: 1rem; background: #f0f0f0; border-radius: 8px;">
      <p><strong>Play Gaffa:</strong> Manage ${escapeHtml(club.name)}, sign ${escapeHtml(player.name)}, and build a championship team. No account needed.</p>
      <a href="/footballmanager" style="color: #0066cc; text-decoration: none;">Start Playing →</a>
    </div>
  </div>
</body>
</html>`;

  return { slug, html, path: `${PLAYERS_OUT}/${slug}.html` };
}

// Generate squad pages for each club
function generateSquadPage(club, clubPlayers) {
  const slug = slugify(club.name);
  const title = `${club.name} Squad - Ball KnW`;
  const description = `${club.name} squad for Gaffa. ${clubPlayers.length} players. Manage this team in our free football manager game.`;

  const playerList = clubPlayers
    .map(p => `<li>${escapeHtml(p.name)} - ${p.pos} (${p.rating})</li>`)
    .join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://ballknw.com/squads/${slug}.html">
  <link rel="canonical" href="https://ballknw.com/squads/${slug}.html">

  <!-- Schema.org Organization markup -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "SportsTeam",
    "name": "${escapeJson(club.name)}",
    "sport": "Football",
    "description": "${escapeJson(description)}",
    "memberCount": ${clubPlayers.length}
  }
  </script>

  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 800px; margin: 0 auto; padding: 2rem; }
    h1 { margin: 1rem 0; font-size: 2rem; }
    .squad-list { list-style: none; }
    .squad-list li { padding: 0.5rem 0; border-bottom: 1px solid #eee; }
    .back-link { color: #0066cc; text-decoration: none; }
    .back-link:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <a href="/" class="back-link">← Back to Ball KnW</a>
    <h1>${escapeHtml(club.name)} Squad</h1>
    <p>Manage ${escapeHtml(club.name)} and these ${clubPlayers.length} players in Gaffa.</p>

    <h2>Players</h2>
    <ul class="squad-list">
      ${playerList}
    </ul>

    <div style="margin-top: 2rem; padding: 1rem; background: #f0f0f0; border-radius: 8px;">
      <p><strong>Play Gaffa:</strong> Choose ${escapeHtml(club.name)}, manage transfers, tactics, and compete for trophies. No account needed.</p>
      <a href="/footballmanager" style="color: #0066cc; text-decoration: none;">Start Playing →</a>
    </div>
  </div>
</body>
</html>`;

  return { slug, html, path: `${SQUADS_OUT}/${slug}.html` };
}

// HTML escaping
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// For JSON, escape without full HTML entity encoding
function escapeJson(text) {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

// Main
mkdirSync(PLAYERS_OUT, { recursive: true });
mkdirSync(SQUADS_OUT, { recursive: true });

const playerPages = [];
const squadPages = [];
const pageMetadata = [];

// Generate player pages
for (const player of gamedata.players) {
  const club = gamedata.clubs.find(c => c.id === player.clubId);
  const page = generatePlayerPage(player, club || { name: 'Free Agents' });
  playerPages.push(page);
  pageMetadata.push({
    path: `/players/${page.slug}.html`,
    type: 'player',
    title: player.name,
    lastmod: new Date().toISOString().slice(0, 10),
  });
}

// Generate squad pages
for (const club of gamedata.clubs) {
  const clubPlayers = gamedata.players.filter(p => p.clubId === club.id);
  const page = generateSquadPage(club, clubPlayers);
  squadPages.push(page);
  pageMetadata.push({
    path: `/squads/${page.slug}.html`,
    type: 'squad',
    title: `${club.name} Squad`,
    lastmod: new Date().toISOString().slice(0, 10),
  });
}

// Write all pages to disk
for (const page of playerPages) {
  writeFileSync(page.path, page.html, 'utf8');
}

for (const page of squadPages) {
  writeFileSync(page.path, page.html, 'utf8');
}

// Write metadata
writeFileSync(METADATA_OUT, JSON.stringify(pageMetadata, null, 2), 'utf8');

console.log(
  `✓ Generated ${playerPages.length} player pages + ${squadPages.length} squad pages (${pageMetadata.length} total)`
);
