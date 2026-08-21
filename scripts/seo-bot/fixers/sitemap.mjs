/* sitemap.mjs — reconciles sitemap.xml with the pages that actually exist.

   Order-preserving on purpose. A regenerated-from-scratch sitemap is correct
   but produces a whole-file diff on every run, which makes the bot's PRs
   unreviewable and hides the one line that actually mattered. So existing
   entries stay where they are and are edited in place, stale ones are dropped,
   and new pages are appended.

   lastmod only ever moves forward, taken from the file's last commit. Moving
   it backwards would tell crawlers a page got older, and would stamp on a date
   somebody set deliberately.
*/

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const id = 'sitemap';

const defaultsFor = (route, config) =>
  config.sitemapDefaults.find((d) => d.match.test(route)) ?? { priority: '0.8', changefreq: 'monthly' };

const entryXml = ({ loc, lastmod, changefreq, priority }) => [
  '  <url>',
  `    <loc>${loc}</loc>`,
  ...(lastmod ? [`    <lastmod>${lastmod}</lastmod>`] : []),
  ...(changefreq ? [`    <changefreq>${changefreq}</changefreq>`] : []),
  ...(priority ? [`    <priority>${priority}</priority>`] : []),
  '  </url>',
].join('\n');

/** Split the file into the head, the raw <url> blocks in order, and the tail. */
function splitSitemap(xml) {
  const blocks = [];
  const re = /[ \t]*<url>[\s\S]*?<\/url>[ \t]*\n?/gi;
  let m;
  let lastEnd = 0;
  let head = '';
  while ((m = re.exec(xml))) {
    if (!blocks.length) head = xml.slice(0, m.index);
    blocks.push({ raw: m[0], start: m.index, end: m.index + m[0].length });
    lastEnd = m.index + m[0].length;
  }
  if (!blocks.length) return null;
  return { head, blocks, tail: xml.slice(lastEnd) };
}

const locOf = (raw) => /<loc>([\s\S]*?)<\/loc>/i.exec(raw)?.[1].trim() ?? null;
const fieldOf = (raw, tag) => new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i').exec(raw)?.[1].trim() ?? null;

export function fix(site, { dryRun = false } = {}) {
  const { config } = site;
  const path = join(site.root, config.sitemap);

  const wanted = new Map(site.indexable.map((p) => [p.url, p]));
  const keepVirtual = new Set(
    config.virtualRoutes.filter((r) => r.endsWith('/')).map((r) => `${config.site}${r}`),
  );

  /* ── no sitemap at all: write a fresh one ── */
  if (!existsSync(path)) {
    const rows = site.indexable.map((p) => ({
      loc: p.url, lastmod: p.lastmod, ...defaultsFor(p.route, config),
    }));
    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...rows.map(entryXml),
      '</urlset>',
      '',
    ].join('\n');
    if (!dryRun) writeFileSync(path, xml, 'utf8');
    return [{ file: config.sitemap, message: `Created sitemap.xml with ${rows.length} URLs` }];
  }

  const before = readFileSync(path, 'utf8');
  const parts = splitSitemap(before);
  if (!parts) {
    return [{ file: config.sitemap, message: 'sitemap.xml has no <url> entries and was left alone — check it by hand' }];
  }

  const added = [];
  const removed = [];
  const touched = [];
  const seen = new Set();

  /* ── edit existing entries in place ── */
  const kept = [];
  for (const block of parts.blocks) {
    const loc = locOf(block.raw);
    if (!loc) { removed.push('(entry with no <loc>)'); continue; }

    if (seen.has(loc)) { removed.push(`${loc} (duplicate)`); continue; }
    seen.add(loc);

    if (keepVirtual.has(loc)) { kept.push(block.raw); continue; }

    const page = wanted.get(loc);
    if (!page) { removed.push(loc); continue; }

    let raw = block.raw;
    const listed = fieldOf(raw, 'lastmod');
    // Forward-only: a hand-set later date wins over the commit date.
    if (!listed || listed.slice(0, 10) < page.lastmod) {
      raw = listed
        ? raw.replace(/<lastmod>[\s\S]*?<\/lastmod>/i, `<lastmod>${page.lastmod}</lastmod>`)
        : raw.replace(/(<loc>[\s\S]*?<\/loc>)/i, `$1\n    <lastmod>${page.lastmod}</lastmod>`);
      touched.push(`${page.file} lastmod ${listed ?? '(none)'} -> ${page.lastmod}`);
    }
    // A priority outside 0.0-1.0 is ignored by crawlers; reset it to the default.
    const priority = fieldOf(raw, 'priority');
    if (priority !== null && !(Number(priority) >= 0 && Number(priority) <= 1)) {
      const d = defaultsFor(page.route, config);
      raw = raw.replace(/<priority>[\s\S]*?<\/priority>/i, `<priority>${d.priority}</priority>`);
      touched.push(`${page.file} priority ${priority} -> ${d.priority}`);
    }
    kept.push(raw);
  }

  /* ── append pages the sitemap has never heard of ── */
  const newRows = [];
  for (const [url, page] of wanted) {
    if (seen.has(url)) continue;
    newRows.push(entryXml({ loc: url, lastmod: page.lastmod, ...defaultsFor(page.route, config) }));
    added.push(url);
  }

  if (!added.length && !removed.length && !touched.length) return [];

  const body = [...kept.map((r) => r.replace(/\n?$/, '\n')), ...newRows.map((r) => `${r}\n`)].join('');
  const after = `${parts.head}${body}${parts.tail.replace(/^\n+/, '')}`;

  if (after === before) return [];
  if (!dryRun) writeFileSync(path, after, 'utf8');

  const summary = [];
  if (added.length) summary.push(`${added.length} added`);
  if (removed.length) summary.push(`${removed.length} removed`);
  if (touched.length) summary.push(`${touched.length} updated`);

  return [{
    file: config.sitemap,
    message: `sitemap.xml: ${summary.join(', ')}`,
    added,
    removed,
    touched,
  }];
}
