'use client';

/** Manager avatar — a hand-customised counterpart to the procedural
 *  `PlayerFace`. Shares the same head/shoulders silhouette primitives so the
 *  two read as one visual family, but every layer here is driven by an
 *  explicit `AvatarConfig` rather than derived from a player id.
 *
 *  Rendered as a single self-contained inline SVG (no network fetch), so it
 *  can be canvas-rendered for PNG export and reused anywhere at any size. */

import type { CSSProperties } from 'react';
import type { AvatarConfig } from '@/engine/types';

/** Darken a `#rrggbb`/`rrggbb` colour by `amount` (0–1) for the paired
 *  shadow tone — the "one real idea" from the reference: shading that stays
 *  correct across every skin tone instead of a single flat fill. */
export function shadeColor(hex: string, amount = 0.18): string {
  const h = hex.replace('#', '');
  const num = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  if (Number.isNaN(num)) return hex;
  const r = Math.max(0, Math.round(((num >> 16) & 0xff) * (1 - amount)));
  const g = Math.max(0, Math.round(((num >> 8) & 0xff) * (1 - amount)));
  const b = Math.max(0, Math.round((num & 0xff) * (1 - amount)));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/** The five hairstyles, drawn over a head centred at (50,55) with r=34 —
 *  same head geometry as `PlayerFace`'s `Hair`, keyed by name instead of a
 *  seeded index so the customizer can pick one explicitly. */
function Hair({ style, color }: { style: string; color: string }) {
  switch (style) {
    case 'short01': // short crop
      return <path d="M16 52 A34 34 0 0 1 84 52 L84 44 A34 30 0 0 0 16 44 Z" fill={color} />;
    case 'buzz': // buzz cut
      return <path d="M18 48 A32 32 0 0 1 82 48 L82 42 A32 26 0 0 0 18 42 Z" fill={color} />;
    case 'curly01': // curly / afro
      return (
        <g fill={color}>
          <circle cx="50" cy="34" r="26" />
          <circle cx="26" cy="46" r="13" />
          <circle cx="74" cy="46" r="13" />
        </g>
      );
    case 'long01': // long, with side panels
      return (
        <g fill={color}>
          <path d="M16 52 A34 34 0 0 1 84 52 L84 42 A34 30 0 0 0 16 42 Z" />
          <path d="M16 50 L16 74 Q21 78 24 70 L24 50 Z" />
          <path d="M84 50 L84 74 Q79 78 76 70 L76 50 Z" />
        </g>
      );
    case 'straight01': // wavy medium
      return (
        <g fill={color}>
          <path d="M17 50 A33 33 0 0 1 83 50 L83 40 A33 28 0 0 0 17 40 Z" />
          <path d="M17 48 Q14 60 19 68 L23 66 Q18 58 21 48 Z" />
          <path d="M83 48 Q86 60 81 68 L77 66 Q82 58 79 48 Z" />
        </g>
      );
    default: // bald
      return null;
  }
}

function FacialHair({ style, color }: { style: string; color: string }) {
  if (!style) return null;
  if (style === 'beardMajestic') {
    return <path d="M20 56 A30 34 0 0 0 80 56 A30 28 0 0 1 20 56 Z" fill={color} opacity="0.9" />;
  }
  if (style === 'beardLight') {
    return <path d="M32 70 Q50 82 68 70 L66 62 Q50 72 34 62 Z" fill={color} opacity="0.9" />;
  }
  if (style === 'moustache') {
    return <path d="M38 66 Q50 62 62 66 Q50 70 38 66 Z" fill={color} opacity="0.9" />;
  }
  return null;
}

export type CompactAvatarProps = {
  config: AvatarConfig;
  size?: number;
  className?: string;
  title?: string;
  style?: CSSProperties;
};

/** Renders the avatar SVG. Self-contained per instance (no shared ids), so
 *  it's safe to render several at once (dugout + header, say). */
export default function ManagerAvatar({ config, size = 40, className = '', title, style }: CompactAvatarProps) {
  const skinShadow = config.skinShadow || shadeColor(config.skinTone);
  const eyebrowColor = config.eyebrowColor || shadeColor(config.hairColor, -0.1);
  const hasGlasses = (config.accessories ?? []).includes('glasses');

  return (
    <svg
      className={`fm-manager-avatar ${className}`}
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={title ?? 'Manager avatar'}
      style={style}
    >
      <circle cx="50" cy="50" r="50" fill="var(--panel-3)" />
      {/* shoulders / suit */}
      <path d="M10 100 Q50 66 90 100 Z" fill={config.suitColor ?? 'var(--panel-2)'} />
      {/* neck + head, two-tone: primary fill with a shadow wedge on the
          right so the face reads with volume at every skin tone */}
      <circle cx="50" cy="55" r="34" fill={config.skinTone} />
      <path d="M50 21 A34 34 0 0 1 84 55 A34 34 0 0 1 66 85 A40 40 0 0 0 50 21 Z" fill={skinShadow} opacity="0.55" />
      <FacialHair style={config.facialHair} color={config.hairColor} />
      <Hair style={config.hairStyle} color={config.hairColor} />
      {/* eyebrows — independent colour axis from hair */}
      <path d="M34 48 Q39 45 44 48" stroke={eyebrowColor} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M56 48 Q61 45 66 48" stroke={eyebrowColor} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      {/* eyes */}
      <circle cx="39" cy="56" r="3.2" fill={config.eyeColor} />
      <circle cx="61" cy="56" r="3.2" fill={config.eyeColor} />
      {hasGlasses && (
        <g stroke="#20242c" strokeWidth="2" fill="none" opacity="0.85">
          <circle cx="39" cy="56" r="7" />
          <circle cx="61" cy="56" r="7" />
          <path d="M46 56 L54 56" />
        </g>
      )}
      {/* mouth */}
      <path d="M42 68 Q50 72 58 68" stroke="#5a3a2a" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}
