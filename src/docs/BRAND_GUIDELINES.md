# BALLKNW Brand Guidelines

> **Note (2026-07-25):** This document previously described a navy/`#00ff88`
> rebrand (game names "7-0-0, Boardroom, Lineup, Bracket, Dynasty") that was
> never finished — the Migration Checklist below was left unchecked and the
> live homepage (`index.html`) never adopted it. The colors, fonts, and game
> names below have been corrected to match what is actually shipped in
> production today: the `index.html` / `perfect-cup/` design system. Treat
> this file as the current source of truth again.

## Brand Identity

**BALLKNW** (Ball Knowledge) is a free hub of football knowledge games — building World Cup teams, identifying players, simulating tournaments, and managing clubs, all in the browser. Current games: **Scout** (daily connections puzzle), **Gaffer** (full club-management sim, `/football-manager/`), and **Draft XI** (squad draft + season sim, `/perfect-cup/`).

**Brand Promise**: Fast, smart, free football games for obsessives.

---

## Logo System

### Primary Mark (Logo)
- **Symbol**: "Punched Pentagon" — a solid ball formed from a single circle with one asymmetric pentagon (the universal football panel shape) cut out using a subtractive negative-space technique. No gradients, grids, or extra strokes — one shape, one cut.
- **Style**: Modern, clean, minimal — extreme simplicity with a single focal point
- **Usage**: App icon, favicon, standalone brand mark, button icon
- **Versions**:
  - `logo-mark.svg` (square 1:1, 512×512px minimum)
  - `logo-mark-inverted.svg` (white for dark backgrounds)
  - `logo-mark-mono.svg` (single color for accessibility)

### Logo Lockup (Full Logo)
- **Horizontal**: Mark + "BALL KNOWLEDGE" wordmark (2:1 aspect)
- **Vertical**: Mark stacked above wordmark (1:1.5 aspect)
- **Minimum size**: 240px wide for horizontal, 160px for vertical
- **Clear space**: Minimum 1/4 of mark height on all sides

### Logo Don'ts
- ❌ Do not stretch or distort
- ❌ Do not add drop shadows or effects
- ❌ Do not change colors without approval
- ❌ Do not use on cluttered backgrounds (maintain contrast)

---

## Color Palette

### Primary Colors
- **Lime**: `#b8ff3c` (primary CTA gradient start, highlights, active nav)
  - RGB: 184, 255, 60
  - Usage: Primary buttons (as gradient with Emerald), glow accents, hover states

- **Emerald**: `#00d68f` (primary CTA gradient end, secondary highlight)
  - RGB: 0, 214, 143
  - Usage: Primary buttons (as gradient with Lime), ambient background glow

- **Near-Black**: `#050505` (background)
  - RGB: 5, 5, 5
  - Usage: Primary background across every page

### Secondary Colors
- **Gold**: `#c9a227` (secondary accent, labels)
  - RGB: 201, 162, 39
  - Usage: Secondary labels, stats, ratings accents

### Neutral Colors
- **White**: `#ffffff` (primary text)
- **Muted**: `#8a8a8e` (secondary text, nav links, labels)
- **Border**: `rgba(255,255,255,0.10)`, **Border Bright**: `rgba(255,255,255,0.18)` (dividers, outlines)
- **Surface**: `rgba(255,255,255,0.04)`, **Glass**: `rgba(255,255,255,0.06)` (card/panel backgrounds)

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
