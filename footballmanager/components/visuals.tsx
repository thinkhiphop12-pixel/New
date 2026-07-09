'use client';

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
        <path d="M 40 82 A 9 9 0 0 0 60 82" />
        {/* top (attacking) box */}
        <rect x="27" y="2" width="46" height="16" />
        <rect x="38" y="2" width="24" height="6" />
        <path d="M 40 18 A 9 9 0 0 1 60 18" />
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
              className={`fm-bar__fill ${val >= 75 ? 'good' : val >= 55 ? 'mid' : 'bad'}`}
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
export function StatTile({ icon, value, label }: { icon: string; value: string | number; label: string }) {
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
