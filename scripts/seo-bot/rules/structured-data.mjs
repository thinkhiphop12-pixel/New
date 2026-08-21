/* structured-data.mjs — the JSON-LD that earns rich results.

   A block that fails to parse is invisible to Google, so a syntax error here
   is silently expensive: the page keeps ranking but loses its FAQ accordion or
   breadcrumb trail. Parse failures are errors; missing recommended fields are
   warnings.
*/

import * as H from '../lib/html.mjs';

export const id = 'structured-data';
export const describe = 'JSON-LD validity and the fields rich results need';

const ARTICLE_TYPES = new Set(['Article', 'BlogPosting', 'NewsArticle', 'TechArticle']);
const ARTICLE_REQUIRED = ['headline', 'datePublished'];
const ARTICLE_RECOMMENDED = ['description', 'author', 'dateModified', 'url'];

const typesOf = (node) => {
  const t = node['@type'];
  return Array.isArray(t) ? t : t ? [t] : [];
};

export function run(site) {
  const { config } = site;
  const out = [];
  const push = (page, rule, severity, message, extra = {}) =>
    out.push({ rule, severity, page, message, ...extra });

  for (const page of site.audited) {
    const { file, html } = page;
    const blocks = page.jsonLd;

    if (!blocks.length) {
      const severity = config.nonArticlePages.includes(file) ? 'info' : 'warn';
      push(file, 'schema-missing', severity, 'No JSON-LD structured data');
      continue;
    }

    const nodes = [];
    for (const block of blocks) {
      if (!block.ok) {
        push(file, 'schema-invalid', 'error',
          `JSON-LD does not parse: ${block.error} — Google ignores the whole block`);
        continue;
      }
      if (!JSON.stringify(block.data).includes('schema.org')) {
        push(file, 'schema-context', 'error', 'JSON-LD block has no @context of schema.org');
      }
      nodes.push(...H.ldNodes(block.data));
    }

    for (const node of nodes) {
      const types = typesOf(node);
      if (!types.length) {
        push(file, 'schema-type', 'warn', 'A JSON-LD node has no @type');
        continue;
      }

      if (types.some((t) => ARTICLE_TYPES.has(t))) {
        for (const field of ARTICLE_REQUIRED) {
          if (!node[field]) push(file, 'schema-article', 'error', `Article schema is missing required "${field}"`);
        }
        for (const field of ARTICLE_RECOMMENDED) {
          if (!node[field]) push(file, 'schema-article', 'warn', `Article schema is missing recommended "${field}"`);
        }
        // The headline Google shows should match the page it is on.
        if (node.url && node.url !== page.url) {
          push(file, 'schema-url', 'error',
            `Article schema url is ${node.url}, expected ${page.url}`, { fixable: true });
        }
        for (const field of ['datePublished', 'dateModified']) {
          const v = node[field];
          if (v && !/^\d{4}-\d{2}-\d{2}/.test(v)) {
            push(file, 'schema-date', 'error', `${field} "${v}" is not ISO 8601`);
          }
        }
      }

      if (types.includes('FAQPage')) {
        const qs = Array.isArray(node.mainEntity) ? node.mainEntity : [node.mainEntity].filter(Boolean);
        if (!qs.length) {
          push(file, 'schema-faq', 'error', 'FAQPage schema has no mainEntity questions');
        }
        for (const q of qs) {
          if (!q || typeof q !== 'object') continue;
          const answer = q.acceptedAnswer?.text;
          if (!q.name) push(file, 'schema-faq', 'error', 'An FAQ question has no name');
          if (!answer || !String(answer).trim()) {
            push(file, 'schema-faq', 'error', `FAQ "${q.name ?? '(unnamed)'}" has an empty acceptedAnswer`);
          }
        }
        /* The FAQ markup and the FAQ schema are rendered from one source in
           build-articles.mjs. If the counts diverge, a page was hand-edited
           and the two have drifted — which is exactly the mismatch that gets
           rich results revoked. */
        const details = (H.bodyHtml(html).match(/<details\b/gi) || []).length;
        if (details && qs.length && details !== qs.length) {
          push(file, 'schema-faq-drift', 'warn',
            `${qs.length} questions in FAQPage schema but ${details} <details> blocks on the page`);
        }
      }

      if (types.includes('BreadcrumbList')) {
        const items = Array.isArray(node.itemListElement) ? node.itemListElement : [];
        if (!items.length) push(file, 'schema-breadcrumb', 'warn', 'BreadcrumbList has no itemListElement');
        items.forEach((item, i) => {
          if (item?.position === undefined) {
            push(file, 'schema-breadcrumb', 'error', `Breadcrumb item ${i + 1} has no position`);
          }
          if (!item?.name) {
            push(file, 'schema-breadcrumb', 'error', `Breadcrumb item ${i + 1} has no name`);
          }
        });
      }
    }
  }

  return out;
}
