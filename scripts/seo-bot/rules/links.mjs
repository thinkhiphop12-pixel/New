/* links.mjs — the internal link graph.

   Two things matter here. Broken links waste crawl budget and strand readers.
   Orphans — pages in the sitemap with no internal link pointing at them — get
   crawled rarely and rank badly, because internal links are how authority
   moves around a site. Both are invisible without a whole-site view, which is
   why they belong in a bot rather than a page-level check.
*/

export const id = 'links';
export const describe = 'Broken internal links, redirect hops and orphan pages';

// Anchor text that tells a crawler nothing about the destination.
const GENERIC_ANCHORS = new Set([
  'click here', 'here', 'read more', 'more', 'link', 'this', 'this page', 'learn more',
]);

export function run(site) {
  const out = [];
  const push = (page, rule, severity, message, extra = {}) =>
    out.push({ rule, severity, page, message, ...extra });

  /** route -> number of distinct pages linking to it */
  const inbound = new Map();
  const noteInbound = (route, fromFile) => {
    if (!inbound.has(route)) inbound.set(route, new Set());
    inbound.get(route).add(fromFile);
  };

  for (const page of site.audited) {
    const { file } = page;
    const seenHrefs = new Set();

    for (const link of page.links) {
      const r = site.resolveLink(link.href, page);

      switch (r.kind) {
        case 'missing':
          push(file, 'link-broken', 'error',
            `Link to ${r.path} — no such page or file`,
            { hint: link.text ? `anchor text: "${link.text}"` : undefined });
          break;

        case 'missing-anchor':
          push(file, 'link-anchor', 'warn',
            `Link to #${r.id}${r.page ? ` on ${r.page}` : ''} — no element with that id`);
          break;

        case 'malformed':
          push(file, 'link-malformed', 'error', `Link href is not a valid URL: "${link.href}"`);
          break;

        case 'redirect':
          push(file, 'link-redirect', 'warn',
            `Link to ${r.source} redirects to ${r.to} — link straight to the destination`);
          noteInbound(r.to, file);
          break;

        case 'ok':
          if (r.absolute) {
            push(file, 'link-absolute', 'info',
              `Link to ${link.href} uses the full domain — root-relative survives domain changes`);
          }
          if (r.protocol === 'http:') {
            push(file, 'link-insecure', 'error', `Internal link uses http://: ${link.href}`);
          }
          if (r.relative) {
            push(file, 'link-relative', 'info',
              `Link "${link.href}" is page-relative — root-relative is safer`);
          }
          if (r.noindex) {
            push(file, 'link-noindex', 'info', `Links to ${r.route}, which is noindex`);
          }
          noteInbound(r.route, file);

          if (link.text && GENERIC_ANCHORS.has(link.text.toLowerCase())) {
            push(file, 'anchor-text', 'warn',
              `Anchor text "${link.text}" to ${r.route} describes nothing — use the target's topic`);
          }
          if (!link.text && !link.ariaLabel && !/<img/i.test(link.href)) {
            push(file, 'anchor-empty', 'warn', `Link to ${r.route} has no text and no aria-label`);
          }
          break;

        case 'asset':
          break;

        case 'external':
          if (r.url && link.target === '_blank' && !link.rel.includes('noopener')) {
            push(file, 'link-noopener', 'warn',
              `External link opens in a new tab without rel="noopener": ${r.url}`);
          }
          break;

        default:
          break;
      }

      // A page linking to the same target many times passes no extra signal
      // and usually means duplicated boilerplate.
      const key = link.href.split('#')[0];
      if (key && key !== '/' && seenHrefs.has(key) && r.kind === 'ok') {
        // Only report once per target.
        if (!seenHrefs.has(`__reported:${key}`)) {
          seenHrefs.add(`__reported:${key}`);
        }
      }
      seenHrefs.add(key);
    }

    // Self-canonical pages should not link to themselves in body copy.
    const selfLinks = page.links.filter((l) => {
      const r = site.resolveLink(l.href, page);
      return r.kind === 'ok' && r.route === page.route && !l.href.startsWith('#');
    });
    if (selfLinks.length) {
      push(file, 'link-self', 'info', `Links to itself (${selfLinks.length}×)`);
    }
  }

  /* ── orphans ── */
  for (const page of site.indexable) {
    if (page.route === '/') continue; // the home page is reached directly
    const sources = inbound.get(page.route);
    const external = sources ? [...sources].filter((f) => f !== page.file) : [];
    if (external.length === 0) {
      push(page.file, 'orphan', 'warn',
        'No internal links point at this page — it will be crawled rarely and rank poorly',
        { hint: 'Link it from football-guides.html or a related explainer' });
    } else if (external.length === 1) {
      push(page.file, 'thin-inbound', 'info',
        `Only one internal link points here (from ${external[0]})`);
    }
  }

  return out;
}
