#!/usr/bin/env node
/* Regenerates the *.min.css files the HTML pages actually load from their
   readable sources. Run after editing theme.css or styles.css:
     node scripts/minify-css.mjs
   Conservative on purpose — it strips comments and collapses whitespace, and
   leaves selectors, values and url() payloads alone. */
import { readFileSync, writeFileSync } from 'node:fs';

const PAIRS = [
  ['theme.css', 'theme.min.css'],
  ['styles.css', 'styles.min.css'],
];

/** Split on top-level url(...) / quoted strings so we never touch their inside. */
function minify(css) {
  // Comments first, on the whole file: they can contain apostrophes and would
  // otherwise be mistaken for quoted strings by the split below.
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const parts = css.split(/(url\((?:[^()]|\\.)*\)|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g);
  return parts
    .map((chunk, i) => {
      if (i % 2 === 1) return chunk; // a url() or a quoted string — verbatim
      return chunk
        .replace(/\s+/g, ' ')
        .replace(/\s*([{}:;,>])\s*/g, '$1')
        .replace(/;}/g, '}');
    })
    .join('')
    .trim();
}

for (const [src, out] of PAIRS) {
  const min = minify(readFileSync(src, 'utf8'));
  writeFileSync(out, min + '\n');
  console.log(`${src} -> ${out} (${min.length} bytes)`);
}
