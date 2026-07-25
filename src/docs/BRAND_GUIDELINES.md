# BALLKNW Brand Guidelines

> **Note (2026-07-25):** This document previously described a navy/`#00ff88`
> rebrand (game names "7-0-0, Boardroom, Lineup, Bracket, Dynasty") that was
> never finished — the Migration Checklist below was left unchecked and the
> live homepage (`index.html`) never adopted it. The colors, fonts, and game
> names below have been corrected to match what is actually shipped in
> production today: the `index.html` / `perfect-cup/` design system. Treat
> this file as the current source of truth again.
>
> **Update (2026-07-25, later same day):** the palette below has been
> revised again — the original near-black/neon-lime combo tested too harsh
> (16.9:1 contrast on body text, ~4× past the 4.5:1 minimum). The site has
> moved to **"Under the Floodlights"**: a green-tinted near-black instead of
> neutral black, and a less-neon, more grass-toned green. Same structure,
> softer execution. The Logo System section has also been rewritten to
> match the new mark that actually shipped ("The Corner Mark").

## Brand Identity

**BALLKNW** (Ball Knowledge) is a free hub of football knowledge games — building World Cup teams, identifying players, simulating tournaments, and managing clubs, all in the browser. Current games: **Scout** (daily connections puzzle), **Gaffer** (full club-management sim, `/football-manager/`), and **Draft XI** (squad draft + season sim, `/perfect-cup/`).

**Brand Promise**: Fast, smart, free football games for obsessives.

---

## Logo System

### Primary Mark (Logo) — "The Corner Mark"
- **Symbol**: a rounded-square gradient badge (Floodlight Green → Pitch Emerald) with a bold "B" in `#052411`, plus a small pentagon "seam" notched into the top-right corner — a quiet nod to a football's panel stitching, without resorting to a literal ball icon.
- **Style**: Modern, clean, minimal — legible down to 16px (a literal ball-and-pentagon icon was tested and rejected: it nearly vanishes into a dark blob at favicon size, where letterforms stay crisp).
- **Usage**: App icon, favicon, standalone brand mark, button icon.
- **Versions**:
  - `logo-mark.svg` (square 1:1, 512×512 viewBox) — full-color, for dark backgrounds
  - `logo-mark-inverted.svg` — dark badge + green "B", for light backgrounds
  - `logo-mark-mono.svg` — single-color outline (set via CSS `color`), for one-color contexts
  - `favicon.svg` — same mark at browser-tab scale
- **Game marks** (same badge language, different letter + gradient, per the existing per-game accent convention): `badge-gaffer.svg` (gold, "G"), `badge-scout.svg` (green, "S"), `badge-draftxi.svg` (emerald, "XI").

### Logo Lockup (Full Logo)
- **Horizontal**: Mark + "BALL**KNW**" wordmark (`logo-horizontal.svg`, 2:1 aspect) — "BALL" in off-white, "KNW" in Floodlight Green, matching the live nav treatment.
- **Vertical**: Mark stacked above wordmark (`logo-vertical.svg`, 1:1.5 aspect)
- **Minimum size**: 240px wide for horizontal, 160px for vertical
- **Clear space**: Minimum 1/4 of mark height on all sides
- **Not yet cleaned up**: `logo-social.svg` is an older, unrelated OG-image design referencing a retired game name ("7-0-0") and an even earlier palette — it isn't referenced anywhere in the site's HTML. Safe to delete or regenerate later; left alone for this pass.

### Logo Don'ts
- ❌ Do not stretch or distort
- ❌ Do not add drop shadows or effects
- ❌ Do not change colors without approval
- ❌ Do not use on cluttered backgrounds (maintain contrast)

---

## Color Palette — "Under the Floodlights"

