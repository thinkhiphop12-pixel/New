/* report.mjs — turns findings into the three shapes the bot needs to emit:
   a terminal report for humans, Markdown for a GitHub job summary or PR body,
   and JSON for anything downstream.
*/

export const SEVERITIES = ['error', 'warn', 'info'];

const RANK = { error: 0, warn: 1, info: 2 };

const COLOR = process.stdout.isTTY && !process.env.NO_COLOR;
const c = (code, s) => (COLOR ? `\x1b[${code}m${s}\x1b[0m` : s);
const dim = (s) => c('2', s);
const bold = (s) => c('1', s);
const red = (s) => c('31', s);
const yellow = (s) => c('33', s);
const blue = (s) => c('36', s);
const green = (s) => c('32', s);

const paint = { error: red, warn: yellow, info: blue };
const LABEL = { error: 'error', warn: 'warn ', info: 'info ' };
const ICON = { error: '✖', warn: '▲', info: 'ℹ' };

export function summarise(findings) {
  const counts = { error: 0, warn: 0, info: 0 };
  for (const f of findings) counts[f.severity]++;
  return { ...counts, total: findings.length, fixable: findings.filter((f) => f.fixable).length };
}

function sortFindings(findings) {
  return [...findings].sort((a, b) =>
    RANK[a.severity] - RANK[b.severity]
    || String(a.page).localeCompare(String(b.page))
    || a.rule.localeCompare(b.rule));
}

/** Group by page, preserving severity ordering within each page. */
function groupByPage(findings) {
  const map = new Map();
  for (const f of sortFindings(findings)) {
    const key = f.page || '(site)';
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(f);
  }
  // Pages carrying the worst finding come first.
  const worst = (list) => Math.min(...list.map((f) => RANK[f.severity]));
  return [...map.entries()].sort((a, b) => worst(a[1]) - worst(b[1]) || a[0].localeCompare(b[0]));
}

export function toConsole(findings, { site, pages, fixed = [] } = {}) {
  const out = [];
  const s = summarise(findings);

  out.push('');
  out.push(`  ${bold('BALLKNW SEO bot')}${dim(`  ${site} · ${pages} pages`)}`);
  out.push('');

  if (fixed.length) {
    out.push(`  ${bold('Fixed')}`);
    for (const f of fixed) out.push(`    ${green('✔')} ${f}`);
    out.push('');
  }

  if (!findings.length) {
    out.push(`  ${green('✔')} No issues found.`);
    out.push('');
    return out.join('\n');
  }

  for (const [page, list] of groupByPage(findings)) {
    out.push(`  ${bold(page)}`);
    for (const f of list) {
      const tag = paint[f.severity](`${ICON[f.severity]} ${LABEL[f.severity]}`);
      out.push(`    ${tag}  ${f.message}  ${dim(f.rule)}${f.fixable ? dim(' (auto-fixable)') : ''}`);
      if (f.hint) out.push(`            ${dim(f.hint)}`);
    }
    out.push('');
  }

  const parts = [];
  if (s.error) parts.push(red(`${s.error} error${s.error === 1 ? '' : 's'}`));
  if (s.warn) parts.push(yellow(`${s.warn} warning${s.warn === 1 ? '' : 's'}`));
  if (s.info) parts.push(blue(`${s.info} note${s.info === 1 ? '' : 's'}`));
  const fixHint = s.fixable ? dim(`  —  ${s.fixable} auto-fixable, run \`npm run seo:fix\``) : '';
  out.push(`  ${parts.join(dim(' · '))}${fixHint}`);
  out.push('');
  return out.join('\n');
}

const mdEscape = (s) => String(s).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');

export function toMarkdown(findings, { site, pages, fixed = [], title = 'BALLKNW SEO report' } = {}) {
  const s = summarise(findings);
  const out = [];

  out.push(`## ${title}`);
  out.push('');
  out.push(`\`${site}\` · ${pages} pages audited · ${new Date().toISOString().slice(0, 10)}`);
  out.push('');

  if (fixed.length) {
    out.push('### Applied fixes');
    out.push('');
    for (const f of fixed) out.push(`- ${mdEscape(f)}`);
    out.push('');
  }

  if (!findings.length) {
    out.push('**No issues found.**');
    out.push('');
    return out.join('\n');
  }

  out.push(`**${s.error}** errors · **${s.warn}** warnings · **${s.info}** notes`);
  out.push('');

  for (const sev of SEVERITIES) {
    const list = sortFindings(findings.filter((f) => f.severity === sev));
    if (!list.length) continue;
    const heading = { error: 'Errors', warn: 'Warnings', info: 'Notes' }[sev];
    // Long lists collapse so a job summary stays skimmable.
    const collapse = list.length > 15;
    out.push(`### ${heading} (${list.length})`);
    out.push('');
    if (collapse) { out.push('<details><summary>Show all</summary>'); out.push(''); }
    out.push('| Page | Rule | Issue |');
    out.push('| --- | --- | --- |');
    for (const f of list) {
      out.push(`| \`${mdEscape(f.page || '(site)')}\` | \`${f.rule}\` | ${mdEscape(f.message)} |`);
    }
    out.push('');
    if (collapse) { out.push('</details>'); out.push(''); }
  }

  return out.join('\n');
}

export function toJson(findings, meta = {}) {
  return JSON.stringify({
    generatedAt: new Date().toISOString(),
    ...meta,
    summary: summarise(findings),
    findings: sortFindings(findings),
  }, null, 2);
}
