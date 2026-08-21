/* social.mjs — Open Graph and Twitter cards.

   These do not rank the page, but they decide what a shared link looks like,
   and a link that renders as a bare URL gets clicked far less. og:url drifting
   from the canonical is the failure that matters most: it tells crawlers two
   different things about the same page.
*/

import * as H from '../lib/html.mjs';

export const id = 'social';
export const describe = 'Open Graph and Twitter card tags';

const OG_REQUIRED = ['og:title', 'og:description', 'og:url', 'og:image', 'og:type'];
const TW_REQUIRED = ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image'];

export function run(site) {
  const out = [];
  const push = (page, rule, severity, message, extra = {}) =>
    out.push({ rule, severity, page, message, ...extra });

  for (const page of site.audited) {
    const { file, html } = page;

    for (const prop of OG_REQUIRED) {
      if (!H.metaProperty(html, prop)) {
        push(file, 'og-missing', 'warn', `Missing ${prop}`, { fixable: prop === 'og:url' });
      }
    }
    for (const name of TW_REQUIRED) {
      if (!H.metaName(html, name)) push(file, 'twitter-missing', 'warn', `Missing ${name}`);
    }

    const ogUrl = H.metaProperty(html, 'og:url');
    if (ogUrl && page.canonical && ogUrl !== page.canonical) {
      push(file, 'og-url-mismatch', 'error',
        `og:url (${ogUrl}) disagrees with the canonical (${page.canonical})`, { fixable: true });
    }

    const ogImage = H.metaProperty(html, 'og:image');
    if (ogImage) {
      if (!/^https?:\/\//i.test(ogImage)) {
        push(file, 'og-image-relative', 'error',
          'og:image must be an absolute URL — most scrapers will not resolve a relative one',
          { fixable: true });
      } else if (ogImage.startsWith(`${site.config.site}/`)) {
        const rel = ogImage.slice(site.config.site.length);
        const resolved = site.resolveLink(rel, page);
        if (resolved.kind === 'missing') {
          push(file, 'og-image-missing', 'error', `og:image points at ${rel}, which does not exist`);
        }
      }
    }

    const card = H.metaName(html, 'twitter:card');
    if (card && !['summary', 'summary_large_image', 'app', 'player'].includes(card)) {
      push(file, 'twitter-card', 'warn', `twitter:card is "${card}", which is not a valid card type`);
    }

    // og:title mirroring the <title> verbatim wastes the brand suffix that a
    // social preview does not need; not an error, worth knowing.
    const ogTitle = H.metaProperty(html, 'og:title');
    if (ogTitle && page.title && ogTitle === page.title && page.title.includes('| BALLKNW')) {
      push(file, 'og-title-brand', 'info',
        'og:title repeats the "| BALLKNW" suffix — social previews already show the site name');
    }
  }

  return out;
}
