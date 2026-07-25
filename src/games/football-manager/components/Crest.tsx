'use client';

import { clubBadgeUrl } from '@/lib/badges';

/** Gold-trimmed shield crest drawn from a club's kit colour and initials.
 *
 *  Every club gets a badge this way — no artwork required. Where real crest
 *  artwork exists (see lib/badges.ts) it is used instead. */

/** Shift a #rrggbb hex toward black (amount < 0) or white (amount > 0). */
function shade(hex: string, amount: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const mix = (c: number) =>
    Math.round(amount >= 0 ? c + (255 - c) * amount : c * (1 + amount));
  const r = mix((n >> 16) & 0xff);
  const g = mix((n >> 8) & 0xff);
  const b = mix(n & 0xff);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/** Relative luminance (0 = black, 1 = white) of a #rrggbb hex. */
function luminance(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 0;
  const n = parseInt(m[1], 16);
  const srgb = [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

// Shield outline and inner accent stripe, in a 100x110 viewBox.
const SHIELD =
  'M50 3.3 L95 15.4 L95 55 C95 85.8 75 101.2 50 107.8 C25 101.2 5 85.8 5 55 L5 15.4 Z';
const STRIPE =
  'M50 15.4 L80 24.2 L80 55 C80 74.8 66 85.8 50 92.4 C34 85.8 20 74.8 20 55 L20 24.2 Z';

export function Crest({
  name,
  code,
  color,
  secondary,
  size = 40,
  className = '',
}: {
  /** Club name — used to look up real crest artwork and for the alt text. */
  name?: string;
  /** Up to 3 initials drawn on the shield. */
  code: string;
  /** Club kit colour, #rrggbb. */
  color: string;
  /** Optional second kit colour; derived from `color` when omitted. */
  secondary?: string;
  size?: number;
  className?: string;
}) {
  const art = clubBadgeUrl(name);
  if (art) {
    return (
      <img
        src={art}
        alt={name ? `${name} crest` : 'Club crest'}
        className={`fm-crest ${className}`}
        width={size}
        height={size}
        loading="lazy"
      />
    );
  }

  const accent = secondary ?? shade(color, 0.45);
  const initials = (code || '').slice(0, 3).toUpperCase();
  // Gold reads well on the dark kits most clubs use, but disappears on light
  // ones (sky blue, white, yellow) — drop to near-black ink there.
  const light = luminance(color) > 0.42;
  const ink = light ? '#141414' : 'var(--gold)';
  const trim = light ? shade(color, -0.55) : 'var(--gold)';

  return (
    <svg
      className={`fm-crest ${className}`}
      viewBox="0 0 100 110"
      width={size}
      height={size * 1.1}
      role="img"
      aria-label={name ? `${name} crest` : `${initials} crest`}
    >
      <path d={SHIELD} fill={color} />
      <path d={STRIPE} fill={accent} fillOpacity="0.22" />
      <path d={SHIELD} fill="none" stroke={trim} strokeWidth="5" />
      <text
        x="50"
        y="58"
        textAnchor="middle"
        dominantBaseline="central"
        fill={ink}
        fontSize="30"
        fontWeight="900"
        letterSpacing="-1"
      >
        {initials}
      </text>
    </svg>
  );
}
