'use client';

import type { ReactNode } from 'react';

/** Shared visual primitives used across match/squad/tactics screens so the
 *  game reads as a pitch-and-player sim instead of stacked text lists. */

/** Full pitch markings (touchline, halfway line, centre circle, penalty
 *  boxes, arcs) as an absolutely-positioned inline SVG. Drop inside any
 *  container with `position: relative` — it fills the parent. */
export function PitchMarkings({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`fm-pitch-svg ${className}`}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <g fill="none" stroke="#ffffff" strokeOpacity="0.22" strokeWidth="0.5">
        <rect x="2" y="2" width="96" height="96" rx="1.5" />
        <line x1="2" y1="50" x2="98" y2="50" />
        <circle cx="50" cy="50" r="9" />
        <circle cx="50" cy="50" r="0.6" fill="#ffffff" fillOpacity="0.3" stroke="none" />
        {/* bottom (own) box */}
        <rect x="27" y="82" width="46" height="16" />
        <rect x="38" y="92" width="24" height="6" />
        <circle cx="50" cy="90" r="0.5" fill="#ffffff" fillOpacity="0.3" stroke="none" />
        <path d="M 40 82 A 9 9 0 0 0 60 82" />
        {/* top (attacking) box */}
        <rect x="27" y="2" width="46" height="16" />
        <rect x="38" y="2" width="24" height="6" />
        <circle cx="50" cy="10" r="0.5" fill="#ffffff" fillOpacity="0.3" stroke="none" />
        <path d="M 40 18 A 9 9 0 0 1 60 18" />
        {/* Goal frames: 7.32m of a ~68m pitch width is ~10.8% — a 10.8-wide
            rect straddling each end line at true relative scale, rather than
            a schematic notch. */}
        <rect x="44.6" y="0.6" width="10.8" height="1.4" />
        <rect x="44.6" y="98" width="10.8" height="1.4" />
      </g>
    </svg>
  );
}

const POS_COLOR: Record<string, string> = {
  GK: '#f5b301',
  DEF: '#7fb4ff',
  MID: '#2fd27a',
  FWD: '#f2667a',
};

/** Circular kit-style chip for a player slot: position-color ring, rating,
 *  short name, optional in-form arrow. */
export function PlayerToken({
  label,
  rating,
  name,
  pos,
  form,
  size = 40,
}: {
  label: string;
  rating?: number;
  name?: string;
  pos?: string;
  form?: number;
  size?: number;
}) {
  const ring = pos ? POS_COLOR[pos] ?? 'var(--border)' : 'var(--border)';
  const arrow = form == null ? null : form >= 1.03 ? '▲' : form <= 0.97 ? '▼' : null;
  return (
    <span className="fm-token" style={{ width: size, height: size, borderColor: ring }}>
      <span className="fm-token__val">{rating != null ? Math.round(rating) : label}</span>
      {arrow && <span className={`fm-token__form ${arrow === '▲' ? 'up' : 'down'}`}>{arrow}</span>}
      {name && <span className="fm-token__name">{name}</span>}
    </span>
  );
}

/** Five-band colour ramp for a 0-99 attribute. Mirrors the attribute chip
 *  tokens in globals.css. */
export function attrBand(val: number): string {
  if (val >= 85) return 'chip-vhigh';
  if (val >= 72) return 'chip-high';
  if (val >= 58) return 'chip-mid';
  if (val >= 45) return 'chip-low';
  return 'chip-bad';
}

/** CSS colour for a 1-5 fixture difficulty rating (5 = hardest). */
export function difficultyColor(rating: number): string {
  const clamped = Math.max(1, Math.min(5, Math.round(rating)));
  return clamped >= 5
    ? 'var(--diff-5)'
    : clamped === 4
      ? 'var(--diff-4)'
      : clamped === 3
        ? 'var(--diff-3)'
        : 'var(--diff-2)';
}

/** Compact PAC/SHO/PAS/DRI/DEF/PHY bar strip. */
export function AttrBars({
  pac,
  sho,
  pas,
  dri,
  def,
  phy,
}: {
  pac: number;
  sho: number;
  pas: number;
  dri: number;
  def: number;
  phy: number;
}) {
  const attrs: [string, number][] = [
    ['PAC', pac],
    ['SHO', sho],
    ['PAS', pas],
    ['DRI', dri],
    ['DEF', def],
    ['PHY', phy],
  ];
  return (
    <div className="fm-attr-grid">
      {attrs.map(([label, val]) => (
        <div className="fm-attr" key={label}>
          <span className="fm-attr__label">{label}</span>
          <div className="fm-bar">
            <div
              className={`fm-bar__fill ${attrBand(val)}`}
              style={{ width: `${Math.min(100, val)}%` }}
            />
          </div>
          <span className="fm-attr__val">{val}</span>
        </div>
      ))}
    </div>
  );
}

/** Icon + big number + tiny label — replaces a prose stat line. */
export function StatTile({ icon, value, label }: { icon: ReactNode; value: string | number; label: string }) {
  return (
    <div className="fm-stat-tile">
      <span className="fm-stat-tile__icon">{icon}</span>
      <span className="fm-stat-tile__val">{value}</span>
      <span className="fm-stat-tile__lbl">{label}</span>
    </div>
  );
}

/** Hex + alpha suffix, e.g. tint('#2fd27a', '22') -> '#2fd27a22'. Lets any
 *  club/kit color derive a tinted panel background/border without a
 *  color-math library. */
export function tint(hex: string, alpha: string): string {
  if (!hex || !hex.startsWith('#')) return hex;
  return `${hex}${alpha}`;
}

/** Club reputation as stars (gap 80), 1-5. Reputation is coarse by design
 *  (see `clubReputation` in engine/clubIdentity.ts) — five filled/empty stars
 *  is the right resolution for it, not a number that implies more precision
 *  than the underlying value actually has. */
export function ReputationStars({ value, title }: { value: number; title?: string }) {
  const stars = Math.max(0, Math.min(5, Math.round(value)));
  return (
    <span className="fm-rep-stars" title={title ?? `Reputation ${stars}/5`} aria-label={`Reputation ${stars} of 5 stars`}>
      {'★'.repeat(stars)}
      <span className="fm-rep-stars__empty">{'★'.repeat(5 - stars)}</span>
    </span>
  );
}

/** Readable text color (near-black or near-white) for text sitting directly
 *  on a club's color — the reference's `textOn`. Relative luminance via the
 *  standard sRGB coefficients, not a library, matching `tint`'s no-deps
 *  approach above. Used by the club-theming pass (gap 82) so `--brand-text`
 *  stays legible across every club's color, not just the game's own accent
 *  green. */
export function readableTextOn(hex: string): string {
  if (!hex || !hex.startsWith('#') || hex.length < 7) return '#04140d';
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.55 ? '#04140d' : '#f5f5f5';
}
