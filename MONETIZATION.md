# Monetization & SEO — Status

Everything below is **wired and consent-gated** (nothing loads until a visitor
clicks "Accept all" in the cookie banner) and capped at ~two ad surfaces per
page so the games stay pleasant to play.

## ✅ Done (live in this branch)

- **Google AdSense** — your publisher ID `ca-pub-2741492847457362` is wired in:
  - The AdSense loader `<script>` is in the `<head>` of every page (homepage,
    scout, privacy, terms) and injected into the two Next.js games
    (Football Manager, Draft XI) — this is what Google needs to **verify and
    review** the site.
  - `shared/consent.js` (`ADSENSE_CLIENT_ID`) fills any `.ad-slot` with a real
    AdSense unit once a visitor consents.
- **Amazon Associates** — tag `lloydevans01-21` is set in `shared/ads.js`
  (`AFFILIATE_LINKS.amazon`). Any ad slot no ad network fills is **backfilled
  with an Amazon football-merch affiliate card**, so no slot is ever empty and
  the site earns commission with no approval needed.
- **Adsterra** — Social Bar + Native units stay active (consent-gated), as
  before.
- **Cookie consent banner** — now self-injects on every page (homepage, both
  games, scout). Footer has a "Cookie settings" link.
- **Ads load site-wide** — homepage, Football Manager, Draft XI and Scout all
  load `shared/consent.js` + `shared/ads.js`.
- **SEO** — canonical + Open Graph + Twitter tags + JSON-LD structured data
  (WebSite, Organization, 3× VideoGame, FAQPage) on the homepage; a matching
  visible FAQ; VideoGame data + canonical on Scout; canonical on
  privacy/terms. Dead `/hub/` and `/dynasty/` URLs removed from `sitemap.xml`.

## ⏳ What's left for you (accounts / external, ~15 min total)

1. **Wait for AdSense approval.** Google reviews the site now that the code is
   live (can take a few days to ~2 weeks). Once approved, create display ad
   units and paste each unit's slot ID onto the matching element, e.g.
   `<div class="ad-slot" data-ad-slot="1234567890">`.
2. **Google Search Console** — add `ballknw.com`, submit
   `https://ballknw.com/sitemap.xml`. (You mentioned this is done ✅ — just
   confirm the sitemap is submitted.)
3. **PostHog analytics** (optional, free) — paste your project key into
   `shared/consent.js` (`POSTHOG_KEY`) to see which pages/ads earn.

## ⚠️ Two things worth knowing

- **AdSense + Adsterra together:** Google is strict about ad quality. Running
  the Adsterra Social Bar *during AdSense review* can occasionally slow
  approval. If AdSense gets rejected for "ad experience", temporarily blank
  `ADSTERRA_SOCIAL_BAR_SRC` in `shared/ads.js` until you're approved, then
  re-enable.
- **EU/GDPR:** the AdSense library currently loads on page-load (needed for
  verification), while ad *units* only render after consent. If you get
  significant EU traffic, enable Google's Consent Mode in the AdSense
  dashboard for a fully compliant setup.

## Where the knobs live

| What | File | Constant |
|---|---|---|
| AdSense ID | `shared/consent.js` | `ADSENSE_CLIENT_ID` |
| PostHog key | `shared/consent.js` | `POSTHOG_KEY` |
| Adsterra zones | `shared/ads.js` | `ADSTERRA_*` |
| Affiliate links | `shared/ads.js` | `AFFILIATE_LINKS` |
| Ad refresh rate | `shared/ads.js` | `ADS_REFRESH_MS` |

## Note on the game builds

The two Next.js games are committed as **prebuilt static output**
(`football-manager/`, `perfect-cup/`). If you change a game's source
(`footballmanager/` or `draftfantasy/`), rebuild and re-commit the output:

```bash
cd footballmanager && NEXT_PUBLIC_BASE_PATH=/football-manager npm run build
# copy footballmanager/out/* -> football-manager/   (see scripts/ or DEPLOY.md)
```
