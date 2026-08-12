# BALLKNW link plan — August 2026

Source: Semrush `backlinks_refdomains` and `backlinks_overview` for ballknw.com,
pulled 2026-08-12.

## The finding

**Every referring domain pointing at ballknw.com is spam.** Not "mostly" — all 38.

| Metric | Value |
|---|---|
| Authority Score | 2 |
| Referring domains | 38 |
| Highest Authority Score among them | **6** |
| First seen | all between 2026-06-28 and 2026-08-12 |

The whole profile arrived inside a six-week window and breaks down as:

- **Fiverr gig link farms** — `fiverr-affordable-seo-services.site`,
  `fiverr-cost-effective-seo.site`, `fiverr-quality-seo-at-affordable-rates.site`,
  `fiverr-seo-for-business-growth.site`, `fiverr-seo-for-small-businesses.site`
- **Bulk SEO tool farms** — `seopxl-ranking-boost-lab.shop`,
  `seopxl-traffic-growth-lab.shop`, `seopxl-organic-boost-lab.shop`,
  `seopxl-performance-authority-engine.shop`, `seo-growth-optimization-hub.shop`,
  `seo-growth-authority-boost-hub.shop`
- **Casino and gaming spam** — `casinooftheking.com`, `hotonlinegaming.com`
- **Expired-domain PBNs and scraped directories** — `domraider.eu.com`,
  `domraider.gb.net`, `anchorurl.cloud`, `toplikevideo.com`, and a long tail of
  unrelated sites (`juaralaundry.com`, `exotichealths.com`, `sahammurah.com`)

Not one is topically related to football. Not one is editorially given.

**The source is still active.** Three domains appeared after the 2026-08-11
disavow refresh, the most recent first seen on **2026-08-12**. This is ongoing,
not a historical incident.

For contrast, `fmultimate.com` — a comparable small FM site — shows the same
pattern, which suggests these networks spray small gaming domains
indiscriminately rather than targeting ballknw specifically.

## What this changes

The earlier framing was "37 referring domains is low, build more." That was
wrong. The correct reading is:

1. **Legitimate referring domains: effectively zero.** There is no foundation to
   build on; there is a mess to clear and then a foundation to start.
2. **Acquiring links is not the first action.** Adding good links to a profile
   that is 100% spam does not net out — the profile still reads as manipulated.
3. **Authority Score 2 is explained.** It is not a young-site score. It is what a
   purely spam profile produces.

## Step 1 — Disavow (do this first)

`disavow-ballknw.txt` in the repo root is current as of 2026-08-12 and covers all
38 domains.

Upload at <https://search.google.com/search-console/disavow-links>, selecting the
`ballknw.com` property.

Two things about the tool that matter:

- **It replaces, not appends.** Every upload must contain the complete list.
  Never upload a delta.
- **It is slow.** Google re-crawls the disavowed domains on its own schedule, so
  expect weeks before the profile reads differently, not days.

Bing retired its disavow tool in October 2023 and now discounts unnatural links
algorithmically, so there is no equivalent list to maintain there.

## Step 2 — Stop the inflow

Disavowing is a filter, not a fix. New domains are still arriving, so the source
needs identifying:

- If anyone bought an SEO, "backlink building" or traffic gig for this domain —
  Fiverr, Upwork, a marketplace, an agency — cancel it. The `fiverr-*` domain
  names are unusually literal about their origin.
- If nobody bought anything, this is opportunistic spam pointed at a newly
  registered domain, which is common and eventually tails off. In that case the
  disavow file just needs re-running monthly.

Re-run `backlinks_refdomains` monthly, add anything new, and re-upload the whole
file.

## Step 3 — Earn the first real links

Only worth starting once the disavow is uploaded. The realistic routes for a
site like this, roughly in order of effort-to-return:

**Communities where FM players actually are.** r/footballmanager, the
sortitoutsi and FM Scout forums, FM Discords. These are `nofollow` and will not
pass authority directly, but they send real referral traffic, and they are how
a small site gets discovered by people who *do* run linking sites. Participate
properly — posting links cold gets removed and earns nothing.

**Be genuinely useful about a specific FM26 problem.** The site's best asset is
that it answers narrow questions accurately. A post that solves "why won't my
tactic load" earns a link far more often than a general guide does.

**Free-game directories and browser-game lists.** Gaffa is a legitimately free,
no-account browser game, which is a real hook. `itch.io`, browser-game
aggregators and "free games like Football Manager" listicles are all reachable,
and unlike the categories above they often do pass authority.

**Data or tools, not prose.** Comparison tables, a system-requirements checker,
a formation reference — things other people cite. Prose explainers rarely earn
links; reference material does.

## What not to do

Do not buy links, and do not accept any offer to "boost domain authority". The
current profile is what that produces, and the site is now carrying its cost.

Do not expect Step 3 to show results while Step 1 is outstanding. Order matters
here more than volume.

## Honest expectation

A clean profile with a handful of genuine links will still be a low-authority
site. What changes is that the pages stop being suppressed by a manipulated
profile, and on-page work starts converting into rankings instead of sitting at
position 24-77. That is the realistic goal for the next quarter — not an
authority score that competes with FM Scout.
