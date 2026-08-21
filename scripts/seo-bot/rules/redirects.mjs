/* redirects.mjs — checks the vercel.json redirect table.

   Retired URLs are where a site's oldest inbound links point, so a redirect
   that silently fails to match throws that link equity away and serves a 404
   to real visitors. This rule exists because exactly that had happened here:
   `/scout/:path*` does not match the bare directory form `/scout/`, so every
   trailing-slash link to a retired game 404'd while the un-slashed form
   redirected fine.

   The matcher below is deliberately stricter than the one in lib/site.mjs.
   That one tolerates a trailing slash so internal link checking stays
   readable; this one mirrors what Vercel actually does, which is the whole
   point of the check.
*/

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const id = 'redirects';
export const describe = 'vercel.json redirect coverage, chains and destinations';

/** Compile a Vercel source pattern the way Vercel matches it: exactly. */
function compile(source) {
  const pattern = source
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/:path\*/g, '(?:(.*))')
    .replace(/:[a-zA-Z]+/g, '([^/]+)');
  return new RegExp(`^${pattern}$`);
}

const matches = (rules, path) => rules.find((r) => r.re.test(path));

export function run(site) {
  const out = [];
  const file = 'vercel.json';
  const push = (rule, severity, message, extra = {}) =>
    out.push({ rule, severity, page: file, message, ...extra });

  const path = join(site.root, file);
  if (!existsSync(path)) return out;

  let raw;
  try {
    raw = JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    push('redirect-config', 'error', `vercel.json does not parse: ${err.message}`);
    return out;
  }

  const redirects = (raw.redirects ?? []).map((r) => ({ ...r, re: compile(r.source) }));
  if (!redirects.length) return out;

  const seen = new Set();

  for (const r of redirects) {
    if (seen.has(r.source)) {
      push('redirect-duplicate', 'warn', `${r.source} is declared twice — the first one wins`);
    }
    seen.add(r.source);

    if (r.permanent === false) {
      push('redirect-temporary', 'warn',
        `${r.source} is a temporary redirect — a retired URL should be permanent so its ranking transfers`);
    }

    /* A ":path*" source does not match the bare directory form, so
       /scout/ 404s while /scout redirects. Both forms get linked and indexed. */
    if (r.source.endsWith('/:path*')) {
      const base = r.source.slice(0, -'/:path*'.length);
      for (const variant of [base, `${base}/`]) {
        if (!matches(redirects, variant)) {
          push('redirect-trailing-slash', 'error',
            `${variant} is not covered by any redirect — "${r.source}" does not match it, so the URL 404s`,
            { hint: `Add { "source": "${variant}", "destination": "${r.destination}", "permanent": true }` });
        }
      }
    }

    /* A destination referencing :path* when the source does not capture it
       leaves the literal token in the URL. */
    if (/:[a-zA-Z]+\*?/.test(r.destination)) {
      const tokens = r.destination.match(/:[a-zA-Z]+\*?/g) ?? [];
      for (const token of tokens) {
        if (!r.source.includes(token)) {
          push('redirect-token', 'error',
            `${r.source} -> ${r.destination} references "${token}", which the source does not capture`);
        }
      }
    }

    /* Chains cost a hop and dilute the signal; crawlers give up after a few. */
    const next = matches(redirects, r.destination.replace(/:[a-zA-Z]+\*?/g, ''));
    if (next && next.source !== r.source) {
      push('redirect-chain', 'warn',
        `${r.source} -> ${r.destination}, which is itself redirected by "${next.source}" — point it at the final URL`);
    }

    /* The destination must actually exist. */
    const dest = r.destination.replace(/:[a-zA-Z]+\*?/g, '');
    if (dest.startsWith('/') && !next) {
      const resolved = site.resolveLink(dest, { html: '', file });
      if (resolved.kind === 'missing') {
        push('redirect-destination', 'error',
          `${r.source} redirects to ${r.destination}, which does not exist`);
      }
    }
  }

  /* A redirect source that is also a real page means the page is unreachable. */
  for (const page of site.pages) {
    const hit = matches(redirects, page.route);
    if (hit) {
      push('redirect-shadow', 'error',
        `${page.route} is served by ${page.file} but "${hit.source}" redirects it away — the page is unreachable`);
    }
  }

  return out;
}
