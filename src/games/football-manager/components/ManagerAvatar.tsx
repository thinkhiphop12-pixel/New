'use client';

/** Manager avatar — a layered SVG portrait driven entirely by an explicit
 *  `AvatarConfig`. Every part comes from the catalog in `avatarParts.tsx`, so
 *  the creator screen and this renderer can never drift out of sync about
 *  which variants exist.
 *
 *  Self-contained inline SVG (no network fetch, no shared element ids), so it
 *  can be canvas-rendered for PNG export and safely rendered many times at
 *  once at any size. */

import type { CSSProperties } from 'react';
import type { AvatarConfig } from '@/engine/types';
import { Accessory, Attire, Eyebrows, Eyes, FacialHair, Hair, Mouth } from './avatarParts';

/** Option values are stored as bare hex (`c1ad60`) but SVG `fill`/`stroke`
 *  need `#c1ad60` — a bare value is invalid and silently renders black.
 *  Passes through anything already prefixed or a CSS `var(...)` untouched. */
function cssColor(value: string): string {
  if (!value) return 'none';
  if (value.startsWith('#') || value.startsWith('var(')) return value;
  return `#${value}`;
}

/** Darken (or lighten, with a negative `amount`) a hex colour for the paired
 *  shadow tone — shading that stays correct across every skin tone instead of
 *  a single flat fill. */
export function shadeColor(hex: string, amount = 0.18): string {
  const h = hex.replace('#', '');
  const num = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  if (Number.isNaN(num)) return hex;
  const r = Math.max(0, Math.min(255, Math.round(((num >> 16) & 0xff) * (1 - amount))));
  const g = Math.max(0, Math.min(255, Math.round(((num >> 8) & 0xff) * (1 - amount))));
  const b = Math.max(0, Math.min(255, Math.round((num & 0xff) * (1 - amount))));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export type CompactAvatarProps = {
  config: AvatarConfig;
  size?: number;
  className?: string;
  title?: string;
  style?: CSSProperties;
  /** Draws the rounded backdrop disc behind the portrait. Off for the large
   *  framed preview, where the frame itself provides the background. */
  backdrop?: boolean;
};

export default function ManagerAvatar({
  config,
  size = 40,
  className = '',
  title,
  style,
  backdrop = true,
}: CompactAvatarProps) {
  const skinTone = cssColor(config.skinTone);
  const skinShadow = cssColor(config.skinShadow || shadeColor(cssColor(config.skinTone)));
  const hairColor = cssColor(config.hairColor);
  const hairShadow = shadeColor(hairColor, 0.25);
  const eyeColor = cssColor(config.eyeColor);
  const eyebrowColor = cssColor(config.eyebrowColor || shadeColor(cssColor(config.hairColor), 0.1));
  const mouthColor = cssColor(config.mouthColor || '#a85751');
  const accessoryColor = cssColor(config.accessoryColor || '#2b3445');
  const suitColor = config.suitColor ? cssColor(config.suitColor) : 'var(--panel-2)';
  const suitShadow = config.suitColor ? shadeColor(cssColor(config.suitColor), 0.3) : 'var(--panel-3)';
  // `accessories` is stored as an array for backwards compatibility, but only
  // one accessory is ever selectable.
  const accessory = config.accessories?.[0] ?? '';

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
      {backdrop && <circle cx="50" cy="50" r="50" fill="var(--panel-3)" />}

      {/* neck, tucked behind the outfit so the collar reads on top */}
      <path d="M43 70 L57 70 L57 84 L43 84 Z" fill={skinShadow} />

      <Attire style={config.attire ?? 'suittie'} color={suitColor} shadow={suitShadow} />

      {/* ears sit behind the head so only the outer curve shows */}
      <circle cx="18" cy="57" r="6" fill={skinShadow} />
      <circle cx="82" cy="57" r="6" fill={skinShadow} />

      {/* head, two-tone: flat fill plus a shadow wedge on the right so the
          face reads with volume at every skin tone */}
      <circle cx="50" cy="54" r="31" fill={skinTone} />
      <path d="M50 23 A31 31 0 0 1 81 54 A31 31 0 0 1 65 81 A37 37 0 0 0 50 23 Z" fill={skinShadow} opacity="0.5" />

      <FacialHair style={config.facialHair} color={hairColor} />
      <Eyebrows style={config.eyebrows ?? 'default'} color={eyebrowColor} />
      <Eyes style={config.eyes || 'default'} color={eyeColor} />
      <Mouth style={config.mouth || 'default'} color={mouthColor} />
      <Hair style={config.hairStyle} color={hairColor} shadow={hairShadow} />
      <Accessory style={accessory} color={accessoryColor} />
    </svg>
  );
}
