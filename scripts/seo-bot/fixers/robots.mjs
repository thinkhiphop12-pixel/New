/* robots.mjs — corrects the Sitemap: declaration in robots.txt.

   Only the sitemap line. Allow/Disallow rules encode intent the bot cannot
   infer, and a wrong guess there de-indexes pages, so they are left alone.
*/

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const id = 'robots';

export function fix(site, { dryRun = false } = {}) {
  const { config } = site;
  const path = join(site.root, config.robots);
  if (!existsSync(path)) return [];

  const before = readFileSync(path, 'utf8');
  const wanted = `Sitemap: ${config.site}/${config.sitemap}`;
  let after = before;

  if (/^\s*sitemap:/im.test(before)) {
    after = before.replace(/^[ \t]*sitemap:.*$/gim, wanted);
    // Collapse the duplicates that leaves behind if there were several.
    const lines = after.split(/\r?\n/);
    let seen = false;
    after = lines.filter((l) => {
      if (l.trim() !== wanted) return true;
      if (seen) return false;
      seen = true;
      return true;
    }).join('\n');
  } else {
    after = `${before.replace(/\s*$/, '')}\n\n${wanted}\n`;
  }

  if (after === before) return [];
  if (!dryRun) writeFileSync(path, after, 'utf8');
  return [{ file: config.robots, message: `robots.txt: sitemap declaration set to ${config.site}/${config.sitemap}` }];
}
