#!/usr/bin/env node
/* Tests for the SEO bot.

   The bot rewrites committed files and opens pull requests unattended, so the
   fixers are the part that has to be right: a fixer that mangles sitemap.xml
   would de-index the site. Each test builds a throwaway site in a temp
   directory, points the whole bot at it, and asserts on what comes back.

   Run: node --test scripts/seo-bot/test.mjs
*/

import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, it } from 'node:test';

import { config as baseConfig } from './config.mjs';
import { loadSite } from './lib/site.mjs';
import * as H from './lib/html.mjs';

import * as headRule from './rules/head.mjs';
import * as socialRule from './rules/social.mjs';
import * as contentRule from './rules/content.mjs';
import * as schemaRule from './rules/structured-data.mjs';
import * as linksRule from './rules/links.mjs';
import * as sitemapRule from './rules/sitemap.mjs';
import * as robotsRule from './rules/robots.mjs';
import * as redirectsRule from './rules/redirects.mjs';

import * as headFixer from './fixers/head.mjs';
import * as robotsFixer from './fixers/robots.mjs';
import * as sitemapFixer from './fixers/sitemap.mjs';

const SITE = 'https://www.ballknw.com';
const temps = [];

after(() => temps.forEach((d) => rmSync(d, { recursive: true, force: true })));

/** Build a fixture site on disk and return a loaded site object. */
function fixture(files, overrides = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'seo-bot-'));
  temps.push(dir);
  for (const [name, content] of Object.entries(files)) {
    const path = join(dir, name);
    mkdirSync(join(path, '..'), { recursive: true });
    writeFileSync(path, content, 'utf8');
  }
  const config = { ...baseConfig, ...overrides };
  return { dir, config, load: () => loadSite({ root: dir, config }) };
}

