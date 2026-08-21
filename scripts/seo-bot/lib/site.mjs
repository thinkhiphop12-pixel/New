/* site.mjs — loads the site into memory once and answers questions about it.

   Route resolution mirrors what Vercel serves: the redirect table from
   vercel.json is applied before the filesystem is consulted, so a link to a
   retired game reports as a redirect rather than a 404, and links that would
   land on a redirect are still flagged (they cost a hop).
*/

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';

import { config as baseConfig, ROOT } from '../config.mjs';
import * as H from './html.mjs';

/* ── redirects ── */

function loadRedirects(root) {
  const file = join(root, 'vercel.json');
  if (!existsSync(file)) return [];
  try {
    const { redirects = [] } = JSON.parse(readFileSync(file, 'utf8'));
    return redirects.map((r) => {
      // Vercel's :path* wildcard, translated to a regex with one capture.
      const pattern = r.source
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\\\*/g, '*')
        .replace(/:path\*/g, '(.*)')
        .replace(/:[a-zA-Z]+/g, '([^/]+)');
      return {
        source: r.source,
        destination: r.destination,
        permanent: r.permanent !== false,
        re: new RegExp(`^${pattern}/?$`),
      };
    });
  } catch {
    return [];
  }
}

/* ── pages ── */

function rootHtmlFiles(root) {
  return readdirSync(root)
    .filter((f) => f.endsWith('.html'))
    .filter((f) => statSync(join(root, f)).isFile())
    .sort();
}

/** Last commit date for a file, as YYYY-MM-DD. Falls back to mtime. */
function gitLastModified(root, file) {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cs', '--', file], {
      cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(out)) return out;
  } catch { /* not a git checkout, or the file was never committed */ }
  return new Date(statSync(join(root, file)).mtime).toISOString().slice(0, 10);
}

/**
 * Load a site into memory.
 *
 * `root` and `config` are injectable so the test suite can point the whole bot
 * at a fixture directory instead of the real repo.
 */
export function loadSite({ root = ROOT, config = baseConfig } = {}) {
  const redirects = loadRedirects(root);
  const files = rootHtmlFiles(root);

  const pages = files.map((file) => {
    const html = readFileSync(join(root, file), 'utf8');
    const directives = H.robotsDirectives(html);
    const isIndex = file === 'index.html';
    return {
      file,
      html,
      route: isIndex ? '/' : `/${file}`,
      url: isIndex ? `${config.site}/` : `${config.site}/${file}`,
      noindex: directives.has('noindex'),
      ignored: config.ignorePages.includes(file),
      lastmod: gitLastModified(root, file),
      // Lazily-computed views, memoised on first access.
      get title() { return (this._t ??= H.title(html)); },
      get description() { return (this._d ??= H.metaName(html, 'description')); },
      get canonical() { return (this._c ??= H.canonical(html)); },
      get headings() { return (this._h ??= H.headings(html)); },
      get links() { return (this._l ??= H.links(html)); },
      get images() { return (this._i ??= H.images(html)); },
      get jsonLd() { return (this._j ??= H.jsonLd(html)); },
      get words() { return (this._w ??= H.wordCount(html)); },
    };
  });

  /** Pages the bot audits: everything except explicit ignores. */
  const audited = pages.filter((p) => !p.ignored);
  /** Pages that should be indexed — the set the sitemap must match. */
  const indexable = audited.filter((p) => !p.noindex);

  const byRoute = new Map(pages.map((p) => [p.route, p]));

  /* ── link resolution ── */

  const assetExists = (path) => {
    const rel = path.replace(/^\//, '');
    if (!rel) return false;
    const abs = resolve(root, rel);
    // Never escape the repo.
    if (!abs.startsWith(resolve(root))) return false;
    if (!existsSync(abs)) return false;
    return statSync(abs).isFile() || existsSync(join(abs, 'index.html'));
  };

  /** Classify an href found on `fromPage`. */
  function resolveLink(href, fromPage) {
    const raw = href.trim();
    if (!raw || raw === '#') return { kind: 'empty' };
    if (/^(mailto:|tel:|javascript:|data:)/i.test(raw)) return { kind: 'external' };

    if (/^https?:\/\//i.test(raw)) {
      let u;
      try { u = new URL(raw); } catch { return { kind: 'malformed' }; }
      const host = u.hostname.replace(/^www\./, '');
      if (host !== 'ballknw.com') return { kind: 'external', url: raw };
      // An absolute link to our own site — should be a root-relative path.
      return { ...resolvePath(u.pathname + u.hash, fromPage), absolute: true, protocol: u.protocol };
    }

    if (raw.startsWith('//')) return { kind: 'external', url: raw };
    if (raw.startsWith('#')) return resolveAnchor(raw.slice(1), fromPage);
    if (!raw.startsWith('/')) return resolvePath(`/${raw}`, fromPage, true);
    return resolvePath(raw, fromPage);
  }

  function resolveAnchor(id, page) {
    if (!id) return { kind: 'empty' };
    const found = new RegExp(`\\bid\\s*=\\s*["']${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`).test(page.html)
      || new RegExp(`\\bname\\s*=\\s*["']${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`).test(page.html);
    return found ? { kind: 'anchor', id } : { kind: 'missing-anchor', id };
  }

  function resolvePath(pathAndHash, fromPage, relative = false) {
    const [path, hash] = pathAndHash.split('#');

    for (const r of redirects) {
      const m = r.re.exec(path);
      if (m) return { kind: 'redirect', to: r.destination, permanent: r.permanent, source: r.source };
    }

    if (config.virtualRoutes.includes(path)) return { kind: 'ok', route: path, virtual: true };

    const target = byRoute.get(path) || byRoute.get(path.replace(/\/$/, ''));
    if (target) {
      if (hash) {
        const a = resolveAnchor(hash, target);
        if (a.kind === 'missing-anchor') return { kind: 'missing-anchor', id: hash, page: target.file };
      }
      return { kind: 'ok', route: path, page: target, relative, noindex: target.noindex };
    }

    if (assetExists(path)) return { kind: 'asset', path, relative };
    return { kind: 'missing', path };
  }

  return {
    root,
    config,
    redirects,
    pages,
    audited,
    indexable,
    byRoute,
    resolveLink,
    gitLastModified: (file) => gitLastModified(root, file),
  };
}

export default loadSite;
