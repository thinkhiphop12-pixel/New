/* head.mjs — the tags a result listing is actually built from.

   Lengths are measured on decoded text: "&amp;" is one character in a SERP,
   five in the source, and counting the source form would flag pages that
   render fine.
*/

import * as H from '../lib/html.mjs';

export const id = 'head';
export const describe = 'Title, description, canonical and the document basics';

export function run(site) {
  const { config } = site;
  const out = [];
  const push = (page, rule, severity, message, extra = {}) =>
    out.push({ rule, severity, page, message, ...extra });

  const titles = new Map();
  const descriptions = new Map();

  for (const page of site.audited) {
    const { file, html } = page;

    /* ── document basics ── */
    if (!/<meta\s+charset/i.test(H.headHtml(html))) {
      push(file, 'charset', 'error', 'No <meta charset> in <head>');
    }
    const lang = H.htmlLang(html);
    if (!lang) push(file, 'html-lang', 'error', 'No lang attribute on <html>');

    if (!H.metaName(html, 'viewport')) {
      push(file, 'viewport', 'error', 'No viewport meta tag — the page will not be treated as mobile-friendly');
    }

    /* ── title ── */
    const title = page.title;
    if (!title) {
      push(file, 'title-missing', 'error', 'No <title>');
    } else {
      const n = [...title].length;
      if (n > config.title.max) {
        push(file, 'title-length', 'warn',
          `Title is ${n} chars — Google truncates around ${config.title.max}`,
          { hint: `"${title}"` });
      } else if (n < config.title.min) {
        push(file, 'title-length', 'warn',
          `Title is only ${n} chars — room for more of the target keyword`,
          { hint: `"${title}"` });
      }
      if (!title.includes(config.title.brand.replace('| ', ''))) {
        push(file, 'title-brand', 'info', `Title does not carry the "${config.title.brand}" suffix`);
      }
      const seen = titles.get(title);
      if (seen) {
        push(file, 'title-duplicate', 'error',
          `Title is identical to ${seen} — the two pages compete for the same result`);
      } else {
        titles.set(title, file);
      }
    }

    /* ── description ── */
    const desc = page.description;
    if (!desc) {
      push(file, 'description-missing', 'error',
        'No meta description — Google will write its own snippet');
    } else {
      const n = [...desc].length;
      if (n > config.description.max) {
        push(file, 'description-length', 'warn',
          `Description is ${n} chars — truncated past ~${config.description.max}`);
      } else if (n < config.description.min) {
        push(file, 'description-length', 'warn',
          `Description is only ${n} chars — short of the ~${config.description.min}+ that fills a snippet`);
      }
      const seen = descriptions.get(desc);
      if (seen) {
        push(file, 'description-duplicate', 'error', `Description is identical to ${seen}`);
      } else {
        descriptions.set(desc, file);
      }
    }

    /* ── canonical ── */
    const canonical = page.canonical;
    if (!canonical) {
      push(file, 'canonical-missing', 'error', 'No rel=canonical', { fixable: true });
    } else {
      if (!/^https?:\/\//i.test(canonical)) {
        push(file, 'canonical-relative', 'error',
          `Canonical is relative ("${canonical}") — it must be an absolute URL`, { fixable: true });
      } else if (canonical !== page.url) {
        push(file, 'canonical-mismatch', 'error',
          `Canonical points at ${canonical}, expected ${page.url}`, { fixable: true });
      }
      if (/^http:\/\//i.test(canonical)) {
        push(file, 'canonical-scheme', 'error', 'Canonical uses http:// — must be https://', { fixable: true });
      }
    }

    /* ── indexability ── */
    const directives = H.robotsDirectives(html);
    if (directives.has('nofollow')) {
      push(file, 'meta-robots', 'warn', 'Page is meta nofollow — internal links from it pass no signal');
    }
  }

  return out;
}