/** A well-formed page, with fields overridable per test. */
function page({
  slug = 'x', title = 'A Perfectly Reasonable Title About Football | BALLKNW',
  description = 'A meta description of a believable length that says what the page covers and gives a crawler something to build a snippet out of.',
  canonical = `${SITE}/x.html`, ogUrl = canonical, h1 = 'A heading', body = '', extraHead = '',
} = {}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <meta name="description" content="${description}">
  ${canonical ? `<link rel="canonical" href="${canonical}" />` : ''}
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  ${ogUrl ? `<meta property="og:url" content="${ogUrl}">` : ''}
  <meta property="og:image" content="${SITE}/assets/og-image.png">
  <meta property="og:type" content="article">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${SITE}/assets/og-image.png">
  ${extraHead}
</head>
<body>
  <h1>${h1}</h1>
  <p>${'word '.repeat(400)}</p>
  ${body}
</body>
</html>`;
}

const sitemapXml = (entries) => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map(({ loc, lastmod = '2026-01-01', changefreq = 'monthly', priority = '0.8' }) => `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`).join('\n')}
</urlset>
`;

const ruleIds = (findings) => findings.map((f) => f.rule);
const has = (findings, rule) => findings.some((f) => f.rule === rule);

/* ─────────────────────────── html extraction ─────────────────────────── */

describe('html', () => {
  it('decodes entities so lengths match what a SERP renders', () => {
    assert.equal(H.decode('Tactics &amp; Roles'), 'Tactics & Roles');
    assert.equal([...H.decode('A &amp; B')].length, 5);
  });

  it('ignores tags inside comments', () => {
    assert.equal(H.title('<head><!-- <title>Ghost</title> --><title>Real</title></head>'), 'Real');
    assert.equal(H.canonical('<!-- <link rel="canonical" href="/ghost"> -->'), null);
  });

  it('reads meta by name and by property independently', () => {
    const html = '<meta name="description" content="D"><meta property="og:title" content="O">';
    assert.equal(H.metaName(html, 'description'), 'D');
    assert.equal(H.metaName(html, 'og:title'), null);
    assert.equal(H.metaProperty(html, 'og:title'), 'O');
  });

  it('collects headings in document order with levels', () => {
    const hs = H.headings('<body><h1>One</h1><h3>Three</h3><h2>Two</h2></body>');
    assert.deepEqual(hs.map((h) => h.level), [1, 3, 2]);
    assert.equal(hs[0].text, 'One');
  });

  it('distinguishes a missing alt from an empty one', () => {
    const [a, b] = H.images('<body><img src="a.png"><img src="b.png" alt=""></body>');
    assert.equal(a.hasAlt, false);
    assert.equal(b.hasAlt, true);
    assert.equal(b.alt, '');
  });

  it('does not treat links inside scripts as real links', () => {
    const html = '<body><script>var s = \'<a href="/fake">x</a>\';</script><a href="/real">r</a></body>';
    assert.deepEqual(H.links(html).map((l) => l.href), ['/real']);
  });

  it('flattens an @graph into its nodes', () => {
    const [block] = H.jsonLd('<script type="application/ld+json">{"@graph":[{"@type":"Article"},{"@type":"FAQPage"}]}</script>');
    assert.equal(block.ok, true);
    assert.deepEqual(H.ldNodes(block.data).map((n) => n['@type']), ['Article', 'FAQPage']);
  });

  it('reports a parse failure instead of throwing', () => {
    const [block] = H.jsonLd('<script type="application/ld+json">{ nope }</script>');
    assert.equal(block.ok, false);
    assert.ok(block.error);
  });
});

/* ──────────────────────────────── rules ──────────────────────────────── */

describe('head rule', () => {
  it('passes a well-formed page', () => {
    const f = fixture({ 'x.html': page() });
    assert.deepEqual(ruleIds(headRule.run(f.load())), []);
  });

  it('catches a canonical pointing at the wrong page', () => {
    const f = fixture({ 'x.html': page({ canonical: `${SITE}/other.html` }) });
    assert.ok(has(headRule.run(f.load()), 'canonical-mismatch'));
  });

  it('catches a missing and a relative canonical', () => {
    const f = fixture({ 'x.html': page({ canonical: '' }), 'y.html': page({ slug: 'y', canonical: '/y.html', title: 'Another Title That Is Long Enough | BALLKNW' }) });
    const found = ruleIds(headRule.run(f.load()));
    assert.ok(found.includes('canonical-missing'));
    assert.ok(found.includes('canonical-relative'));
  });

  it('flags two pages sharing a title', () => {
    const f = fixture({ 'x.html': page(), 'y.html': page({ canonical: `${SITE}/y.html`, ogUrl: `${SITE}/y.html` }) });
    assert.ok(has(headRule.run(f.load()), 'title-duplicate'));
  });

  it('measures title length on decoded text, not source', () => {
    // 58 rendered characters; 66 in source because of the entity.
    const title = 'Tactics &amp; Roles: A Guide To Football Shapes | BALLKNW';
    const f = fixture({ 'x.html': page({ title }) });
    assert.ok(!has(headRule.run(f.load()), 'title-length'), 'entity-encoded title should not count as over-long');
  });

  it('flags an over-long title', () => {
    const f = fixture({ 'x.html': page({ title: `${'Very Long Title '.repeat(6)}| BALLKNW` }) });
    assert.ok(has(headRule.run(f.load()), 'title-length'));
  });
});

describe('social rule', () => {
  it('catches og:url disagreeing with the canonical', () => {
    const f = fixture({ 'x.html': page({ ogUrl: `${SITE}/stale.html` }) });
    assert.ok(has(socialRule.run(f.load()), 'og-url-mismatch'));
  });

  it('catches a relative og:image', () => {
    const html = page().replace(`${SITE}/assets/og-image.png"><meta property="og:type"`, 'assets/og.png"><meta property="og:type"');
    const f = fixture({ 'x.html': page().replace('content="https://www.ballknw.com/assets/og-image.png">\n  <meta property="og:type"', 'content="assets/og.png">\n  <meta property="og:type"') });
    assert.ok(has(socialRule.run(f.load()), 'og-image-relative'));
  });
});

describe('content rule', () => {
  it('catches a missing H1 and a skipped heading level', () => {
    const f = fixture({ 'x.html': page({ h1: '' }).replace('<h1></h1>', '<h2>Two</h2><h4>Four</h4>') });
    const found = ruleIds(contentRule.run(f.load()));
    assert.ok(found.includes('h1-missing'));
    assert.ok(found.includes('heading-skip'));
  });

  it('catches an image with no alt', () => {
    const f = fixture({ 'x.html': page({ body: '<img src="/assets/a.png" width="10" height="10">' }) });
    assert.ok(has(contentRule.run(f.load()), 'img-alt'));
  });

  it('treats alt="" as decorative, not missing', () => {
    const f = fixture({ 'x.html': page({ body: '<img src="/assets/a.png" alt="" width="10" height="10">' }) });
    const found = ruleIds(contentRule.run(f.load()));
    assert.ok(!found.includes('img-alt'));
    assert.ok(found.includes('img-alt-empty'));
  });

  it('catches thin content', () => {
    const thin = page().replace(/<p>[\s\S]*?<\/p>/, '<p>Not many words at all.</p>');
    const f = fixture({ 'x.html': thin });
    assert.ok(has(contentRule.run(f.load()), 'thin-content'));
  });
});

describe('structured-data rule', () => {
  const ld = (obj) => `<script type="application/ld+json">${JSON.stringify(obj)}</script>`;

  it('reports unparseable JSON-LD as an error', () => {
    const f = fixture({ 'x.html': page({ extraHead: '<script type="application/ld+json">{ broken, }</script>' }) });
    assert.ok(has(schemaRule.run(f.load()), 'schema-invalid'));
  });

  it('catches an FAQ answer that is empty', () => {
    const f = fixture({ 'x.html': page({ extraHead: ld({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [{ '@type': 'Question', name: 'Q?', acceptedAnswer: { '@type': 'Answer', text: '' } }],
    }) }) });
    assert.ok(has(schemaRule.run(f.load()), 'schema-faq'));
  });

  it('catches FAQ schema drifting from the visible accordion', () => {
    const f = fixture({ 'x.html': page({
      extraHead: ld({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          { '@type': 'Question', name: 'A?', acceptedAnswer: { '@type': 'Answer', text: 'yes' } },
          { '@type': 'Question', name: 'B?', acceptedAnswer: { '@type': 'Answer', text: 'yes' } },
        ],
      }),
      body: '<details><summary>A?</summary>yes</details>',
    }) });
    assert.ok(has(schemaRule.run(f.load()), 'schema-faq-drift'));
  });

  it('catches an Article missing datePublished', () => {
    const f = fixture({ 'x.html': page({ extraHead: ld({
      '@context': 'https://schema.org', '@type': 'Article', headline: 'H',
    }) }) });
    const found = schemaRule.run(f.load()).filter((x) => x.rule === 'schema-article');
    assert.ok(found.some((x) => x.message.includes('datePublished')));
  });
});

