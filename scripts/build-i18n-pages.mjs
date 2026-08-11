#!/usr/bin/env node
/**
 * Generates the localised landing pages (/zh/, /hi/, /es/, /fr/, /ar/) from the
 * English `index.html`, which stays the single source of truth for layout, CSS,
 * ad slots and scripts.
 *
 *   npm run build:i18n
 *
 * Every translation key must still be present in index.html — if the English
 * page is edited and a key no longer matches, the build fails loudly instead of
 * silently shipping a half-translated page.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LOCALES } from './i18n-strings.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://ballknw.com';

const RTL_CSS = `
/* ── RTL OVERRIDES ── */
[dir="rtl"] .board-left{border-right:0;border-left:1px solid var(--border)}
[dir="rtl"] .fx .k{text-align:right}
[dir="rtl"] .fx-go{margin-left:0;margin-right:auto;transform:scaleX(-1)}
[dir="rtl"] .langmenu{right:auto;left:0}
[dir="rtl"] .col-ad-rail{right:auto;left:calc(50% - 540px - 180px)}
/* the shared consent banner is served in English — keep it reading left-to-right */
[dir="rtl"] #consentBanner{direction:ltr;text-align:left}
/* the footer links point at English pages: isolate them so their own
   punctuation ("What is a gaffer?") doesn't get reordered by the RTL run */
[dir="rtl"] .foot-meta a{unicode-bidi:isolate;direction:ltr}
@media(max-width:720px){
  [dir="rtl"] .board-left{border-left:0;border-bottom:1px solid var(--border)}
}
`;

/** Literal replace-all, with an assertion that the needle was actually there. */
function must(html, needle, replacement, label) {
  if (!html.includes(needle)) {
    throw new Error(`[${label}] not found in index.html: ${JSON.stringify(needle.slice(0, 90))}`);
  }
  return html.split(needle).join(replacement);
}

function localise(source, locale) {
  const { code, htmlLang, hreflang, dir, path, ogLocale, short, changeLanguage, gameNote } = locale;
  const url = `${SITE}${path}`;
  let html = source;

  // Document language / direction
  html = must(
    html,
    '<html lang="en">',
    `<html lang="${htmlLang}"${dir === 'rtl' ? ' dir="rtl"' : ''}>`,
    code
  );

  // Generated-file banner
  html = must(
    html,
    '<!DOCTYPE html>',
    '<!DOCTYPE html>\n<!-- GENERATED FILE — do not edit by hand.\n     Source: /index.html + scripts/i18n-strings.mjs · Rebuild: npm run build:i18n -->',
    code
  );

  // Canonical + Open Graph pointers for this locale
  html = must(
    html,
    '<link rel="canonical" href="https://ballknw.com/" />',
    `<link rel="canonical" href="${url}" />`,
    code
  );
  html = must(
    html,
    '<meta property="og:url" content="https://ballknw.com/" />',
    `<meta property="og:url" content="${url}" />`,
    code
  );
  html = must(
    html,
    '<meta property="og:locale" content="en_GB" />\n<meta property="og:locale:alternate" content="en_US" />',
    `<meta property="og:locale" content="${ogLocale}" />\n<meta property="og:locale:alternate" content="en_GB" />`,
    code
  );

  // Language picker: move the "current" marker onto this locale
  html = must(
    html,
    '<a class="is-cur" aria-current="page" href="/" hreflang="en" lang="en">English</a>',
    '<a href="/" hreflang="en" lang="en">English</a>',
    code
  );
  html = must(
    html,
    `<a href="${path}" hreflang="${hreflang}"`,
    `<a class="is-cur" aria-current="page" href="${path}" hreflang="${hreflang}"`,
    code
  );
  html = must(html, '<span class="lang-cur">EN</span>', `<span class="lang-cur">${short}</span>`, code);
  html = must(
    html,
    'aria-label="Change language" title="Change language"',
    `aria-label="${changeLanguage}" title="${changeLanguage}"`,
    code
  );

  // The embedded game itself is English — say so rather than let it surprise people.
  html = must(
    html,
    '    <div class="embed-actions">',
    `    <p class="subline" style="text-align:center;margin-top:10px">${gameNote}</p>\n    <div class="embed-actions">`,
    code
  );

  if (dir === 'rtl') {
    html = must(html, '</style>', `${RTL_CSS}</style>`, code);
  }

  // Copy translations. Longest keys first so a short key can never eat a longer
  // one's surrounding markup.
  const entries = Object.entries(locale.strings).sort((a, b) => b[0].length - a[0].length);
  for (const [en, translated] of entries) {
    html = must(html, en, translated, `${code} strings`);
  }

  return html;
}

const source = await readFile(join(ROOT, 'index.html'), 'utf8');

for (const locale of LOCALES) {
  const out = join(ROOT, locale.code, 'index.html');
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, localise(source, locale), 'utf8');
  console.log(`built ${locale.path}index.html (${locale.htmlLang})`);
}

console.log(`\n${LOCALES.length} localised pages generated from index.html`);
