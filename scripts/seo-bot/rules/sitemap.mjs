/* sitemap.mjs — keeps sitemap.xml honest against the pages that exist.

   Sitemap drift is the classic slow failure on a static site: pages get added
   and the sitemap does not, so new content waits on discovery through links
   instead of being submitted. This is also the rule with the most valuable
   auto-fix, since the correct sitemap is fully derivable from the repo.
*/

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const id = 'sitemap';
export const describe = 'sitemap.xml completeness, staleness and host consistency';

/** Parse <url> entries out of a sitemap without an XML dependency. */
export function parseSitemap(xml) {
  const entries = [];
  const re = /<url>([\s\S]*?)<\/url>/gi;
  let m;
  while ((m = re.exec(xml))) {
    const block = m[1];
    const pick = (tag) => {
      const t = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i').exec(block);
      return t ? t[1].trim() : null;
    };
    entries.push({
      loc: pick('loc'),
      lastmod: pick('lastmod'),
      changefreq: pick('changefreq'),
      priority: pick('priority'),
    });
  }
  return entries;
}

export function run(site) {
  const { config } = site;
  const out = [];
  const file = config.sitemap;
  const push = (rule, severity, message, extra = {}) =>
    out.push({ rule, severity, page: file, message, ...extra });

  const path = join(site.root, file);
  if (!existsSync(path)) {
    push('sitemap-missing', 'error', 'No sitemap.xml', { fixable: true });
    return out;
  }

  const xml = readFileSync(path, 'utf8');
  const entries = parseSitemap(xml);

  if (!entries.length) {
    push('sitemap-empty', 'error', 'sitemap.xml contains no <url> entries', { fixable: true });
    return out;
  }

  const locs = new Set();
  for (const e of entries) {
    if (!e.loc) {
      push('sitemap-entry', 'error', 'A <url> entry has no <loc>', { fixable: true });
      continue;
    }
    if (locs.has(e.loc)) {
      push('sitemap-duplicate', 'error', `${e.loc} is listed twice`, { fixable: true });
    }
    locs.add(e.loc);

    if (!e.loc.startsWith(`${config.site}/`) && e.loc !== `${config.site}/`) {
      push('sitemap-host', 'error',
        `${e.loc} is not on ${config.site} — a sitemap may only list URLs on its own host`,
        { fixable: true });
    }
    if (e.lastmod && !/^\d{4}-\d{2}-\d{2}(T|$)/.test(e.lastmod)) {
      push('sitemap-lastmod', 'error', `lastmod "${e.lastmod}" on ${e.loc} is not a valid W3C date`,
        { fixable: true });
    }
    if (e.priority && !(Number(e.priority) >= 0 && Number(e.priority) <= 1)) {
      push('sitemap-priority', 'warn', `priority "${e.priority}" on ${e.loc} is outside 0.0–1.0`,
        { fixable: true });
    }
  }

  /* ── drift in both directions ── */

  const expected = new Map(site.indexable.map((p) => [p.url, p]));

  for (const [url, page] of expected) {
    if (!locs.has(url)) {
      push('sitemap-missing-page', 'error',
        `${page.file} is indexable but not in the sitemap — Google has not been told it exists`,
        { fixable: true });
    }
  }

  for (const loc of locs) {
    if (expected.has(loc)) continue;
    // Routes that exist at deploy time without a file in the repo are fine.
    const routePart = loc.slice(config.site.length) || '/';
    if (config.virtualRoutes.includes(routePart)) continue;

    const page = site.pages.find((p) => p.url === loc);
    if (page?.noindex) {
      push('sitemap-noindex', 'error',
        `${loc} is in the sitemap but the page is noindex — the two contradict each other`,
        { fixable: true });
    } else if (page?.ignored) {
      push('sitemap-ignored', 'warn', `${loc} is excluded from the audit but listed in the sitemap`,
        { fixable: true });
    } else {
      push('sitemap-stale', 'error', `${loc} is in the sitemap but no such page exists — it will 404`,
        { fixable: true });
    }
  }

  /* ── lastmod accuracy ── */
  for (const e of entries) {
    const page = expected.get(e.loc);
    if (!page || !e.lastmod) continue;
    const listed = e.lastmod.slice(0, 10);
    if (listed < page.lastmod) {
      push('sitemap-lastmod-stale', 'warn',
        `${page.file} was last changed ${page.lastmod} but the sitemap says ${listed}`,
        { fixable: true });
    }
  }

  return out;
}