describe('links rule', () => {
  it('catches a link to a page that does not exist', () => {
    const f = fixture({ 'x.html': page({ body: '<a href="/gone.html">Gone</a>' }) });
    assert.ok(has(linksRule.run(f.load()), 'link-broken'));
  });

  it('catches a link to an anchor that does not exist', () => {
    const f = fixture({
      'x.html': page({ body: '<a href="/y.html#nope">Y</a>' }),
      'y.html': page({ canonical: `${SITE}/y.html`, ogUrl: `${SITE}/y.html`, title: 'Second Page With A Long Enough Title | BALLKNW' }),
    });
    assert.ok(has(linksRule.run(f.load()), 'link-anchor'));
  });

  it('follows vercel.json redirects instead of calling them broken', () => {
    const f = fixture({
      'x.html': page({ body: '<a href="/scout/">Scout</a>' }),
      'vercel.json': JSON.stringify({ redirects: [{ source: '/scout/:path*', destination: '/gaffa/', permanent: true }] }),
    });
    const found = ruleIds(linksRule.run(f.load()));
    assert.ok(!found.includes('link-broken'));
    assert.ok(found.includes('link-redirect'));
  });

  it('flags a page nothing links to', () => {
    const f = fixture({
      'index.html': page({ canonical: `${SITE}/`, ogUrl: `${SITE}/`, title: 'Home Page Of A Football Site | BALLKNW' }),
      'lonely.html': page({ canonical: `${SITE}/lonely.html`, ogUrl: `${SITE}/lonely.html`, title: 'A Page Nobody Links To At All | BALLKNW' }),
    });
    const found = linksRule.run(f.load()).filter((x) => x.rule === 'orphan');
    assert.equal(found.length, 1);
    assert.equal(found[0].page, 'lonely.html');
  });

  it('flags generic anchor text', () => {
    const f = fixture({
      'x.html': page({ body: '<a href="/y.html">click here</a>' }),
      'y.html': page({ canonical: `${SITE}/y.html`, ogUrl: `${SITE}/y.html`, title: 'Second Page With A Long Enough Title | BALLKNW' }),
    });
    assert.ok(has(linksRule.run(f.load()), 'anchor-text'));
  });
});

