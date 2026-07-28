/**
 * Assemble the deployable site in `out/`.
 *
 * `next build` exports the root app into `out/`. This step overlays the
 * hand-written static site that lives at the repo root (index.html, the guide
 * pages, /scout, /perfect-cup, /gaffa, shared scripts and assets) on top of it.
 *
 * It works by DENYLIST, not by a hand-maintained list of files to include.
 * The old allowlist had silently gone stale — /scout, /scout-guide.html and
 * /draft-xi-guide.html are all in sitemap.xml but were never copied, so they
 * only worked because Vercel was serving the repo root directly instead of
 * this directory. Anything committed at the root that isn't source or config
 * now ships automatically, and a new page needs no change here.
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'out');

/** Never ship these: build plumbing, source, tooling and agent scratch files. */
const EXCLUDE_DIRS = new Set([
  'out', 'node_modules', '.git', '.next', '.vercel',
  'src',        // source — the built output is what ships
  'scripts',    // build tooling
  '.bolt', '.claude', '.github',
]);

const EXCLUDE_FILES = new Set([
  'package.json', 'package-lock.json', 'tsconfig.json',
  'next.config.ts', 'next-env.d.ts',
  'postcss.config.cjs', 'tailwind.config.cjs',
  'vercel.json',
  'CLAUDE.md', 'goal.md', '.checkpoint.md', '.running.lock', 'usage_limit_hit.md',
  '.gitignore', '.gitattributes', '.gitconfig', '.mcp.json',
]);

const EXCLUDE_EXT = new Set(['.sh', '.ts', '.tsx', '.map']);

function shipFile(name) {
  if (EXCLUDE_FILES.has(name)) return false;
  if (EXCLUDE_EXT.has(path.extname(name))) return false;
  return true;
}

let copied = 0;

function copyTree(srcDir, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const from = path.join(srcDir, entry.name);
    const to = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyTree(from, to);
    } else if (entry.isFile()) {
      fs.copyFileSync(from, to);
      copied++;
    }
  }
}

fs.mkdirSync(OUT, { recursive: true });

console.log('Overlaying static site onto out/ ...');
for (const entry of fs.readdirSync(ROOT, { withFileTypes: true })) {
  const { name } = entry;
  if (entry.isDirectory()) {
    if (EXCLUDE_DIRS.has(name)) continue;
    copyTree(path.join(ROOT, name), path.join(OUT, name));
    console.log(`  dir  ${name}/`);
  } else if (entry.isFile() && shipFile(name)) {
    fs.copyFileSync(path.join(ROOT, name), path.join(OUT, name));
    copied++;
    console.log(`  file ${name}`);
  }
}

// src/shared and src/assets are the editable copies of the root-level ones and
// must win, so they are overlaid last. src/public is a plain passthrough.
for (const [from, to] of [
  [path.join(ROOT, 'src', 'shared'), path.join(OUT, 'shared')],
  [path.join(ROOT, 'src', 'assets'), path.join(OUT, 'assets')],
  [path.join(ROOT, 'src', 'public'), OUT],
]) {
  if (fs.existsSync(from)) {
    copyTree(from, to);
    console.log(`  overlay ${path.relative(ROOT, from)} -> ${path.relative(ROOT, to) || '.'}`);
  }
}

console.log(`Postbuild complete — ${copied} files in out/.`);
