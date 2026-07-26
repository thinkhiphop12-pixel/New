const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Ensure out directory exists
if (!fs.existsSync('out')) fs.mkdirSync('out', { recursive: true });

// Copy shared and assets
console.log('Copying shared files...');
execSync('cp -r src/shared out/shared 2>/dev/null || true');
execSync('cp -r src/assets out/assets 2>/dev/null || true');
execSync('cp -r src/public/* out/ 2>/dev/null || true');

// Copy static HTML files (these will overwrite the Next.js generated ones)
console.log('Copying static HTML files...');
const staticFiles = [
  'index.html',
  'best-football-manager-games-pc.html',
  'best-football-manager-games-android.html',
  'best-football-manager-games-iphone.html',
  'terms.html',
  'privacy.html',
  'about.html',
  'robots.txt',
  'sitemap.xml',
  'llms.txt'
];

staticFiles.forEach(file => {
  const src = path.join(process.cwd(), file);
  const dest = path.join(process.cwd(), 'out', file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`  Copied ${file}`);
  }
});

// Copy directories
console.log('Copying directories...');
const dirs = ['perfect-cup', 'football-manager'];
dirs.forEach(dir => {
  const src = path.join(process.cwd(), dir);
  const dest = path.join(process.cwd(), 'out', dir);
  if (fs.existsSync(src)) {
    execSync(`cp -r ${src} ${dest} 2>/dev/null || true`);
    console.log(`  Copied ${dir}/`);
  }
});

console.log('Postbuild complete.');
