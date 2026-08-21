/* head.mjs — repairs the head tags whose correct value is unambiguous.

   The rule for what belongs here: the fixer may only write a value that is
   derivable from the page's own location. A canonical URL is; a title or a
   meta description is not — those need an editor, so the bot reports them and
   stops. Nothing here rewrites human copy.
*/

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import * as H from '../lib/html.mjs';

export const id = 'head';

const CANONICAL_RE = /<link\b[^>]*\brel\s*=\s*["']canonical["'][^>]*>/i;

export function fix(site, { dryRun = false } = {}) {
  const applied = [];

  for (const page of site.audited) {
    const path = join(site.root, page.file);
    let html = readFileSync(path, 'utf8');
    const original = html;
    const changes = [];

    /* ── canonical ── */
    const canonical = H.canonical(html);
    const wanted = page.url;

    if (!canonical) {
      const tag = `  <link rel="canonical" href="${wanted}" />`;
      // Sit it just after the description, where the other pages keep it.
      const descRe = /([ \t]*<meta\s+name=["']description["'][^>]*>\n)/i;
      if (descRe.test(html)) {
        html = html.replace(descRe, `$1${tag}\n`);
      } else if (/<\/head>/i.test(html)) {
        html = html.replace(/([ \t]*)<\/head>/i, `${tag}\n$1</head>`);
      }
      if (html !== original) changes.push(`added canonical ${wanted}`);
    } else if (canonical !== wanted) {
      html = html.replace(CANONICAL_RE, `<link rel="canonical" href="${wanted}" />`);
      changes.push(`canonical ${canonical} -> ${wanted}`);
    }

    /* ── og:url follows the canonical ── */
    const ogUrl = H.metaProperty(html, 'og:url');
    if (ogUrl && ogUrl !== wanted) {
      html = html.replace(
        /(<meta\s+property=["']og:url["']\s+content=["'])([^"']*)(["'])/i,
        `$1${wanted}$3`,
      );
      changes.push(`og:url ${ogUrl} -> ${wanted}`);
    }

    /* ── absolute-ise a relative og:image / twitter:image ── */
    for (const [attr, key] of [['property', 'og:image'], ['name', 'twitter:image']]) {
      const re = new RegExp(`(<meta\\s+${attr}=["']${key}["']\\s+content=["'])([^"']*)(["'])`, 'i');
      const m = re.exec(html);
      if (!m) continue;
      const value = m[2].trim();
      if (!value || /^https?:\/\//i.test(value)) continue;
      const path = value.startsWith('/') ? value : `/${value}`;
      // Only rewrite if the file is really there — otherwise the relative URL
      // is a symptom of a different problem and a human should look.
      if (site.resolveLink(path, page).kind === 'missing') continue;
      html = html.replace(re, `$1${site.config.site}${path}$3`);
      changes.push(`${key} ${value} -> ${site.config.site}${path}`);
    }

    /* ── Article schema url follows the canonical ── */
    html = html.replace(
      /(<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>)([\s\S]*?)(<\/script>)/gi,
      (match, open, body, close) => {
        let parsed;
        try { parsed = JSON.parse(body); } catch { return match; }
        let touched = false;
        for (const node of H.ldNodes(parsed)) {
          const types = Array.isArray(node['@type']) ? node['@type'] : [node['@type']];
          const isArticle = types.some((t) => /Article|BlogPosting|NewsArticle/.test(String(t)));
          if (isArticle && node.url && node.url !== wanted) {
            changes.push(`schema url ${node.url} -> ${wanted}`);
            node.url = wanted;
            touched = true;
          }
        }
        if (!touched) return match;
        // Re-serialise with the two-space indent the generator emits.
        return `${open}\n${JSON.stringify(parsed, null, 2)}\n${close}`;
      },
    );

    if (html !== original) {
      if (!dryRun) writeFileSync(path, html, 'utf8');
      applied.push({ file: page.file, message: `${page.file}: ${changes.join('; ')}` });
    }
  }

  return applied;
}
