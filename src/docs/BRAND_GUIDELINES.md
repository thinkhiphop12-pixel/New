# Ball Knowledge Brand Guidelines

## Brand Identity

**Ball Knowledge** is a free hub of football knowledge games — building World Cup teams, identifying players, simulating tournaments, and managing clubs, all in the browser.

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
- **Accent Green**: `#00ff88` (games, CTAs, active states)
  - RGB: 0, 255, 136
  - HSL: 134°, 100%, 50%
  - Usage: Primary buttons, highlights, active navigation

- **Dark Navy**: `#0a0e14` (background)
  - RGB: 10, 14, 20
  - HSL: 215°, 33%, 6%
  - Usage: Primary background, safe contrast base

### Secondary Colors
- **Gold**: `#ffd700` (secondary action, labels, accents)
  - RGB: 255, 215, 0
  - HSL: 51°, 100%, 50%
  - Usage: Secondary buttons, stats labels, team ratings

- **Cyan**: `#4488ff` (tertiary action, UI elements)
  - RGB: 68, 136, 255
  - HSL: 217°, 100%, 63%
  - Usage: Links, secondary accents, UI borders

### Neutral Colors
- **Light Text**: `#e8e8e8` (primary text)
- **Dim Text**: `#8892a0` (secondary text, labels)
- **Border Color**: `#5a7a94` (UI dividers, outlines)

### Status Colors
- **Danger**: `#ff4444` (errors, losses, critical states)
- **Warning**: `#ffaa00` (cautions, injuries)
- **Success**: `#00cc66` (wins, completions)

---

## Typography

### Primary Font: System Stack
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
```
- **Sans-serif only**, modern and clean
- **No serifs** (retro aesthetic is minimal/highlights only)
- **System fonts** for performance (no external font downloads)

### Font Sizes & Weights
- **Headline**: 24–32px, 700 weight
- **Subheading**: 16–18px, 600 weight
- **Body**: 13–14px, 400 weight
- **Small/Label**: 11–12px, 600 weight (uppercase)
- **Monospace (code)**: `Courier New`, monospace

### Retro Accents (Limited Use)
- **"Press Start 2P"** (Google Fonts): Used ONLY for game titles and special brand moments
  - Ball Knowledge wordmark on logo
  - Game names (7-0-0, Boardroom, etc.)
  - No body text — readability first

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
- Size: 1200×628px (Open Graph standard)
- **Layout**: Dark background + logo mark + headline + URL footer
- **Font**: System font for body, retro accent for headline
- **Example**: "Play 7-0-0 · Draft World Cup XI · Free, no account | ballknw.com"

---

## Use Cases & Examples

### Dark Backgrounds (Primary)
- Dark navy (`#0a0e14`) + Accent green text/buttons
- All games use this theme
- Logo mark in white or inverted color

### Light Backgrounds (Rare)
- Use only on marketing pages or external sites
- Logo mark in dark navy or accent green
- Green accent becomes secondary; maintain contrast

### Print (Unlikely)
- Logo mark in black or brand green
- Wordmark in black + sans-serif font
- Minimum 1-inch width for reproduction quality

---

## File Inventory

### Logo Files (SVG, PNG, ICO)
- `assets/logo-mark.svg` (primary)
- `assets/logo-mark-inverted.svg` (white)
- `assets/logo-mark-mono.svg` (single color)
- `assets/logo-horizontal.svg` (mark + wordmark)
- `assets/logo-vertical.svg` (stacked)
- `assets/favicon.ico` (32×32 + 16×16)
- `assets/favicon-192.png` (app icon)
- `assets/apple-touch-icon.png` (iOS)

### Social Assets (PNG)
- `assets/social-twitter.png` (400×400)
- `assets/social-og-image.png` (1200×628 Open Graph)
- `assets/social-discord.png` (512×512)

### Brand Documents
- `BRAND_GUIDELINES.md` (this file)
- `COLOR_PALETTE.css` (CSS variables)

---

## Brand Voice & Tone

### Tone
- **Smart**: Know what you're talking about
- **Fast**: Get to the point, no fluff
- **Playful**: Games are fun, but competitive
- **Direct**: Clear CTAs, no marketing speak

### Language
- **Game titles**: Short, punchy (7-0-0, Boardroom, Lineup, Bracket, Dynasty)
- **Descriptions**: One sentence per game, features in second sentence
- **Error messages**: Helpful, not condescending ("Select 11 players, not 10")
- **Success messages**: Affirming, not cheesy ("Squad saved" not "You did it! 🎉")

---

## Migration Checklist (for implementation)

- [ ] Replace logo mark with new SVG in assets/
- [ ] Update favicon.ico and favicon-192.png
- [ ] Add favicon-new.png at 192×192 (iOS standard)
- [ ] Create social media assets (Twitter, LinkedIn, Discord)
- [ ] Update homepage hero section with new branding
- [ ] Test logo on all game pages
- [ ] Verify accessibility (contrast, color blindness)
- [ ] Update Open Graph images on all pages
- [ ] Test on light and dark backgrounds
- [ ] Update brand colors in CSS variables if needed
- [ ] Create brand assets folder structure

---

**Last Updated**: June 26, 2026

**Next Review**: After initial user feedback on new branding

**Contact**: thinkhiphop12@gmail.com for brand inquiries
