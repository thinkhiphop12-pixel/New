/**
 * Generates sitemap.xml including all programmatically generated pages
 * Includes: homepage, blog posts, player pages, squad pages
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const METADATA_FILE = join(__dirname, '..', 'public', 'page-metadata.json');
const SITEMAP_OUT = join(__dirname, '..', 'sitemap.xml');

// Hardcoded static pages
const STATIC_PAGES = [
  { path: '/', priority: 1.0, changefreq: 'weekly' },
  { path: '/privacy.html', priority: 0.5, changefreq: 'yearly' },
  { path: '/terms.html', priority: 0.5, changefreq: 'yearly' },
  { path: '/scout', priority: 0.9, changefreq: 'weekly' },
  { path: '/footballmanager', priority: 0.9, changefreq: 'weekly' },
  { path: '/blog/index.html', priority: 0.8, changefreq: 'daily' },
];

// Try to read generated page metadata
let dynamicPages = [];
try {
  const metadata = JSON.parse(readFileSync(METADATA_FILE, 'utf8'));
  dynamicPages = metadata.map(page => ({
    path: page.path,
    priority: page.type === 'player' ? 0.6 : 0.7,
    changefreq: 'monthly',
    lastmod: page.lastmod,
  }));
} catch (e) {
  console.warn('⚠️  page-metadata.json not found; skipping dynamic pages');
}

// Generate blog post URLs (last 30 days)
const blogPages = [];
const today = new Date();
today.setHours(0, 0, 0, 0);

for (let i = 0; i < 30; i++) {
  const date = new Date(today);
  date.setDate(date.getDate() - i);
  const dateStr = date.toISOString().slice(0, 10);
  blogPages.push({
    path: `/blog/${dateStr}.html`,
    priority: 0.7,
    changefreq: 'monthly',
    lastmod: dateStr,
  });
}

// Combine all pages
const allPages = [...STATIC_PAGES, ...dynamicPages, ...blogPages];

// Remove duplicates
const seenPaths = new Set();
const uniquePages = allPages.filter(page => {
  if (seenPaths.has(page.path)) return false;
  seenPaths.add(page.path);
  return true;
});

// Generate XML
const urlEntries = uniquePages
  .map(page => {
    let xml = `  <url>\n    <loc>https://ballknw.com${page.path}</loc>`;
    if (page.lastmod) {
      xml += `\n    <lastmod>${page.lastmod}</lastmod>`;
    } else {
      xml += `\n    <lastmod>${new Date().toISOString().slice(0, 10)}</lastmod>`;
    }
    xml += `\n    <changefreq>${page.changefreq}</changefreq>\n    <priority>${page.priority}</priority>\n  </url>`;
    return xml;
  })
  .join('\n');

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;

writeFileSync(SITEMAP_OUT, sitemap, 'utf8');
console.log(`✓ Generated sitemap.xml with ${uniquePages.length} URLs`);
