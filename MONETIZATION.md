# Monetization & SEO — Status

Everything below is **wired and consent-gated** (nothing loads until a visitor
clicks "Accept all" in the cookie banner). The homepage currently carries 6
`.ad-slot` placements (2 sticky desktop rails, top banner, middle banner, and
2 vertical slots beside the promo banners — see below) plus the 2 promo
banners themselves, so keep an eye on ad density if you add more.

## ✅ Done (live in this branch)

- **Google AdSense** — your publisher ID `ca-pub-2741492847457362` is wired in:
  - The AdSense loader `<script>` is in the `<head>` of every page (homepage,
    scout, privacy, terms) and injected into the two Next.js games
    (Football Manager, Draft XI) — this is what Google needs to **verify and
    review** the site.
  - `shared/consent.js` (`ADSENSE_CLIENT_ID`) + `shared/ads.js` fill any
    `.ad-slot` with a real AdSense unit once a visitor consents (see
    `renderAdSenseSlot()` in `shared/ads.js`).
- **Amazon Associates + eBay Partner Network** — set in `shared/ads.js`
  (`CONFIG.AMAZON_TAG` = `lloydevans01-21`, `CONFIG.EBAY_CAMPID`). Any
  `.ad-slot` no ad network fills is **backfilled with an Amazon/eBay
  football-merch affiliate card** (`fillSlotWithAffiliate()`), alternating
  between the two programs, so no slot is ever empty and the site earns
  commission with no ad-network approval needed.
- **Promo banners (homepage, after the hero)** — `index.html`'s
  `.promo-banners` section: two horizontal placeholder banners (kits/boots
  affiliate deal, ticket/prize giveaway) that each rotate between 2 offer
  variants once a day (`ROTATIONS` object in the inline `<script>`, keyed by
  day-of-year — same date-keyed pattern as the live-player counter), each
  with a dismiss (×) button that persists via `localStorage`. Below them,
  two Google AdSense vertical slots (`#ad-slot-vertical`,
  `#ad-slot-vertical-2`) sit side-by-side on desktop and stack on mobile.
  Placeholder icon art lives in `assets/promo-*.svg`; swap in real art/links
  when ready (see comments in `index.html`).
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

- **Placeholder AdSense slot IDs:** every `.ad-slot` (including the two new
  `ad-slot-vertical*` slots) ships with `data-ad-slot="XXXXXXXX"` or
  `"XXXXXXXXXXXXXXXX"`. `hasRealSlotId()` in `shared/ads.js` only pushes to
  AdSense when that attribute is a real numeric ID — until then every slot
  quietly shows the Amazon/eBay affiliate fallback card instead of a broken
  empty box.
- **EU/GDPR:** the AdSense library currently loads on page-load (needed for
  verification), while ad *units* only render after consent. If you get
  significant EU traffic, enable Google's Consent Mode in the AdSense
  dashboard for a fully compliant setup.

## Where the knobs live

| What | File | Constant |
|---|---|---|
| AdSense ID | `shared/consent.js` (`ADSENSE_CLIENT_ID`), `shared/ads.js` (`CONFIG.ADSENSE_CLIENT`) | — |
| PostHog key | `shared/consent.js` | `POSTHOG_KEY` |
| Amazon Associates tag | `shared/ads.js` | `CONFIG.AMAZON_TAG` |
| eBay Partner Network campaign ID | `shared/ads.js` | `CONFIG.EBAY_CAMPID` |
| Promo banner rotation content/links | `index.html`, inline `<script>` above `</section>` for `.promo-banners` | `ROTATIONS` |
| Promo banner placeholder icons | `assets/promo-kits.svg`, `promo-boots.svg`, `promo-tickets.svg`, `promo-giveaway.svg` | — |

## Note on the game builds

The two Next.js games are committed as **prebuilt static output**
(`football-manager/`, `perfect-cup/`). If you change a game's source
(`footballmanager/` or `draftfantasy/`), rebuild and re-commit the output:

```bash
cd footballmanager && NEXT_PUBLIC_BASE_PATH=/football-manager npm run build
# copy footballmanager/out/* -> football-manager/   (see scripts/ or DEPLOY.md)
```
