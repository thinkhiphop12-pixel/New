/**
 * Deploy smoke check. Runs as the last build step so a broken deploy fails
 * here, loudly, instead of 404ing in production.
 *
 * Two things go wrong with this site's layout and both have happened:
 *   1. A page exists at the repo root and is listed in sitemap.xml, but never
 *      reaches out/ — so it 404s once Vercel serves the build output.
 *   2. Source or config leaks into out/ and gets served publicly.
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'out');

const errors = [];

/** A URL path resolves if out/ holds the file, or the directory's index.html. */
function resolves(urlPath) {
  const rel = decodeURIComponent(urlPath.replace(/^\//, ''));
  const target = path.join(OUT, rel);
  if (rel === '' || urlPath.endsWith('/')) return fs.existsSync(path.join(target, 'index.html'));
  if (fs.existsSync(target) && fs.statSync(target).isFile()) return true;
  return fs.existsSync(path.join(target, 'index.html'));
}

// 1. Everything advertised in sitemap.xml must be reachable.
const sitemapPath = path.join(OUT, 'sitemap.xml');
if (!fs.existsSync(sitemapPath)) {
  errors.push('out/sitemap.xml is missing');
} else {
  const xml = fs.readFileSync(sitemapPath, 'utf8');
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  if (!locs.length) errors.push('sitemap.xml lists no URLs');
  for (const loc of locs) {
    const urlPath = loc.replace(/^https?:\/\/[^/]+/, '') || '/';
    if (!resolves(urlPath)) errors.push(`sitemap lists ${urlPath} but out/ has no such page`);
  }
}

// 2. Assets the pages depend on at runtime.
for (const asset of ['shared/consent.js', 'shared/ads.js', 'gaffa/data/gamedata.json', 'robots.txt']) {
  if (!fs.existsSync(path.join(OUT, asset))) errors.push(`missing required asset out/${asset}`);
}

// 3. Nothing source-shaped may ship.
const LEAKS = [
  'package.json', 'tsconfig.json', 'next.config.ts', 'next-env.d.ts', 'vercel.json',
  'CLAUDE.md', 'src', 'scripts', 'node_modules',
];
for (const leak of LEAKS) {
  if (fs.existsSync(path.join(OUT, leak))) errors.push(`out/${leak} would be served publicly`);
}
for (const f of fs.readdirSync(OUT)) {
  if (['.ts', '.tsx', '.sh'].includes(path.extname(f))) errors.push(`out/${f} is source and would be served`);
}

if (errors.length) {
  console.error('\nDeploy check FAILED:');
  for (const e of errors) console.error(`  - ${e}`);
  console.error('\nout/ is what Vercel serves. Fix scripts/postbuild.js or sitemap.xml.\n');
  process.exit(1);
}

console.log('Deploy check passed — sitemap reachable, no source in out/.');
