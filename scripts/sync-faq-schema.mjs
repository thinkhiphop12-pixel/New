/**
 * Rebuilds every page's FAQPage structured data from the questions and
 * answers the page actually renders.
 *
 * Google requires FAQ markup to mirror visible content; markup claiming a
 * question the page does not show makes the page ineligible for the rich
 * result it was marked up for. Ten pages had drifted that way — hand-written
 * JSON-LD edited apart from the prose it describes, so a reworded <summary>
 * left the schema behind, and four pages claimed questions that appeared
 * nowhere in the rendered HTML at all.
 *
 * Generating the mainEntity from the page's own <details> blocks removes the
 * possibility rather than fixing the instances: the two cannot diverge again,
 * because there is only one source. Run after editing any page's FAQ:
 *   node scripts/sync-faq-schema.mjs [--check]
 *
 * --check exits non-zero on drift without writing, for CI.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const check = process.argv.includes('--check');
const files = readdirSync('.').filter((f) => f.endsWith('.html'));

const norm = (s) => s.replace(/\s+/g, ' ').trim().toLowerCase();

/** Visible text of an HTML fragment, as a reader sees it. */
const text = (html) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"').replace(/&#39;|&rsquo;|&lsquo;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/&mdash;/g, '—').replace(/&ndash;/g, '–')
    .replace(/\s+/g, ' ')
    .trim();

let changed = [], drifted = [];

for (const file of files) {
  const html = readFileSync(file, 'utf8');
  if (!/"@type"\s*:\s*"FAQPage"/.test(html)) continue;

  // The page's own Q&A: a <details> whose <summary> is the question and
  // whose remaining content is the answer.
  const qa = [...html.matchAll(/<details[^>]*>([\s\S]*?)<\/details>/g)]
    .map((m) => {
      const body = m[1];
      const sum = body.match(/<summary[^>]*>([\s\S]*?)<\/summary>/);
      if (!sum) return null;
      const question = text(sum[1]);
      const answer = text(body.replace(sum[0], ''));
      return question && answer ? { question, answer } : null;
    })
    .filter(Boolean);

  if (!qa.length) continue;

  // The FAQPage node is not always the top-level object — most pages wrap
  // several schema types in an "@graph" array — so parse the whole script and
  // find it wherever it sits.
  const block = html.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/);
  if (!block) continue;

  let doc;
  try { doc = JSON.parse(block[1]); } catch { console.error(`${file}: JSON-LD does not parse`); continue; }

  const nodes = Array.isArray(doc) ? doc : Array.isArray(doc['@graph']) ? doc['@graph'] : [doc];
  const faq = nodes.find((n) => n && n['@type'] === 'FAQPage');
  if (!faq) continue;

  // The rule, in one direction and the other: the schema's questions are
  // exactly the questions the page shows, in the order it shows them.
  //
  // Drift ran both ways. Some pages declared questions that appear nowhere in
  // the rendered HTML, which is what makes markup ineligible for the rich
  // result it exists for. Others showed a question the schema never mentioned,
  // which is not an error but is a section of the page Google is not being
  // told about.
  //
  // Existing answers are reused wherever the question still matches, so the
  // hand-written summaries survive — they are often tighter and better than
  // the full prose of the <details> body, and replacing them site-wide would
  // be a content change dressed up as a schema fix. Only genuinely new
  // questions get an answer generated from the page.
  const byQuestion = new Map(
    (Array.isArray(faq.mainEntity) ? faq.mainEntity : [])
      .filter((q) => q && typeof q.name === 'string')
      .map((q) => [norm(q.name), q]),
  );

  const next = qa.map(({ question, answer }) => byQuestion.get(norm(question)) ?? ({
    '@type': 'Question',
    name: question,
    acceptedAnswer: { '@type': 'Answer', text: answer },
  }));

  if (JSON.stringify(next) === JSON.stringify(faq.mainEntity)) continue;

  drifted.push(file);
  if (check) continue;

  faq.mainEntity = next;

  // Match the file's existing layout so the diff shows the questions that
  // changed rather than a reindent of every line around them.
  writeFileSync(file, html.replace(block[1], JSON.stringify(doc, null, 2)));
  changed.push(file);
}

if (check) {
  if (drifted.length) {
    console.error(`FAQ schema drift on ${drifted.length} page(s):\n  ${drifted.join('\n  ')}`);
    process.exit(1);
  }
  console.log('No FAQ schema drift.');
} else {
  console.log(changed.length ? `Rebuilt FAQ schema on ${changed.length} page(s):\n  ${changed.join('\n  ')}` : 'No FAQ schema drift.');
}
