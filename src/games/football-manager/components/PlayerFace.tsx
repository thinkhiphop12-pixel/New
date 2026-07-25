'use client';

/** Deterministic procedural player avatar drawn from the player id.
 *
 *  The same id always yields the same face, so squads stay visually stable
 *  across sessions and saves without shipping a single portrait asset. */

const SKIN_TONES = ['#ffe0bd', '#f1c27d', '#e0ac69', '#c68642', '#8d5524'];
const HAIR_COLORS = ['#2c1b18', '#3b2417', '#6a4e35', '#b89778', '#1a1a1a'];

/** mulberry32 — small, fast, well-distributed for this. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type FaceSpec = {
  skinTone: string;
  hairColor: string;
  hairStyle: number;
  hasBeard: boolean;
};

export function faceSpecFor(playerId: number): FaceSpec {
  // Knuth multiplicative hash, matching the mobile generator's seeding.
  const next = rng(Math.imul(playerId, 2654435761));
  return {
    skinTone: SKIN_TONES[Math.floor(next() * SKIN_TONES.length)],
    hairColor: HAIR_COLORS[Math.floor(next() * HAIR_COLORS.length)],
    hairStyle: Math.floor(next() * 5),
    hasBeard: next() < 0.45,
  };
}

/** The five hair styles, drawn over a head centred at (50,55) with r=34. */
function Hair({ style, color }: { style: number; color: string }) {
  switch (style) {
    case 0: // short crop
      return <path d="M16 52 A34 34 0 0 1 84 52 L84 44 A34 30 0 0 0 16 44 Z" fill={color} />;
    case 1: // buzz cut
      return <path d="M18 48 A32 32 0 0 1 82 48 L82 42 A32 26 0 0 0 18 42 Z" fill={color} />;
    case 2: // curly / afro
      return (
        <g fill={color}>
          <circle cx="50" cy="34" r="26" />
          <circle cx="26" cy="46" r="13" />
          <circle cx="74" cy="46" r="13" />
        </g>
      );
    case 3: // longer, with side panels
      return (
        <g fill={color}>
          <path d="M16 52 A34 34 0 0 1 84 52 L84 42 A34 30 0 0 0 16 42 Z" />
          <path d="M16 50 L16 74 Q21 78 24 70 L24 50 Z" />
          <path d="M84 50 L84 74 Q79 78 76 70 L76 50 Z" />
        </g>
      );
    default: // bald
      return null;
  }
}

export function PlayerFace({
  playerId,
  size = 40,
  className = '',
}: {
  playerId: number;
  size?: number;
  className?: string;
}) {
  const spec = faceSpecFor(playerId);
  return (
    <svg
      className={`fm-face ${className}`}
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-hidden="true"
    >
      <circle cx="50" cy="50" r="50" fill="var(--panel-3)" />
      {/* shoulders */}
      <path d="M12 100 Q50 68 88 100 Z" fill="var(--panel-2)" />
      <circle cx="50" cy="55" r="34" fill={spec.skinTone} />
      {spec.hasBeard && (
        <path d="M22 58 A28 32 0 0 0 78 58 A28 26 0 0 1 22 58 Z" fill={spec.hairColor} opacity="0.85" />
      )}
      <Hair style={spec.hairStyle} color={spec.hairColor} />
      {/* eyes */}
      <circle cx="39" cy="56" r="3.2" fill="#1b1b1b" />
      <circle cx="61" cy="56" r="3.2" fill="#1b1b1b" />
    </svg>
  );
}
