'use client';

import { clubBadgeUrl } from '@/lib/badges';
import { clubKit, hashName, kitLuminance } from '@/lib/clubColors';

/** Original club crests, drawn from each club's kit colours.
 *
 *  Nothing here reproduces a real badge, and it deliberately never will —
 *  crests are trademarked artwork. What a club actually gives us is its
 *  colours, which are not, so every crest is built from generic football
 *  heraldry (shields, roundels, bands, sashes, hoops) coloured from
 *  lib/clubColors.ts and picked deterministically from the club name.
 *
 *  The result: 490 clubs, all distinguishable, no artwork to license and
 *  none to draw. A club keeps the same crest forever because the choice is
 *  a hash of its name, not a random roll.
 */

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

/** Ink that stays legible on `bg` — the initials are the one element that
 *  must read at 16px, so this is never left to chance. */
function inkOn(bg: string): string {
  return kitLuminance(bg) > 0.55 ? '#12161c' : '#ffffff';
}

// Shield outline in a 100x110 viewBox. Everything else is clipped to it.
const SHIELD =
  'M50 3.3 L95 15.4 L95 55 C95 85.8 75 101.2 50 107.8 C25 101.2 5 85.8 5 55 L5 15.4 Z';

/** Five-point star, centred on (cx, cy). Used as a plain heraldic device —
 *  it carries no honours meaning, it just breaks up the plain templates. */
function starPath(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.42;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${(cx + Math.cos(a) * rad).toFixed(2)} ${(cy + Math.sin(a) * rad).toFixed(2)}`);
  }
  return `M${pts.join(' L')} Z`;
}

/** The eight crest templates. Index chosen by name hash, so it is stable. */
const TEMPLATE_COUNT = 8;

export function Crest({
  name,
  code,
  color,
  secondary,
  size = 40,
  className = '',
}: {
  /** Club name — drives the kit lookup, the template choice and the alt text. */
  name?: string;
  /** Up to 3 initials drawn on the crest. */
  code: string;
  /** Kit colour override. Omit to use the club's kit from lib/clubColors. */
  color?: string;
  /** Second kit colour override. */
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

  // The club's name is the source of truth for its colours, not the `color`
  // prop: an in-progress save carries whatever palette it was created under,
  // and a crest that changes colour between saves of the same club is worse
  // than one that ignores a caller's hint. The prop is the fallback for the
  // nameless cases (placeholder rows, unknown opponents).
  const kit = clubKit(name);
  const primary = name ? kit.primary : color?.startsWith('#') ? color : kit.primary;
  const accent = secondary ?? (name ? kit.secondary : shade(primary, 0.7));

  // A crest of two near-identical colours has no design left in it, so pull
  // the accent apart from the primary when the kit is effectively one colour.
  const flat = Math.abs(kitLuminance(primary) - kitLuminance(accent)) < 0.12;
  const trim = flat ? (kitLuminance(primary) > 0.55 ? shade(primary, -0.6) : shade(primary, 0.75)) : accent;

  const initials = (code || '').slice(0, 3).toUpperCase();
  const template = name ? hashName(name) % TEMPLATE_COUNT : 0;
  const clipId = `crest-clip-${template}`;

  // Where the initials sit, and on what — set per template below so the ink
  // is always chosen against the colour actually behind the letters.
  let field: React.ReactNode;
  let textY = 58;
  let behindText = primary;
  let device: React.ReactNode = null;

  switch (template) {
    case 0: // Plain shield with a heavy trim.
      field = <path d={SHIELD} fill={primary} />;
      device = <path d={starPath(50, 26, 9)} fill={trim} opacity="0.9" />;
      textY = 66;
      break;

    case 1: // Horizontal band across the middle.
      field = (
        <>
          <path d={SHIELD} fill={primary} />
          <rect x="0" y="40" width="100" height="30" fill={trim} clipPath={`url(#${clipId})`} />
        </>
      );
      behindText = trim;
      textY = 55;
      break;

    case 2: // Diagonal sash, shoulder to hip.
      field = (
        <>
          <path d={SHIELD} fill={primary} />
          <path
            d="M-10 78 L58 -10 L92 -10 L24 100 Z"
            fill={trim}
            clipPath={`url(#${clipId})`}
            opacity="0.95"
          />
        </>
      );
      textY = 66;
      break;

    case 3: // Vertical halves.
      field = (
        <>
          <path d={SHIELD} fill={primary} />
          <rect x="50" y="0" width="50" height="110" fill={trim} clipPath={`url(#${clipId})`} />
        </>
      );
      textY = 60;
      break;

    case 4: // Two hoops.
      field = (
        <>
          <path d={SHIELD} fill={primary} />
          <rect x="0" y="24" width="100" height="13" fill={trim} clipPath={`url(#${clipId})`} />
          <rect x="0" y="72" width="100" height="13" fill={trim} clipPath={`url(#${clipId})`} />
        </>
      );
      textY = 58;
      break;

    case 5: // Roundel: ring outside, disc inside.
      field = (
        <>
          <circle cx="50" cy="55" r="47" fill={trim} />
          <circle cx="50" cy="55" r="36" fill={primary} />
        </>
      );
      textY = 55;
      break;

    case 6: // Roundel with a band through it.
      field = (
        <>
          <circle cx="50" cy="55" r="47" fill={primary} />
          <path d="M3 42 H97 V68 H3 Z" fill={trim} clipPath="url(#crest-clip-circle)" />
          <circle cx="50" cy="55" r="47" fill="none" stroke={trim} strokeWidth="4" />
        </>
      );
      behindText = trim;
      textY = 55;
      break;

    default: // 7 — chevron shield.
      field = (
        <>
          <path d={SHIELD} fill={primary} />
          <path d="M50 34 L100 74 L100 92 L50 52 L0 92 L0 74 Z" fill={trim} clipPath={`url(#${clipId})`} />
        </>
      );
      textY = 34;
      break;
  }

  // Outline: keeps light kits (white, yellow, sky) from dissolving into the
  // panel behind them. Drawn last so nothing overlaps it.
  const outline = kitLuminance(primary) > 0.62 ? '#1c2129' : 'rgba(255,255,255,0.35)';
  const isRound = template === 5 || template === 6;

  return (
    <svg
      className={`fm-crest ${className}`}
      viewBox="0 0 100 110"
      width={size}
      height={size * 1.1}
      role="img"
      aria-label={name ? `${name} crest` : `${initials} crest`}
    >
      <defs>
        <clipPath id={clipId}>
          <path d={SHIELD} />
        </clipPath>
        <clipPath id="crest-clip-circle">
          <circle cx="50" cy="55" r="47" />
        </clipPath>
      </defs>

      {field}
      {device}

      {/* Halo, then fill. The halves/sash/chevron templates put two colours
          under the same word — without this the letters that land on the
          wrong side disappear (a white "SO" over a white half). Stroking
          under the fill costs nothing on the single-colour templates and
          makes every template safe at 16px. */}
      <text
        x="50"
        y={textY}
        textAnchor="middle"
        dominantBaseline="central"
        fill={inkOn(behindText)}
        stroke={inkOn(behindText) === '#ffffff' ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.75)'}
        strokeWidth="3.5"
        strokeLinejoin="round"
        paintOrder="stroke"
        fontSize="30"
        fontWeight="900"
        letterSpacing="-1"
      >
        {initials}
      </text>

      {isRound ? (
        <circle cx="50" cy="55" r="47" fill="none" stroke={outline} strokeWidth="3" />
      ) : (
        <path d={SHIELD} fill="none" stroke={outline} strokeWidth="3" />
      )}
    </svg>
  );
}