describe('sitemap rule', () => {
  it('catches a page missing from the sitemap', () => {
    const f = fixture({
      'x.html': page(),
      'y.html': page({ canonical: `${SITE}/y.html`, ogUrl: `${SITE}/y.html`, title: 'Second Page With A Long Enough Title | BALLKNW' }),
      'sitemap.xml': sitemapXml([{ loc: `${SITE}/x.html` }]),
    });
    const found = sitemapRule.run(f.load()).filter((x) => x.rule === 'sitemap-missing-page');
    assert.equal(found.length, 1);
    assert.match(found[0].message, /y\.html/);
  });

  it('reports an empty sitemap once rather than once per page', () => {
    const f = fixture({ 'x.html': page(), 'sitemap.xml': sitemapXml([]) });
    const found = sitemapRule.run(f.load());
    assert.deepEqual(ruleIds(found), ['sitemap-empty']);
  });

  it('catches an entry with no page behind it', () => {
    const f = fixture({
      'x.html': page(),
      'sitemap.xml': sitemapXml([{ loc: `${SITE}/x.html` }, { loc: `${SITE}/deleted.html` }]),
    });
    assert.ok(has(sitemapRule.run(f.load()), 'sitemap-stale'));
  });

  it('catches a noindex page listed in the sitemap', () => {
    const f = fixture({
      'x.html': page({ extraHead: '<meta name="robots" content="noindex">' }),
      'sitemap.xml': sitemapXml([{ loc: `${SITE}/x.html` }]),
    });
    assert.ok(has(sitemapRule.run(f.load()), 'sitemap-noindex'));
  });

  it('catches a URL on the wrong host', () => {
    const f = fixture({
      'x.html': page(),
      'sitemap.xml': sitemapXml([{ loc: `${SITE}/x.html` }, { loc: 'https://example.com/x.html' }]),
    });
    assert.ok(has(sitemapRule.run(f.load()), 'sitemap-host'));
  });
});

describe('robots rule', () => {
  it('catches a Disallow that blocks an indexable page', () => {
    const f = fixture({
      'x.html': page(),
      'sitemap.xml': sitemapXml([{ loc: `${SITE}/x.html` }]),
      'robots.txt': `User-agent: *\nDisallow: /x.html\n\nSitemap: ${SITE}/sitemap.xml\n`,
    });
    assert.ok(has(robotsRule.run(f.load()), 'robots-blocks-indexable'));
  });

  it('respects a more specific Allow over a broader Disallow', () => {
    const f = fixture({
      'x.html': page(),
      'sitemap.xml': sitemapXml([{ loc: `${SITE}/x.html` }]),
      'robots.txt': `User-agent: *\nDisallow: /\nAllow: /x.html\n\nSitemap: ${SITE}/sitemap.xml\n`,
    });
    assert.ok(!has(robotsRule.run(f.load()), 'robots-blocks-indexable'));
  });

  it('catches a wrong Sitemap declaration', () => {
    const f = fixture({
      'x.html': page(),
      'sitemap.xml': sitemapXml([{ loc: `${SITE}/x.html` }]),
      'robots.txt': 'User-agent: *\nAllow: /\n\nSitemap: https://ballknw.com/sitemap.xml\n',
    });
    assert.ok(has(robotsRule.run(f.load()), 'robots-sitemap'));
  });
});