### Primary Colors
- **Floodlight Green**: `#5fd97a` (primary CTA gradient start, highlights, active nav)
  - RGB: 95, 217, 122
  - Usage: Primary buttons (as gradient with Pitch Emerald), glow accents, hover states
  - Replaces the old neon **Lime** `#b8ff3c` — same role, less retina-searing.

- **Pitch Emerald**: `#12b380` (primary CTA gradient end, secondary highlight)
  - RGB: 18, 179, 128
  - Usage: Primary buttons (as gradient with Floodlight Green), ambient background glow
  - Replaces the old **Emerald** `#00d68f`.

- **Under-the-Floodlights Black**: `#0b120d` (background)
  - RGB: 11, 18, 13
  - Usage: Primary background across every page. Deliberately carries a faint green cast (a pitch at night), not neutral/true black.
  - Replaces the old **Near-Black** `#050505`.

### Secondary Colors
- **Trophy Gold**: `#e0b84a` (secondary accent, labels, "win" states)
  - RGB: 224, 184, 74
  - Usage: Secondary labels, stats, ratings accents, season-objective/"Champions" moments
  - Unifies two previously-inconsistent golds (`#c9a227` and a separate hardcoded `#f5b301`) into one value.

### Neutral Colors
- **Off-White**: `#f2efe6` (primary text) — replaces pure `#ffffff`; softer against the green-black background.
- **Muted**: `#93a099` (secondary text, nav links, labels) — replaces `#8a8a8e`, given a slight green bias to match the new background instead of a neutral grey.
- **On-CTA Text**: `#052411` (dark text sitting on top of the green/emerald gradient buttons) — replaces `#04140b`.
- **Border**: `rgba(255,255,255,0.10)`, **Border Bright**: `rgba(255,255,255,0.18)` (dividers, outlines — unchanged, still read fine against the new background)
- **Surface**: `rgba(255,255,255,0.04)`, **Glass**: `rgba(255,255,255,0.06)` (card/panel backgrounds — unchanged)

### Status Colors
Not yet formalized site-wide — the games (`Scout`, `Gaffer`, `Draft XI`) each use their own accent color on top of the shared dark base, which is an intentional per-game distinction, not an inconsistency. If a shared status palette is needed later, derive it from this base rather than introducing a new background/text scheme.

---

## Typography

### Primary Font: Inter
```css
font-family: Inter, system-ui, -apple-system, sans-serif;
```
Loaded from Google Fonts (weights 400/500/600/700/800/900), with a system-font fallback stack.
- **Sans-serif only**, modern and clean
- **No serifs**

### Font Sizes & Weights
- **Headline**: 24–32px, 700–800 weight
- **Subheading**: 16–18px, 600 weight
- **Body**: 13–14px, 400 weight
- **Small/Label**: 11–12px, 600 weight (uppercase)

---

## Imagery & Graphics

### Football/Soccer Elements
- **Ball**: Always the geometric mark, never realistic
- **Field**: Minimal line graphics, not photorealistic
- **Teams**: Jersey colors (team-specific, no gradients)
- **Players**: Silhouettes or initials, not portraits

### Photography
- **Avoid**: Stock photos, generic sports images, distracting backgrounds
- **Use**: Gameplay screenshots, minimal UI mockups, gameplay results
- **Style**: Dark theme friendly, high contrast, simple composition

---

## Button & UI Styles

### Button Variants
- **Primary**: Accent green background, dark text, solid, no border
- **Secondary**: Transparent, dark text, accent border, hover fill
- **Danger**: Red background for destructive actions (delete, sell, etc.)
- **Disabled**: 50% opacity, `cursor: not-allowed`

### Interactive Elements
- **Hover**: Slight opacity change or border color shift
- **Active/Pressed**: Darker or more saturated version
- **Focus**: Blue outline (accessibility)
- **Loading**: Spinner or progress bar in accent green

---

## Spacing & Layout

### Grid System
- **Base unit**: 4px
- **Common gaps**: 8px, 12px, 16px, 20px, 24px
- **Padding**: 12px to 20px (interior spacing)
- **Margin**: 16px to 32px (section spacing)

