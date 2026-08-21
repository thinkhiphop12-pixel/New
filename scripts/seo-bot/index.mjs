#!/usr/bin/env node
/* BALLKNW SEO bot.

   Audits the static site in this repo against the on-page rules that decide
   how it gets crawled, indexed and displayed, fixes what is safely derivable,
   and reports the rest. It reads the repo rather than the deployed site, so it
   runs in CI with no network and catches regressions before they ship;
   `--live` adds the checks only production can answer.

   Usage:
     node scripts/seo-bot/index.mjs           # audit, print a report
     node scripts/seo-bot/index.mjs --fix     # apply the safe fixes, then audit
     node scripts/seo-bot/index.mjs --live    # also check the deployed URLs
     node scripts/seo-bot/index.mjs --format=markdown --out=report.md
     node scripts/seo-bot/index.mjs --strict  # exit non-zero on warnings too

   Exit codes: 0 clean, 1 errors found (or warnings under --strict), 2 crash.
*/

import { writeFileSync } from 'node:fs';

import { loadSite } from './lib/site.mjs';
import { toConsole, toJson, toMarkdown, summarise } from './lib/report.mjs';

import * as headRule from './rules/head.mjs';
import * as socialRule from './rules/social.mjs';
import * as contentRule from './rules/content.mjs';
import * as schemaRule from './rules/structured-data.mjs';
import * as linksRule from './rules/links.mjs';
import * as sitemapRule from './rules/sitemap.mjs';
import * as robotsRule from './rules/robots.mjs';
import * as redirectsRule from './rules/redirects.mjs';

import * as sitemapFixer from './fixers/sitemap.mjs';
import * as headFixer from './fixers/head.mjs';
import * as robotsFixer from './fixers/robots.mjs';

const RULES = [headRule, socialRule, contentRule, schemaRule, linksRule, sitemapRule, robotsRule, redirectsRule];
/* Order matters: head first so canonicals are correct, then robots, then the
   sitemap last — it is generated from the state the other two leave behind. */
const FIXERS = [headFixer, robotsFixer, sitemapFixer];

function parseArgs(argv) {
  const opts = {
    fix: false, live: false, strict: false, quiet: false,
    format: 'console', out: null, only: null, severity: null,
  };
  for (const arg of argv) {
    if (arg === '--fix') opts.fix = true;
    else if (arg === '--live') opts.live = true;
    else if (arg === '--strict') opts.strict = true;
    else if (arg === '--quiet') opts.quiet = true;
    else if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg.startsWith('--format=')) opts.format = arg.slice(9);
    else if (arg.startsWith('--out=')) opts.out = arg.slice(6);
    else if (arg.startsWith('--only=')) opts.only = arg.slice(7).split(',').map((s) => s.trim());
    else if (arg.startsWith('--severity=')) opts.severity = arg.slice(11);
    else if (arg.startsWith('--')) {
      console.error(`Unknown option: ${arg}`);
      process.exit(2);
    }
  }
  return opts;
}

const HELP = `
  BALLKNW SEO bot

  node scripts/seo-bot/index.mjs [options]

    --fix                Apply the safe, derivable fixes before auditing
    --live               Also check the deployed URLs (needs network)
    --strict             Exit non-zero on warnings as well as errors
    --only=a,b           Run only these rule groups
                         (${RULES.map((r) => r.id).join(', ')})
    --severity=warn      Report only this severity and above
    --format=console|markdown|json
    --out=FILE           Write the report to a file as well as stdout
    --quiet              Suppress the report, keep the exit code
    -h, --help           This message
`;

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.log(HELP);
    return 0;
  }

  let site = loadSite();
  const fixed = [];

  if (opts.fix) {
    for (const fixer of FIXERS) {
      for (const change of fixer.fix(site)) fixed.push(change.message);
    }
    // Re-read from disk so the audit reflects the fixes.
    if (fixed.length) site = loadSite();
  }

  const active = opts.only
    ? RULES.filter((r) => opts.only.includes(r.id))
    : RULES;

  if (opts.only) {
    const unknown = opts.only.filter((id) => !RULES.some((r) => r.id === id));
    if (unknown.length) {
      console.error(`Unknown rule group(s): ${unknown.join(', ')}`);
      return 2;
    }
  }

  let findings = [];
  for (const rule of active) findings.push(...rule.run(site));

  if (opts.live) {
    const { checkLive, checkLiveInfra } = await import('./lib/live.mjs');
    if (!opts.quiet && opts.format === 'console') {
      process.stderr.write(`  Checking ${site.indexable.length} live URLs...\n`);
    }
    findings.push(...await checkLiveInfra(site));
    findings.push(...await checkLive(site));
  }

  if (opts.severity) {
    const rank = { error: 0, warn: 1, info: 2 };
    const max = rank[opts.severity];
    if (max === undefined) {
      console.error(`Unknown severity: ${opts.severity}`);
      return 2;
    }
    findings = findings.filter((f) => rank[f.severity] <= max);
  }

  const meta = { site: site.config.site, pages: site.audited.length, fixed };

  const rendered = opts.format === 'json'
    ? toJson(findings, meta)
    : opts.format === 'markdown'
      ? toMarkdown(findings, meta)
      : toConsole(findings, meta);

  if (!opts.quiet) console.log(rendered);
  if (opts.out) {
    writeFileSync(opts.out, rendered.endsWith('\n') ? rendered : `${rendered}\n`, 'utf8');
  }

  const s = summarise(findings);
  if (s.error > 0) return 1;
  if (opts.strict && s.warn > 0) return 1;
  return 0;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(`seo-bot crashed: ${err.stack || err.message}`);
    process.exit(2);
  },
);
