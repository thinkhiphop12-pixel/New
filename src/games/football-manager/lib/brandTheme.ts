/**
 * Club-brand chrome, derived so the text on it is always readable.
 *
 * The theming contract (globals.css `:root`) lets a club's colour repaint
 * three things: the rail's active state, active tab pills, and primary
 * buttons. Two separate faults made the text on the last of those
 * unreadable for most of the league:
 *
 *  1. `--brand-gradient` and `--brand-dim` were declared on `:root` in terms
 *     of `var(--brand)`. A custom property whose value contains `var()` is
 *     substituted where it is *declared*, not where it is used — so both
 *     resolved against `:root`'s default lime and never saw the per-club
 *     `--brand` set inline on `.fm-app` further down the tree. Every club
 *     got the same lime button. (Fixed in globals.css by re-declaring both
 *     on `.fm-app`, the element the override actually lands on.)
 *  2. The ink *did* track the club colour, and picked it from a raw-sRGB
 *     luminance average against a 0.55 cut-off — neither the gamma-corrected
 *     luminance WCAG defines nor a contrast test. So a dark club colour asked
 *     for white ink, which then landed on the lime fill from (1): white on
 *     #b8ff3c is 1.4:1, i.e. invisible. That is the "white text" bug.
 *
 * Rather than pick an ink and hope, this derives fill and ink together and
 * checks the result: whichever ink is chosen is guaranteed ≥ `TARGET`
 * against *both* ends of the gradient, darkening the fill by a few percent
 * in the handful of mid-tone cases (saturated reds and blues) where neither
 * near-black nor near-white clears the bar on the club's colour as-is.
 */

/** WCAG AA for normal-size text. Buttons here are 14px bold — under the
 *  18.66px the large-text 3:1 allowance starts at, so 4.5 is the right bar. */
const TARGET = 4.5;

/** The two inks. Both already in use elsewhere in the theme — the near-black
 *  is the same one every green-filled surface uses, so a club with a light
 *  kit reads consistently with the game's own accent. */
const DARK_INK = '#04140d';
const LIGHT_INK = '#f5f5f5';

/** The dark surface brand-coloured *text* (not fills) sits on. */
const PANEL = '#0a0b0d';

function channel(hex: string, i: number): number {
  return parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16);
}

function toHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
}

/** sRGB → linear, the gamma step the old `readableTextOn` skipped. */
function linearize(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex: string): number {
  return (
    0.2126 * linearize(channel(hex, 0)) +
    0.7152 * linearize(channel(hex, 1)) +
    0.0722 * linearize(channel(hex, 2))
  );
}

/** WCAG contrast ratio, 1:1 (identical) to 21:1 (black on white). */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Blend `hex` toward white (`amount > 0`) or black (`amount < 0`) by a
 *  fraction of the remaining distance. Stays in-hue, which is the point —
 *  the old gradient mixed every brand toward a fixed green, which turned
 *  Arsenal's red into brown before anyone got to the contrast question. */
function shade(hex: string, amount: number): string {
  const target = amount > 0 ? 255 : 0;
  const k = Math.abs(amount);
  return toHex(
    channel(hex, 0) + (target - channel(hex, 0)) * k,
    channel(hex, 1) + (target - channel(hex, 1)) * k,
    channel(hex, 2) + (target - channel(hex, 2)) * k,
  );
}

function isHex(v: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(v);
}

export interface BrandTheme {
  /** Fill for brand-coloured surfaces — the club's colour, darkened only if
   *  no ink clears `TARGET` on it untouched. */
  brand: string;
  /** Far stop of the brand gradient, same hue as `brand`. */
  brandEnd: string;
  /** Text/icon colour for anything sitting on `brand`…`brandEnd`. */
  ink: string;
  /** The brand used as *text* on a dark panel — lightened until legible, so
   *  a black-kitted club doesn't paint invisible icons. */
  onDark: string;
}

/** The untinted defaults, matching `:root` in globals.css. */
export const DEFAULT_BRAND_THEME: BrandTheme = {
  brand: '#b8ff3c',
  brandEnd: '#82ec5f',
  ink: DARK_INK,
  onDark: '#b8ff3c',
};

export function brandTheme(hex: string): BrandTheme {
  if (!isHex(hex)) return DEFAULT_BRAND_THEME;

  let brand = hex;
  let ink: string;

  if (contrastRatio(DARK_INK, brand) >= TARGET) {
    // Light kit — near-black reads on it as-is.
    ink = DARK_INK;
  } else {
    // Everything else takes the white ink, deepening the fill in 2% steps
    // until it clears the bar. In practice this is 0 for most clubs and
    // never more than ~10% — a shade of the same red, not a different red.
    ink = LIGHT_INK;
    for (let i = 0; i < 40 && contrastRatio(ink, brand) < TARGET; i++) {
      brand = shade(hex, -0.02 * (i + 1));
    }
  }

  // Prefer a gradient that deepens (the FM-kit look). Only reach for a
  // lighter far stop when deepening would push the chosen ink under the bar,
  // which happens for light kits carrying the near-black ink.
  const deeper = shade(brand, -0.14);
  const lighter = shade(brand, 0.2);
  const brandEnd = contrastRatio(ink, deeper) >= TARGET
    ? deeper
    : contrastRatio(ink, lighter) >= TARGET
      ? lighter
      : brand;

  // Brand-as-text on the dark panel: lighten until legible there too.
  let onDark = hex;
  for (let i = 0; i < 40 && contrastRatio(onDark, PANEL) < TARGET; i++) {
    onDark = shade(hex, 0.03 * (i + 1));
  }

  return { brand, brandEnd, ink, onDark };
}