### Cards & Containers
- **Border Radius**: 6–8px (modern, not sharp)
- **Shadow**: Minimal (0 4px 12px rgba(0,0,0,0.3) or lighter)
- **Border**: 1px solid with border color, no thick outlines

---

## Accessibility

### Contrast
- Text on background: **WCAG AA minimum** (4.5:1 for body, 3:1 for UI)
- All games tested with color blindness filters
- No color-only information (always include labels)

### Keyboard Navigation
- Tab order follows visual flow
- Focus indicators are visible (blue outline)
- All buttons and links are keyboard accessible

### Screen Readers
- Semantic HTML (nav, button, heading tags)
- Alt text on images
- ARIA labels where needed

---

## Favicon & App Icons

### Favicon (favicon.ico)
- 32×32px, 16×16px fallback
- Logo mark, solid background

### App Icon (iOS/Android)
- 192×192px PNG
- Safe area: 40px margin from edge
- Logo mark on solid background

### Touch Icon (apple-touch-icon.png)
- 180×180px PNG
- Logo mark centered
- No rounded corners (OS adds them)

---

## Social Media Assets

### Profile Pictures
- **Twitter/X**: 400×400px, logo mark centered
- **LinkedIn**: Logo mark + company name horizontal lockup
- **Discord**: Logo mark, square 1:1

### Cover/Header Images
- **Twitter**: 1500×500px, minimal background, logo mark bottom-right
- **LinkedIn**: 1200×627px, wordmark centered or off-center
- **Discord**: 1200×480px, accent green gradient with logo mark

### Shared Post Template
- Size: 1200×628px (Open Graph standard) — see `assets/og-image.png`
- **Layout**: Dark background + logo mark + headline + URL footer
- **Font**: Inter for body and headline
- **Example**: "Draft the perfect World Cup XI · Free, no account | ballknw.com"

---

## Use Cases & Examples

### Dark Backgrounds (Primary)
- Near-black (`#050505`) + Lime/Emerald gradient CTAs and highlights
- All games and pages use this theme
- Logo mark in white or inverted color

### Light Backgrounds (Rare)
- Not currently used anywhere on the site — if introduced, use the logo mark in near-black and keep Lime/Emerald as accent only

### Print (Unlikely)
- Logo mark in black or brand green
- Wordmark in black + sans-serif font
- Minimum 1-inch width for reproduction quality

---

## File Inventory

### Logo Files (SVG, PNG)
- `assets/logo-mark.svg` (primary)
- `assets/logo-mark-inverted.svg` (white)
- `assets/logo-mark-mono.svg` (single color)
- `assets/logo-horizontal.svg` (mark + wordmark)
- `assets/logo-vertical.svg` (stacked)
- `assets/logo-social.svg`
- `assets/favicon.svg`, `assets/favicon-192.png` (favicon / app icon)

### Social Assets
- `assets/social-twitter.svg`
- `assets/social-discord.svg`
- `assets/social-og-image.svg`
- `assets/og-image.png` (Open Graph image referenced site-wide)

### Brand Documents
- `BRAND_GUIDELINES.md` (this file)

---

## Brand Voice & Tone

### Tone
- **Smart**: Know what you're talking about
- **Fast**: Get to the point, no fluff
- **Playful**: Games are fun, but competitive
- **Direct**: Clear CTAs, no marketing speak

### Language
- **Game titles**: Short, punchy — current lineup is **Scout**, **Gaffer**, **Draft XI**
- **Descriptions**: One sentence per game, features in second sentence
- **Error messages**: Helpful, not condescending ("Select 11 players, not 10")
- **Success messages**: Affirming, not cheesy ("Squad saved" not "You did it! 🎉")

---

**Last Updated**: 2026-07-25

**Contact**: thinkhiphop12@gmail.com for brand inquiries
