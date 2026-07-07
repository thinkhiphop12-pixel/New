@AGENTS.md

## Project notes (BALLKNW)

The homepage (`index.html`) is a static HTML/CSS/JS page — it does not use
Next.js APIs itself, even though `footballmanager/` and `perfect-cup/` are
separate Next.js apps whose static-exported output is committed under
`football-manager/` and `perfect-cup/` and embedded via `<iframe>`. The
`AGENTS.md` Next.js guidance above applies to those game subprojects, not to
`index.html`/`styles.css`/`theme.css`.

**Ad/monetization conventions** — see `MONETIZATION.md` for full detail:
- Every ad surface is consent-gated: nothing loads until `getConsent() ===
  'all'` (`shared/consent.js`). Any element with `class="ad-slot"` and a
  `data-ad-slot`/`data-ad-format` pair is auto-filled by `shared/ads.js` —
  a real numeric `data-ad-slot` id triggers AdSense, anything else
  (placeholder `"XXXXXXXX"`) falls back to an Amazon/eBay affiliate card so
  no slot ever renders empty.
- House style is **honest, non-manipulative ad copy** — no fake countdowns,
  fabricated scarcity/inventory counters, or unverified income claims, even
  if a reference mockup includes them. Real disclaimers (18+, T&Cs apply,
  "prices set by retailer") are fine and expected.
- The promo banner block in `index.html` (`.promo-banners`, right after the
  hero) follows an established pattern worth reusing for future banners:
  - Each dismissible banner has a `data-promo-id`; its × button sets
    `localStorage['bk_promo_dismissed_' + id]` so dismissal persists.
  - Rotating banners add `data-rotate="<key>"` and a `ROTATIONS[key]` array
    of variants in the inline `<script>`; the active variant is chosen by
    `dayOfYear() % variants.length` (same date-keyed-in-`localStorage`
    approach as the live-player counter further down the page), so it
    changes once daily rather than on every reload.
  - Placeholder icons live in `assets/promo-*.svg`, following the existing
    `assets/thumb-*.svg` house style: minimal line-art on a dark panel,
    lime/emerald/gold accents. There are no licensed photos, club crests, or
    third-party (e.g. bet365) branding assets in this repo — don't fabricate
    or embed those; build placeholder art in this same SVG style instead.
