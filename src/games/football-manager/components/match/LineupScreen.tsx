'use client';

import type { Club, Player } from '@/engine/types';
import { getFormation } from '@/engine/gameRules';
import { matchKits } from '@/lib/clubColors';

function lastName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1];
}

function shade(hex: string, amt: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const f = (v: number) => Math.min(255, Math.max(0, Math.round(v + amt)));
  const r = f((n >> 16) & 255);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function Shirt({ color, gk, num }: { color: string; gk?: boolean; num: number }) {
  const body = gk ? '#1fa055' : color;
  const sleeve = gk ? '#178244' : shade(color, -36);
  const numColor = (() => {
    const m = /^#?([0-9a-f]{6})$/i.exec(body);
    if (!m) return '#fff';
    const n = parseInt(m[1], 16);
    const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
    return lum > 0.6 ? '#20337a' : '#ffffff';
  })();
  return (
    <svg className="fm-ko__shirt" viewBox="0 0 44 40" aria-hidden>
      <path d="M13 3 L2 9 L6 18 L11 15 L11 38 L33 38 L33 15 L38 18 L42 9 L31 3 L27 3 A5 5 0 0 1 17 3 Z" fill={body} stroke="rgba(0,0,0,0.35)" strokeWidth="1" />
      <path d="M13 3 L2 9 L6 18 L11 15 L11 8 Z" fill={sleeve} opacity="0.9" />
      <path d="M31 3 L42 9 L38 18 L33 15 L33 8 Z" fill={sleeve} opacity="0.9" />
      <path d="M17 3 A5 5 0 0 0 27 3 L25.5 2 A3.5 3.5 0 0 1 18.5 2 Z" fill={sleeve} />
      <text x="22" y="26" textAnchor="middle" fontSize="15" fontWeight="800" fill={numColor} fontFamily="Oswald, sans-serif">
        {num}
      </text>
    </svg>
  );
}

/**
 * Pre-kick-off team sheet: both XIs laid out by formation as kit shirts on a
 * purple-tinted pitch, FM Mobile style.
 */
export default function LineupScreen({
  homeClub,
  awayClub,
  homeLineup,
  awayLineup,
  homeFormationId,
  awayFormationId,
  players,
  captainId,
}: {
  homeClub: Club | undefined;
  awayClub: Club | undefined;
  homeLineup: (number | null)[];
  awayLineup: (number | null)[];
  homeFormationId: string;
  awayFormationId: string;
  players: Record<number, Player>;
  captainId?: number | null;
}) {
  // Shirt colours resolved as a pair so the team sheet shows the same change
  // strip the match itself will use.
  const kits = matchKits(homeClub?.name, awayClub?.name);
  const side = (
    shirtColor: string,
    lineup: (number | null)[],
    formationId: string,
    mirror: boolean
  ) => {
    const formation = getFormation(formationId);
    return formation.slots.map((slot, i) => {
      const id = lineup[i];
      if (id === null || id === undefined) return null;
      const p = players[id];
      if (!p) return null;
      const gk = slot.pos === 'GK';
      const along = gk ? 4.5 : 7 + (slot.y / 100) * 40;
      const left = mirror ? 100 - along : along;
      const top = 9 + ((mirror ? 100 - slot.x : slot.x) / 100) * 82;
      return (
        <div key={`${mirror ? 'a' : 'h'}${i}`} className="fm-ko__player" style={{ left: `${left}%`, top: `${top}%` }}>
          {/* The player's real shirt number; falls back to the formation slot
              index only for a pre-v7 save not yet numbered by the week tick. */}
          <Shirt color={shirtColor} gk={gk} num={p.squadNumber ?? i + 1} />
          <span className="fm-ko__name">
            {lastName(p.name)}
            {captainId != null && p.id === captainId ? ' (c)' : ''}
          </span>
        </div>
      );
    });
  };

  return (
    <div className="fm-ko">
      <div className="fm-ko__pitch">
        <svg className="fm-ko__lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          <rect x="1" y="1" width="98" height="98" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.4" />
          <line x1="50" y1="1" x2="50" y2="99" stroke="rgba(255,255,255,0.45)" strokeWidth="0.4" />
          <circle cx="50" cy="50" r="12" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.4" />
          <rect x="1" y="24" width="13" height="52" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.4" />
          <rect x="86" y="24" width="13" height="52" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.4" />
          <rect x="1" y="37" width="4.5" height="26" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.4" />
          <rect x="94.5" y="37" width="4.5" height="26" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.4" />
        </svg>
        {side(kits.home, homeLineup, homeFormationId, false)}
        {side(kits.away, awayLineup, awayFormationId, true)}
      </div>
    </div>
  );
}
