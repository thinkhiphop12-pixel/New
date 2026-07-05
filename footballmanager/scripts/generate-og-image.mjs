/**
 * Generate OG (Open Graph) image for Scout puzzle results
 * Creates a shareable image showing the puzzle theme and players
 *
 * This script generates an SVG image that can be cached or pre-generated
 * for puzzle sharing on Twitter, Facebook, Discord, etc.
 *
 * Usage: node scripts/generate-og-image.mjs --theme "Theme Name" --players "Player1, Player2, Player3, Player4"
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OG_IMAGES_DIR = join(__dirname, '..', 'public', 'og-images');

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const result = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, '');
    const value = args[i + 1] || '';
    result[key] = value;
  }

  return result;
}

// Generate SVG OG image for Scout puzzle
function generateScoutOGImage(theme, players = []) {
  const width = 1200;
  const height = 630;

  const playerList = players.slice(0, 4).map((p, i) => `
    <text x="100" y="${280 + i * 60}" font-size="20" fill="#333">
      ${escapeXml(p)}
    </text>
  `).join('');

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <!-- Background -->
  <rect width="${width}" height="${height}" fill="#ffffff"/>

  <!-- Brand color bar -->
  <rect width="${width}" height="80" fill="#0066cc"/>

  <!-- Logo/Branding -->
  <text x="40" y="55" font-family="Arial, sans-serif" font-size="36" font-weight="bold" fill="#ffffff">
    Ball KnW Scout
  </text>

  <!-- Theme title -->
  <text x="100" y="150" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="#222222">
    ${escapeXml(theme)}
  </text>

  <!-- Subtitle -->
  <text x="100" y="200" font-family="Arial, sans-serif" font-size="18" fill="#666666">
    Can you spot the connection? Daily puzzle with no account needed.
  </text>

  <!-- Sample players -->
  ${playerList}

  <!-- Bottom CTA -->
  <text x="100" y="${height - 50}" font-family="Arial, sans-serif" font-size="20" fill="#0066cc" font-weight="bold">
    ⚽ Play Scout at ballknw.com/scout
  </text>

  <!-- Decorative circles -->
  <circle cx="${width - 100}" cy="100" r="80" fill="#0066cc" opacity="0.1"/>
  <circle cx="1100" cy="${height - 100}" r="120" fill="#0066cc" opacity="0.1"/>
</svg>`;

  return svg;
}

// Generate SVG OG image for Gaffer game
function generateGafferOGImage(club, quote = '') {
  const width = 1200;
  const height = 630;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <!-- Background -->
  <rect width="${width}" height="${height}" fill="#f5f5f5"/>

  <!-- Brand color bar -->
  <rect width="${width}" height="80" fill="#0066cc"/>

  <!-- Logo/Branding -->
  <text x="40" y="55" font-family="Arial, sans-serif" font-size="36" font-weight="bold" fill="#ffffff">
    Ball KnW Gaffer
  </text>

  <!-- Club name -->
  <text x="100" y="180" font-family="Arial, sans-serif" font-size="56" font-weight="bold" fill="#222222">
    ${escapeXml(club)}
  </text>

  <!-- Manager quote if provided -->
  ${quote ? `
  <text x="100" y="270" font-family="Arial, sans-serif" font-size="24" fill="#666666" font-style="italic">
    "${escapeXml(quote)}"
  </text>
  ` : ''}

  <!-- Game features -->
  <text x="100" y="380" font-family="Arial, sans-serif" font-size="20" fill="#333333">
    ⚽ Manage your squad • 💰 Control transfers • 🏆 Build a dynasty
  </text>

  <!-- Bottom CTA -->
  <text x="100" y="${height - 50}" font-family="Arial, sans-serif" font-size="20" fill="#0066cc" font-weight="bold">
    Play free at ballknw.com/footballmanager
  </text>

  <!-- Decorative shapes -->
  <circle cx="${width - 150}" cy="150" r="100" fill="#0066cc" opacity="0.1"/>
  <rect x="${width - 200}" y="${height - 150}" width="150" height="120" fill="#0066cc" opacity="0.05"/>
</svg>`;

  return svg;
}

// XML escape for SVG text
function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Main
function main() {
  const args = parseArgs();
  const { theme, players, club, quote, type = 'scout' } = args;

  mkdirSync(OG_IMAGES_DIR, { recursive: true });

  let svg;
  let filename;

  if (type === 'scout' && theme) {
    const playerArray = players ? players.split(',').map(p => p.trim()) : [];
    svg = generateScoutOGImage(theme, playerArray);
    filename = `scout-${theme.toLowerCase().replace(/\s+/g, '-')}.svg`;
  } else if (type === 'gaffer' && club) {
    svg = generateGafferOGImage(club, quote);
    filename = `gaffer-${club.toLowerCase().replace(/\s+/g, '-')}.svg`;
  } else if (type === 'daily') {
    // Default: generate today's Scout puzzle image
    const themes = [
      'Players from the same club',
      'Players with the same nationality',
      'Young talents to watch',
    ];
    const selectedTheme = themes[Math.floor(Math.random() * themes.length)];
    svg = generateScoutOGImage(selectedTheme, []);
    filename = `scout-daily-${new Date().toISOString().slice(0, 10)}.svg`;
  } else {
    console.error('Usage:');
    console.error('  Scout: node generate-og-image.mjs --type scout --theme "Theme" --players "A, B, C"');
    console.error('  Gaffer: node generate-og-image.mjs --type gaffer --club "Club Name"');
    console.error('  Daily: node generate-og-image.mjs --type daily');
    process.exit(1);
  }

  const outputPath = join(OG_IMAGES_DIR, filename);
  writeFileSync(outputPath, svg, 'utf8');

  console.log(`✓ Generated OG image: ${filename}`);
  console.log(`  Path: ${outputPath}`);
}

main();
