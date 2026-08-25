#!/usr/bin/env node
/* One-off corpus pass: removes em-dashes and separator en-dashes from the
   static pages by restructuring the sentence, not by swapping in a hyphen.

   Rules are ordered; the first match wins. Anything the rules cannot classify
   confidently is left alone and reported, so it can be handled by hand.

   Usage: node scripts/dedash.mjs [--write] [file...]     */
import { readFileSync, writeFileSync } from 'node:fs';

const WRITE = process.argv.includes('--write');
const files = process.argv.slice(2).filter(a => !a.startsWith('--'));

const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

// First word of the segment following the dash, ignoring inline markup.
const firstWord = seg => (seg.replace(/^\s*(<[^>]+>\s*)*/, '').match(/^[A-Za-z'’]+/) || [''])[0].toLowerCase();

const CONJ  = new Set(['and','but','or','so','yet','nor']);
const PRON  = new Set(['it','they','he','she','you','we','i','that','this','there','these','those']);
// Finite verbs that signal the following segment is its own clause.
const VERB  = /^(is|are|was|were|has|have|had|does|do|did|can|could|will|would|should|might|must|means|comes|gets|goes|makes|takes|works|plays|sits|stays|keeps|becomes|costs|needs|wants|lets|gives|holds|runs|starts|ends)\b/;

let unresolved = [];

function fixSegment(text, file) {
  // 1. En-dash used as a range separator between numbers -> hyphen.
  text = text.replace(/(\d)\s*–\s*(\d)/g, '$1-$2');
  // Any other stray en-dash used as a separator behaves like an em-dash.
  text = text.replace(/\s+–\s+/g, ' — ');

  // 2. Title tags: match the site's existing " | BALLKNW" separator convention.
  text = text.replace(/(<title>)([^<]*)(<\/title>)/g, (m, a, inner, b) =>
    a + inner.replace(/\s*—\s*/g, ' | ') + b);

  // 3. Paired dashes inside one sentence -> parentheses.
  //    Only when both dashes sit between the same pair of sentence boundaries.
  text = text.replace(/ — ([^—.<>]{3,120}?) — /g, ' ($1) ');

  // 4. Label/definition rows: "<strong>Term</strong> — meaning" -> colon.
  text = text.replace(/(<\/(?:strong|b|th|dt)>)\s*—\s*/g, '$1: ');
  //    Table cells opening with a value then a gloss.
  text = text.replace(/(<td[^>]*>)([^<—]{1,60}?)\s+—\s+/g, '$1$2: ');

  // 5. Remaining single dashes, decided by what follows.
  text = text.replace(/\s*—\s*/g, (m, off, whole) => {
    const after = whole.slice(off + m.length);
    const before = whole.slice(0, off);
    const w = firstWord(after);
    if (!w) { unresolved.push([file, before.slice(-50) + '||' + after.slice(0, 50)]); return m; }

    // "...compared — and which to buy."  -> comma
    if (CONJ.has(w)) return ', ';

    // Independent clause following -> full stop, and capitalise it.
    const rest = after.replace(/^\s*(<[^>]+>\s*)*/, '');
    const secondWord = (rest.match(/^[A-Za-z'’]+\s+([A-Za-z'’]+)/) || [])[1] || '';
    const startsClause = PRON.has(w) && VERB.test(secondWord.toLowerCase() + ' ');
    const endsSentence = /[a-z0-9)"'\]]\s*$/.test(before);
    // Preceding text already ends a sentence (often a quotation): the gloss that
    // follows needs a human decision, not a mechanical joint.
    if (/[.!?]["'\u2019\u201d]?\s*$/.test(before)) {
      unresolved.push([file, before.slice(-60) + ' || ' + after.slice(0, 60)]);
      return m;
    }

    if (startsClause && endsSentence) return '\u0001 ';

    // Participial or adjectival modifier ("sourced from...", "built for...") -> comma
    if (/^(sourced|built|based|made|designed|written|played|set|run|used|given|taken|kept|held|priced|aimed)\b/.test(w) ||
        /^[a-z]+(ing|ed)$/.test(w) && !PRON.has(w)) return ', ';

    // A list or an elaboration of the noun just named -> colon.
    const clause = rest.split(/[.<]/)[0];
    if (clause.includes(',') || clause.split(/\s+/).length > 6) return ': ';

    return ', ';
  });

  // Capitalise only after a full stop THIS pass introduced (sentinel \u0001),
  // so nothing else in the document is touched.
  text = text.replace(/\u0001\s*((?:<[^>]+>\s*)*)([a-z])/g,
    (m, markup, ch) => '. ' + markup + ch.toUpperCase());
  text = text.replace(/\u0001/g, '. ');

  return text;
}

const targets = files.length ? files : [];
for (const f of targets) {
  const src = readFileSync(f, 'utf8');
  const out = fixSegment(src, f);
  const before = (src.match(/[—–]/g) || []).length;
  const after = (out.match(/[—–]/g) || []).length;
  if (WRITE && out !== src) writeFileSync(f, out);
  console.log(`${f}: ${before} -> ${after}`);
}
if (unresolved.length) {
  console.log(`\nUNRESOLVED (${unresolved.length}):`);
  for (const [f, c] of unresolved.slice(0, 20)) console.log('  ', f, '::', c.replace(/\n/g, ' '));
}
