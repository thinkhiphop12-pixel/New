# BALLKNW SEO bot

Audits the static site in this repo against the on-page rules that decide how
it gets crawled, indexed and displayed. It fixes what it can derive and reports
the rest.

It reads the repo rather than the deployed site, so it runs in CI with no
network and catches regressions before they ship. `--live` adds the checks only
production can answer.

```bash
npm run seo          # audit, print a report
npm run seo:fix      # apply the safe fixes, then audit
npm run seo:live     # also check the deployed URLs
npm run seo:test     # the bot's own tests
```

Exit code is 0 when clean, 1 when errors were found (or warnings under
`--strict`), 2 on a crash — so it works as a CI gate directly.

## What it checks

| Group | Looks for |
| --- | --- |
| `head` | Missing, duplicated or truncated titles and descriptions; canonical presence, absoluteness and self-reference; charset, `lang`, viewport |
| `social` | Open Graph and Twitter tags; `og:url` disagreeing with the canonical; relative or missing `og:image` |
| `content` | H1 count, skipped heading levels, missing `alt`, missing image dimensions, thin pages |
| `structured-data` | JSON-LD that fails to parse; Article required and recommended fields; empty FAQ answers; FAQ schema drifting from the visible accordion; breadcrumb shape |
| `links` | Broken internal links and anchors, links that land on a redirect, orphan pages, generic anchor text, insecure internal links |
| `sitemap` | Pages missing from `sitemap.xml`, entries with no page behind them, noindex pages listed, wrong host, stale `lastmod` |
| `robots` | The `Sitemap:` declaration, and any `Disallow` that blocks a page we are asking Google to index |
| `redirects` | `vercel.json` coverage — trailing-slash forms a `:path*` rule does not match, chains, dangling destinations, redirects shadowing real pages |

Run one group at a time with `--only=links,sitemap`.

## What it will and will not fix

`--fix` may only write a value that is **derivable from the page's own
location**. That line is what makes it safe to run unattended:

Fixed automatically:

- canonical URLs — added where missing, corrected where wrong
- `og:url`, and the `url` inside Article JSON-LD, dragged along with it
- relative `og:image` / `twitter:image` made absolute (only when the file exists)
- the `Sitemap:` line in `robots.txt`
- `sitemap.xml` — new pages appended, stale and duplicate entries dropped,
  `lastmod` advanced from the file's last commit

Never touched:

- titles, meta descriptions, headings, body copy — reported for a human
- `Allow` / `Disallow` rules, which encode intent the bot cannot infer
- `lastmod` moving backwards, and hand-set `priority` / `changefreq`

The sitemap fixer edits entries in place and appends new ones rather than
regenerating the file, so its diffs stay reviewable.

## Deployment

`.github/workflows/seo-bot.yml` runs it three ways:

- **on a pull request** touching the site — audits and fails the check on an
  SEO error, with the report in the job summary;
- **every Monday** — audits the repo *and* the deployed URLs, applies the fixes
  it can, and opens a pull request against `seo-bot/auto-fix` (one long-lived
  branch, so repeat runs update one PR rather than stacking them);
- **on demand** via *Run workflow*, with live checks and fixes as toggles.

The weekly run fails when it finds errors it cannot fix, which is how the repo
owner gets notified — GitHub emails on a failed scheduled workflow.

## Notes

- `/gaffa/` is excluded on purpose. Vercel rebuilds it from
  `src/games/football-manager` on every deploy (see `HANDOVER.md`), so the
  committed copy is not what production serves.
- `seo-plan-50.html` is excluded via `config.mjs`; it is a planning doc kept out
  of the index with a `noindex` tag.
- Zero dependencies, like `scripts/preview-server.mjs`. Node 22+.
- Thresholds, the ignore list and sitemap defaults live in `config.mjs`.
