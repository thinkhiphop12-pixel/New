/* Article content for the BALLKNW explainer pages.

   Each entry is rendered into a static page by scripts/build-articles.mjs.
   Section `html` is written by hand rather than generated from a block model,
   so tables and inline links stay readable in the source.

   Shape of an article:
     slug, title, h1, linkText, category, published, [updated]
     description   — meta description, max 165 chars (the build asserts this)
     keywords      — meta keywords
     standfirst    — the dek under the h1
     cardBlurb     — one line for the guides hub card
     [term]        — {name, description} adds DefinedTerm schema
     answer        — HTML for the short-answer box
     [topNav]      — optional HTML block under the byline
     sections      — [{id, h2, [tocLabel], html, [adAfter]}]
     faq           — [{q, a}] rendered as both FAQPage schema and <details>
     related       — three slugs linked from the closing CTA
     [cta]         — {h3, p} override for the closing CTA copy
*/

import tactics from './part1.mjs';
import rolesAndPlatforms from './part2.mjs';
import buyingAndGuides from './part3.mjs';
import fmHowTo from './part4.mjs';
import footballExplained from './part5.mjs';

export const CATEGORIES = [
  {
    id: 'tactics',
    name: 'Tactics, roles and formations',
    blurb: 'What every position and system actually does on the pitch, in plain English.',
  },
  {
    id: 'fm',
    name: 'Football Manager 26 and management games',
    blurb: 'Which version to buy, and how to win once you have it.',
  },
  {
    id: 'football',
    name: 'How football works',
    blurb: 'Stats, transfers, and the jobs behind the scenes at a football club.',
  },
];

export const articles = [
  ...tactics,
  ...rolesAndPlatforms,
  ...buyingAndGuides,
  ...fmHowTo,
  ...footballExplained,
];
