'use client';

/**
 * A bust portrait for a coach, drawn from his id.
 *
 * Same trick as `PlayerFace` — deterministic parts picked by a seeded RNG, so
 * a coach's face is stable across sessions and saves without shipping a
 * single portrait asset — but framed as a bust rather than a badge: bigger,
 * with a tracksuit in the club's colours, so the Assistant Manager reads as a
 * person standing in front of you rather than an avatar in a list.
 *
 * The `mood` prop is the only non-deterministic part. It comes from what he
 * is currently saying, so the face matches the line.
 */

const SKIN_TONES = ['#ffe0bd', '#f1c27d', '#e0ac69', '#c68642', '#8d5524'];
const HAIR_COLORS = ['#2c1b18', '#3b2417', '#6a4e35', '#8b8378', '#1a1a1a'];

export type CoachMood = 'neutral' | 'happy' | 'concerned';

/** mulberry32, matching PlayerFace's generator. */
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

interface CoachSpec {
  skin: string;
  hair: string;
  hairStyle: number;
  beard: number;
  brow: number;
}

export function coachSpecFor(coachId: number): CoachSpec {
  // Offset the seed off PlayerFace's so a coach and a player sharing an id
  // don't end up as twins.
  const next = rng(Math.imul(coachId + 7919, 2654435761));
  return {
    skin: SKIN_TONES[Math.floor(next() * SKIN_TONES.length)],
    hair: HAIR_COLORS[Math.floor(next() * HAIR_COLORS.length)],
    hairStyle: Math.floor(next() * 5),
    beard: Math.floor(next() * 3), // 0 none, 1 stubble, 2 full
    brow: Math.floor(next() * 2),
  };
}

/** Head is centred at (50,42) with rx 20 / ry 23. */
function Hair({ style, color }: { style: number; color: string }) {
  switch (style) {
    case 0: // short back and sides
      return <path d="M30 40 q1-21 20-21 q19 0 20 21 q-5-12-20-12 q-15 0-20 12z" fill={color} />;
    case 1: // full sweep
      return <path d="M29 42 q0-24 21-24 q21 0 21 24 q-3-15-12-16 q-8 7-22 5 q-6 3-8 11z" fill={color} />;
    case 2: // curls
      return (
        <g fill={color}>
          <circle cx="50" cy="24" r="15" />
          <circle cx="34" cy="32" r="9" />
          <circle cx="66" cy="32" r="9" />
        </g>
      );
    case 3: // receding
      return <path d="M31 38 q3-16 19-16 q16 0 19 16 q-6-8-19-8 q-13 0-19 8z" fill={color} opacity="0.9" />;
    default: // bald, just a shadow at the temples
      return <path d="M31 39 q2-9 6-13 q-5 6-6 13z M69 39 q-2-9-6-13 q5 6 6 13z" fill={color} opacity="0.45" />;
  }
}

export default function CoachPortrait({
  coachId,
  clubColor = '#1f2a22',
  mood = 'neutral',
  size = 132,
}: {
  coachId: number;
  /** Tracksuit trim, so he's dressed in the club's kit. */
  clubColor?: string;
  mood?: CoachMood;
  size?: number;
}) {
  const s = coachSpecFor(coachId);

  // Mouth and brows carry the mood; nothing else changes.
  const mouth =
    mood === 'happy' ? 'M44 55 q6 5 12 0'
      : mood === 'concerned' ? 'M44 57 q6 -3 12 0'
        : 'M44 56 q6 2 12 0';
  const browY = mood === 'concerned' ? 34.5 : 36;
  const browTilt = mood === 'concerned' ? 2 : 0;

  return (
    <svg
      className="fm-coach-portrait"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-hidden="true"
    >
      <defs>
        <clipPath id={`coachClip${coachId}`}>
          <rect x="0" y="0" width="100" height="100" />
        </clipPath>
      </defs>
      <g clipPath={`url(#coachClip${coachId})`}>
        {/* tracksuit */}
        <path d="M14 100 q0-26 36-30 q36 4 36 30 z" fill="#16241a" />
        <path d="M50 70 l-9 30 h18 z" fill="#0e1a12" />
        <path d="M14 100 q2-18 18-25 l4 25 z" fill={clubColor} opacity="0.6" />
        <path d="M86 100 q-2-18-18-25 l-4 25 z" fill={clubColor} opacity="0.6" />
        {/* neck */}
        <rect x="43" y="58" width="14" height="16" rx="6" fill={s.skin} />
        <rect x="43" y="58" width="14" height="16" rx="6" fill="#000" opacity="0.12" />
        {/* head */}
        <ellipse cx="50" cy="42" rx="20" ry="23" fill={s.skin} />
        {/* ears */}
        <ellipse cx="29.5" cy="44" rx="3" ry="4.5" fill={s.skin} />
        <ellipse cx="70.5" cy="44" rx="3" ry="4.5" fill={s.skin} />
        <Hair style={s.hairStyle} color={s.hair} />
        {/* brows */}
        <rect x="38" y={browY} width="9" height="2.4" rx="1.2" fill={s.hair}
          transform={`rotate(${browTilt} 42.5 ${browY})`} />
        <rect x="53" y={browY} width="9" height="2.4" rx="1.2" fill={s.hair}
          transform={`rotate(${-browTilt} 57.5 ${browY})`} />
        {/* eyes */}
        <circle cx="42.5" cy="42" r="2.3" fill="#20242a" />
        <circle cx="57.5" cy="42" r="2.3" fill="#20242a" />
        {/* nose */}
        <path d="M50 45 v5 h3" fill="none" stroke="#000" strokeOpacity="0.22" strokeWidth="1.4" strokeLinecap="round" />
        {/* beard before mouth, so the mouth sits on top of it */}
        {s.beard > 0 && (
          <path
            d="M33 47 q3 18 17 18 q14 0 17-18 q-4 14-17 14 q-13 0-17-14z"
            fill={s.hair}
            opacity={s.beard === 2 ? 0.9 : 0.42}
          />
        )}
        <path d={mouth} fill="none" stroke="#000" strokeOpacity="0.45" strokeWidth="1.8" strokeLinecap="round" />
      </g>
    </svg>
  );
}
