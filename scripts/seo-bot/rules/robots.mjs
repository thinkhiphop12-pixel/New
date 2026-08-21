/* robots.mjs — robots.txt and llms.txt.

   A wrong Disallow is the single most expensive line on a site, so the checks
   here are blunt: does the sitemap line point at a sitemap that exists on the
   canonical host, and is anything in the sitemap blocked from being crawled?
*/

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const id = 'robots';
export const describe = 'robots.txt directives and sitemap declaration';

/** Very small robots.txt reader: group directives by user-agent. */
function parseRobots(text) {
  const groups = [];
  let current = null;
  const sitemaps = [];

  for (const line of text.split(/\r?\n/)) {
    const clean = line.replace(/#.*$/, '').trim();
    if (!clean) continue;
    const [rawKey, ...rest] = clean.split(':');
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(':').trim();

    if (key === 'user-agent') {
      if (!current || current.rules.length) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
    } else if (key === 'sitemap') {
      sitemaps.push(value);
    } else if (current && (key === 'allow' || key === 'disallow')) {
      current.rules.push({ type: key, path: value });
    }
  }
  return { groups, sitemaps };
}

/** Does `path` get blocked for the wildcard agent? Longest match wins. */
function isBlocked(groups, path) {
  const group = groups.find((g) => g.agents.includes('*'));
  if (!group) return false;
  let best = null;
  for (const rule of group.rules) {
    if (!rule.path) continue;
    const prefix = rule.path.replace(/\*$/, '');
    if (!path.startsWith(prefix)) continue;
    if (!best || prefix.length > best.prefix.length) best = { prefix, type: rule.type };
  }
  return best?.type === 'disallow';
}

export function run(site) {
  const { config } = site;
  const out = [];
  const push = (page, rule, severity, message, extra = {}) =>
    out.push({ rule, severity, page, message, ...extra });

  const path = join(site.root, config.robots);
  if (!existsSync(path)) {
    push(config.robots, 'robots-missing', 'error', 'No robots.txt');
    return out;
  }

  const text = readFileSync(path, 'utf8');
  const { groups, sitemaps } = parseRobots(text);

  const expectedSitemap = `${config.site}/${config.sitemap}`;
  if (!sitemaps.length) {
    push(config.robots, 'robots-sitemap', 'error',
      `No Sitemap: line — add "Sitemap: ${expectedSitemap}"`, { fixable: true });
  } else {
    for (const s of sitemaps) {
      if (s !== expectedSitemap) {
        push(config.robots, 'robots-sitemap', 'error',
          `Sitemap line points at ${s}, expected ${expectedSitemap}`, { fixable: true });
      }
      const rel = s.replace(/^https?:\/\/[^/]+\//, '');
      if (!existsSync(join(site.root, rel))) {
        push(config.robots, 'robots-sitemap', 'error', `Sitemap line points at ${s}, which does not exist`);
      }
    }
  }

  // The expensive mistake: a page we are asking Google to index is blocked
  // from being fetched.
  for (const page of site.indexable) {
    if (isBlocked(groups, page.route)) {
      push(config.robots, 'robots-blocks-indexable', 'error',
        `robots.txt disallows ${page.route}, but the page is indexable and in the sitemap`);
    }
  }

  // A noindex page that is also disallowed can never have its noindex read —
  // so it can still end up in the index as a bare URL.
  for (const page of site.pages.filter((p) => p.noindex)) {
    if (isBlocked(groups, page.route)) {
      push(config.robots, 'robots-noindex-conflict', 'warn',
        `${page.route} is both noindex and Disallow — Google cannot read the noindex it is being blocked from`);
    }
  }

  const llms = join(site.root, 'llms.txt');
  if (existsSync(llms)) {
    const llmsText = readFileSync(llms, 'utf8');
    if (!/^\s*sitemap:/im.test(llmsText)) {
      push('llms.txt', 'llms-sitemap', 'info',
        `llms.txt has no Sitemap: line — AI crawlers use it the same way search crawlers do`);
    }
  }

  return out;
}