describe('redirects rule', () => {
  const withRedirects = (redirects, extra = {}) => fixture({
    'index.html': page({ canonical: `${SITE}/`, ogUrl: `${SITE}/`, title: 'Home Page Of A Football Site | BALLKNW' }),
    'gaffa/index.html': page({ canonical: `${SITE}/gaffa/`, ogUrl: `${SITE}/gaffa/` }),
    'vercel.json': JSON.stringify({ redirects }),
    ...extra,
  });

  it('catches the trailing-slash form a :path* rule does not match', () => {
    // This is the bug the rule was written for: /scout redirects, /scout/ 404s.
    const f = withRedirects([
      { source: '/scout', destination: '/gaffa/', permanent: true },
      { source: '/scout/:path*', destination: '/gaffa/', permanent: true },
    ]);
    const found = redirectsRule.run(f.load()).filter((x) => x.rule === 'redirect-trailing-slash');
    assert.equal(found.length, 1);
    assert.match(found[0].message, /\/scout\//);
  });

  it('passes once both forms are covered', () => {
    const f = withRedirects([
      { source: '/scout', destination: '/gaffa/', permanent: true },
      { source: '/scout/', destination: '/gaffa/', permanent: true },
      { source: '/scout/:path*', destination: '/gaffa/', permanent: true },
    ]);
    assert.ok(!has(redirectsRule.run(f.load()), 'redirect-trailing-slash'));
  });

  it('catches a destination token the source never captures', () => {
    const f = withRedirects([
      { source: '/old/', destination: '/gaffa/:path*', permanent: true },
    ]);
    assert.ok(has(redirectsRule.run(f.load()), 'redirect-token'));
  });

  it('catches a redirect chain', () => {
    const f = withRedirects([
      { source: '/a', destination: '/b', permanent: true },
      { source: '/b', destination: '/gaffa/', permanent: true },
    ]);
    assert.ok(has(redirectsRule.run(f.load()), 'redirect-chain'));
  });

  it('catches a destination that does not exist', () => {
    const f = withRedirects([
      { source: '/a', destination: '/nowhere.html', permanent: true },
    ]);
    assert.ok(has(redirectsRule.run(f.load()), 'redirect-destination'));
  });

  it('catches a redirect shadowing a real page', () => {
    // The redirect source matches a route a real file already serves, so the
    // file can never be reached.
    const f = withRedirects([
      { source: '/live.html', destination: '/gaffa/', permanent: true },
    ], { 'live.html': page({ canonical: `${SITE}/live.html`, ogUrl: `${SITE}/live.html`, title: 'A Real Page That Is Shadowed | BALLKNW' }) });
    const found = redirectsRule.run(f.load()).filter((x) => x.rule === 'redirect-shadow');
    assert.equal(found.length, 1);
    assert.match(found[0].message, /live\.html/);
  });

  it('flags a temporary redirect for a retired URL', () => {
    const f = withRedirects([{ source: '/a', destination: '/gaffa/', permanent: false }]);
    assert.ok(has(redirectsRule.run(f.load()), 'redirect-temporary'));
  });
});

/* ──────────────────────────────── fixers ─────────────────────────────── */

describe('head fixer', () => {
  it('adds a canonical where there is none', () => {
    const f = fixture({ 'x.html': page({ canonical: '', ogUrl: '' }) });
    const applied = headFixer.fix(f.load());
    assert.equal(applied.length, 1);
    const after = readFileSync(join(f.dir, 'x.html'), 'utf8');
    assert.equal(H.canonical(after), `${SITE}/x.html`);
    // And the audit is clean afterwards.
    assert.ok(!has(headRule.run(f.load()), 'canonical-missing'));
  });

  it('corrects a wrong canonical and drags og:url with it', () => {
    const f = fixture({ 'x.html': page({ canonical: `${SITE}/wrong.html`, ogUrl: `${SITE}/wrong.html` }) });
    headFixer.fix(f.load());
    const after = readFileSync(join(f.dir, 'x.html'), 'utf8');
    assert.equal(H.canonical(after), `${SITE}/x.html`);
    assert.equal(H.metaProperty(after, 'og:url'), `${SITE}/x.html`);
  });

  it('corrects the url inside Article JSON-LD', () => {
    const f = fixture({ 'x.html': page({ extraHead: `<script type="application/ld+json">${JSON.stringify({
      '@context': 'https://schema.org', '@type': 'Article', headline: 'H',
      datePublished: '2026-01-01', url: `${SITE}/wrong.html`,
    })}</script>` }) });
    headFixer.fix(f.load());
    const after = readFileSync(join(f.dir, 'x.html'), 'utf8');
    const [block] = H.jsonLd(after);
    assert.equal(block.ok, true, 'rewritten JSON-LD must still parse');
    assert.equal(block.data.url, `${SITE}/x.html`);
  });

  it('absolute-ises a relative og:image when the file exists', () => {
    const f = fixture({
      'x.html': page().replace('content="https://www.ballknw.com/assets/og-image.png">\n  <meta property="og:type"', 'content="assets/og-image.png">\n  <meta property="og:type"'),
      'assets/og-image.png': 'not really a png',
    });
    headFixer.fix(f.load());
    const after = readFileSync(join(f.dir, 'x.html'), 'utf8');
    assert.equal(H.metaProperty(after, 'og:image'), `${SITE}/assets/og-image.png`);
    assert.ok(!has(socialRule.run(f.load()), 'og-image-relative'));
  });

  it('leaves a relative og:image alone when the file is missing', () => {
    const f = fixture({
      'x.html': page().replace('content="https://www.ballknw.com/assets/og-image.png">\n  <meta property="og:type"', 'content="assets/nope.png">\n  <meta property="og:type"'),
    });
    headFixer.fix(f.load());
    const after = readFileSync(join(f.dir, 'x.html'), 'utf8');
    assert.equal(H.metaProperty(after, 'og:image'), 'assets/nope.png');
  });

  it('never rewrites human copy', () => {
    const title = `${'A Title That Is Far Too Long For A Result Listing '.repeat(2)}| BALLKNW`;
    const f = fixture({ 'x.html': page({ title }) });
    headFixer.fix(f.load());
    const after = readFileSync(join(f.dir, 'x.html'), 'utf8');
    assert.equal(H.title(after), H.norm(title), 'the fixer must leave titles alone');
  });

  it('is idempotent', () => {
    const f = fixture({ 'x.html': page({ canonical: `${SITE}/wrong.html` }) });
    headFixer.fix(f.load());
    const once = readFileSync(join(f.dir, 'x.html'), 'utf8');
    assert.deepEqual(headFixer.fix(f.load()), []);
    assert.equal(readFileSync(join(f.dir, 'x.html'), 'utf8'), once);
  });
});

describe('sitemap fixer', () => {
  const site = (extra = {}) => fixture({
    'a.html': page({ canonical: `${SITE}/a.html`, ogUrl: `${SITE}/a.html`, title: 'Page A With A Sufficiently Long Title | BALLKNW' }),
    'b.html': page({ canonical: `${SITE}/b.html`, ogUrl: `${SITE}/b.html`, title: 'Page B With A Sufficiently Long Title | BALLKNW' }),
    ...extra,
  });

  it('appends a new page and drops a stale entry', () => {
    const f = site({ 'sitemap.xml': sitemapXml([
      { loc: `${SITE}/a.html` },
      { loc: `${SITE}/deleted.html` },
    ]) });
    sitemapFixer.fix(f.load());
    const after = readFileSync(join(f.dir, 'sitemap.xml'), 'utf8');
    assert.ok(after.includes(`${SITE}/b.html`), 'new page appended');
    assert.ok(!after.includes('deleted.html'), 'stale entry removed');
    assert.deepEqual(sitemapRule.run(f.load()).filter((x) => x.severity === 'error'), []);
  });

  it('preserves the order and the hand-set priority of existing entries', () => {
    const f = site({ 'sitemap.xml': sitemapXml([
      { loc: `${SITE}/b.html`, priority: '0.3', changefreq: 'yearly' },
      { loc: `${SITE}/a.html`, priority: '1.0', changefreq: 'daily' },
    ]) });
    sitemapFixer.fix(f.load());
    const after = readFileSync(join(f.dir, 'sitemap.xml'), 'utf8');
    assert.ok(after.indexOf('b.html') < after.indexOf('a.html'), 'existing order kept');
    assert.match(after, /<loc>https:\/\/www\.ballknw\.com\/b\.html<\/loc>\s*<lastmod>[^<]*<\/lastmod>\s*<changefreq>yearly<\/changefreq>\s*<priority>0\.3<\/priority>/);
  });

  it('never moves lastmod backwards', () => {
    const f = site({ 'sitemap.xml': sitemapXml([
      { loc: `${SITE}/a.html`, lastmod: '2099-01-01' },
      { loc: `${SITE}/b.html`, lastmod: '2099-01-01' },
    ]) });
    assert.deepEqual(sitemapFixer.fix(f.load()), []);
    assert.ok(readFileSync(join(f.dir, 'sitemap.xml'), 'utf8').includes('2099-01-01'));
  });

  it('removes a duplicated entry', () => {
    const f = site({ 'sitemap.xml': sitemapXml([
      { loc: `${SITE}/a.html` }, { loc: `${SITE}/a.html` }, { loc: `${SITE}/b.html` },
    ]) });
    sitemapFixer.fix(f.load());
    const after = readFileSync(join(f.dir, 'sitemap.xml'), 'utf8');
    assert.equal((after.match(/a\.html/g) || []).length, 1);
  });

  it('leaves out a noindex page', () => {
    const f = site({
      'secret.html': page({ canonical: `${SITE}/secret.html`, ogUrl: `${SITE}/secret.html`, extraHead: '<meta name="robots" content="noindex">' }),
      'sitemap.xml': sitemapXml([{ loc: `${SITE}/secret.html` }]),
    });
    sitemapFixer.fix(f.load());
    const after = readFileSync(join(f.dir, 'sitemap.xml'), 'utf8');
    assert.ok(!after.includes('secret.html'));
  });

  it('writes a valid sitemap from nothing', () => {
    const f = site();
    sitemapFixer.fix(f.load());
    const after = readFileSync(join(f.dir, 'sitemap.xml'), 'utf8');
    assert.match(after, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
    assert.equal((after.match(/<url>/g) || []).length, 2);
  });

  it('is idempotent', () => {
    const f = site({ 'sitemap.xml': sitemapXml([{ loc: `${SITE}/a.html` }]) });
    sitemapFixer.fix(f.load());
    const once = readFileSync(join(f.dir, 'sitemap.xml'), 'utf8');
    assert.deepEqual(sitemapFixer.fix(f.load()), []);
    assert.equal(readFileSync(join(f.dir, 'sitemap.xml'), 'utf8'), once);
  });
});

describe('robots fixer', () => {
  it('corrects a wrong Sitemap line and leaves the rules alone', () => {
    const f = fixture({
      'x.html': page(),
      'robots.txt': 'User-agent: *\nAllow: /\nDisallow: /admin/\n\nSitemap: https://ballknw.com/sitemap.xml\n',
    });
    robotsFixer.fix(f.load());
    const after = readFileSync(join(f.dir, 'robots.txt'), 'utf8');
    assert.ok(after.includes(`Sitemap: ${SITE}/sitemap.xml`));
    assert.ok(!after.includes('https://ballknw.com/sitemap.xml'));
    assert.ok(after.includes('Disallow: /admin/'), 'crawl rules must be untouched');
  });

  it('adds a Sitemap line where there is none, and is idempotent', () => {
    const f = fixture({ 'x.html': page(), 'robots.txt': 'User-agent: *\nAllow: /\n' });
    robotsFixer.fix(f.load());
    const once = readFileSync(join(f.dir, 'robots.txt'), 'utf8');
    assert.ok(once.includes(`Sitemap: ${SITE}/sitemap.xml`));
    assert.deepEqual(robotsFixer.fix(f.load()), []);
    assert.equal(readFileSync(join(f.dir, 'robots.txt'), 'utf8'), once);
  });
});
