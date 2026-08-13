'use client';

import type { ReactNode } from 'react';
import type { GameState } from '@/engine/types';
import { leagueFixtures } from '@/engine/seasonProgression';
import { contrastRatio } from '@/lib/brandTheme';

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

/** The same five-band ramp as `attrBand`, as a raw colour rather than a class
 *  name — feeds `.fm-ring`'s `--ring-color` so a rating ring reads on exactly
 *  the same scale as the attribute bars beside it. */
export function ratingRingColor(val: number): string {
  if (val >= 85) return 'var(--chip-vhigh)';
  if (val >= 72) return 'var(--chip-high)';
  if (val >= 58) return 'var(--chip-mid)';
  if (val >= 45) return 'var(--chip-low)';
  return 'var(--chip-bad)';
}

/** Two-letter monogram for a player's avatar: first and last initial. */
export function initials(name: string): string {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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
 *  on a club's color — the reference's `textOn`.
 *
 *  This used to average the raw sRGB channels and cut at 0.55, which is
 *  neither the gamma-corrected luminance WCAG defines nor a contrast test;
 *  it handed white ink to plenty of colours white does not read on. It now
 *  measures both candidate inks and returns whichever actually wins, using
 *  the shared helpers in lib/brandTheme.
 *
 *  Where the *fill* is ours to adjust too — the club-theme chrome — prefer
 *  `brandTheme()`, which guarantees a ratio rather than just picking the
 *  better of two losing options. */
export function readableTextOn(hex: string): string {
  if (!hex || !hex.startsWith('#') || hex.length < 7) return '#04140d';
  return contrastRatio('#04140d', hex) >= contrastRatio('#f5f5f5', hex) ? '#04140d' : '#f5f5f5';
}

/** Horizontal progress bar with label and numeric value. */
export function Bar({ value, label }: { value: number; label: string }) {
  const tone = value >= 65 ? 'good' : value >= 35 ? 'mid' : 'bad';
  return (
    <div className="fm-bar-row">
      <span className="fm-bar-row__label">{label}</span>
      <div className="fm-bar">
        <div className={`fm-bar__fill ${tone}`} style={{ width: `${value}%` }} />
      </div>
      <span className="fm-bar-row__value">{value}</span>
    </div>
  );
}

/** English ordinal suffix (th, st, nd, rd) for a given number. */
export function ordinalSuffix(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return 'th';
  return ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
}

export type FormResult = 'W' | 'D' | 'L';

/**
 * Last `count` league results for any club, newest last.
 *
 * Derived from played fixtures in that club's *own* league rather than the
 * user's, so a match preview can show both sides' form even when the
 * opponent sits in a different division. The engine stores no running form
 * string per club, so this is recomputed on demand the same way
 * `TableScreen` does it.
 */
export function clubForm(state: GameState, clubId: number, count = 5): FormResult[] {
  const club = state.clubs.find((c) => c.id === clubId);
  if (!club) return [];
  return leagueFixtures(state, club.leagueId)
    .filter((f) => f.played && (f.homeId === clubId || f.awayId === clubId))
    .sort((a, b) => a.round - b.round)
    .slice(-count)
    .map((f) => {
      const isHome = f.homeId === clubId;
      const gf = isHome ? f.homeGoals : f.awayGoals;
      const ga = isHome ? f.awayGoals : f.homeGoals;
      return gf > ga ? 'W' : gf < ga ? 'L' : 'D';
    });
}

/** One W/D/L chip in a recent-form strip (Phase 4's `.fm-form-chip`). */
export function FormChip({ result }: { result: FormResult }) {
  return <span className={`fm-form-chip fm-form-chip--${result.toLowerCase()}`}>{result}</span>;
}

/* --------------------------------------------------------- plain grades */

/**
 * A 0-99 quality figure as stars and a word.
 *
 * `Q40` / `Q60` / `Q80` were the whole vocabulary of the Staff screen, and
 * they only mean anything once you've seen all three — there's nothing on
 * the card that says whether 60 is good. Stars carry the scale on their
 * face (four of five is obviously better than two) and the word says the
 * rest, so the number stops being the thing you have to decode.
 */
export function qualityGrade(quality: number): { stars: number; word: string } {
  if (quality >= 80) return { stars: 5, word: 'Top class' };
  if (quality >= 65) return { stars: 4, word: 'Very good' };
  if (quality >= 50) return { stars: 3, word: 'Solid' };
  if (quality >= 35) return { stars: 2, word: 'Decent' };
  return { stars: 1, word: 'Learning' };
}

/** Stars + word for a coach's quality. The raw number stays as the tooltip
 *  rather than on screen — it's still there for anyone who wants it. */
export function QualityRating({ quality, className = '' }: { quality: number; className?: string }) {
  const { stars, word } = qualityGrade(quality);
  return (
    <span className={`fm-grade ${className}`} title={`Quality ${quality}/99`}>
      <ReputationStars value={stars} title={`${word} — ${stars} of 5`} />
      <span className="fm-grade__word">{word}</span>
    </span>
  );
}
