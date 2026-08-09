'use client';

/**
 * Ted Lasso: light blue polo, visor, a mustache you could lose a set of keys
 * in, and a biscuit he is always, always offering.
 *
 * Same contract as `RoyAvatar` — `expression` sets the geometry, `animate`
 * runs the REACTION loop (mustache wiggle + biscuit offer). Keyframes come
 * from `lassoKentStyles.ts`.
 */

export type TedExpression = 'idle' | 'delighted' | 'encouraging';

export interface TedAvatarProps {
  size?: number;
  expression?: TedExpression;
  animate?: boolean;
  className?: string;
}

export function TedAvatar({
  size = 64,
  expression = 'idle',
  animate = false,
  className = '',
}: TedAvatarProps) {
  // Delighted = eyes crinkled shut; the other two keep them open and warm.
  const eyesClosed = expression === 'delighted';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label={`Ted Lasso, ${expression}`}
      className={`lk-avatar ${animate ? 'lk-ted-anim' : ''} ${className}`}
    >
      <defs>
        <clipPath id="lk-ted-head">
          <ellipse cx="50" cy="44" rx="25" ry="28" />
        </clipPath>
      </defs>

      {/* Light blue polo */}
      <path d="M16 100 Q18 74 35 68 L65 68 Q82 74 84 100 Z" fill="#7fc4e8" />
      {/* Polo collar + placket */}
      <path d="M38 68 L50 80 L62 68 L57 66 L50 74 L43 66 Z" fill="#a9dbf3" />
      <path d="M50 80 L50 94" stroke="#5fa9d0" strokeWidth="1.6" />
      <circle cx="50" cy="84" r="1.4" fill="#5fa9d0" />
      {/* Club badge on the chest */}
      <circle cx="68" cy="80" r="5" fill="#fff" opacity="0.9" />
      <circle cx="68" cy="80" r="3" fill="#e8544f" />

      {/* The biscuit, offered. Little pink box energy, round butter biscuit. */}
      <g className="lk-ted-biscuit">
        <circle cx="22" cy="82" r="9" fill="#e8c07d" stroke="#c99a52" strokeWidth="1.6" />
        <circle cx="19" cy="80" r="1.3" fill="#a97b3c" />
        <circle cx="25" cy="83" r="1.3" fill="#a97b3c" />
        <circle cx="21" cy="86" r="1.3" fill="#a97b3c" />
        {/* Hand holding it out */}
        <circle cx="30" cy="90" r="6" fill="#f0b98f" />
      </g>

      {/* Neck */}
      <rect x="43" y="60" width="14" height="14" fill="#e8ae83" />

      {/* Head */}
      <ellipse cx="50" cy="44" rx="25" ry="28" fill="#f6c49b" />

      {/* Hair, clipped to the head */}
      <path
        d="M25 42 Q27 18 50 18 Q73 18 75 42 Q68 30 50 30 Q32 30 25 42 Z"
        fill="#8a6236"
        clipPath="url(#lk-ted-head)"
      />

      {/* Visor: the band plus the brim, sat right where hair meets forehead */}
      <path d="M23 30 Q50 12 77 30 L77 34 Q50 20 23 34 Z" fill="#2f6fa8" />
      <path d="M20 32 Q50 20 80 32 Q50 40 20 32 Z" fill="#3f86c4" />

      {/* Eyes */}
      {eyesClosed ? (
        <>
          <path d="M33 44 Q39 38 45 44" stroke="#3d2b1b" strokeWidth="2.6" strokeLinecap="round" fill="none" />
          <path d="M55 44 Q61 38 67 44" stroke="#3d2b1b" strokeWidth="2.6" strokeLinecap="round" fill="none" />
        </>
      ) : (
        <>
          <ellipse cx="39" cy="43" rx="5.6" ry="5" fill="#fff" />
          <ellipse cx="61" cy="43" rx="5.6" ry="5" fill="#fff" />
          <circle cx="39.5" cy="43.5" r="2.5" fill="#4a6f3f" />
          <circle cx="61.5" cy="43.5" r="2.5" fill="#4a6f3f" />
          <circle cx="40.5" cy="42.3" r="0.9" fill="#fff" />
          <circle cx="62.5" cy="42.3" r="0.9" fill="#fff" />
        </>
      )}

      {/* Kind, high, slightly raised brows */}
      <path d="M32 35 Q39 31 46 34" stroke="#8a6236" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <path d="M54 34 Q61 31 68 35" stroke="#8a6236" strokeWidth="2.6" strokeLinecap="round" fill="none" />

      {/* Nose */}
      <path d="M50 45 L47 53 Q50 55 53 53 Z" fill="#e8ae83" />

      {/* Beaming smile, drawn under the mustache so the teeth peek out */}
      <path
        d={expression === 'encouraging' ? 'M40 62 Q50 68 60 62' : 'M38 61 Q50 72 62 61'}
        fill="#7a3b32"
        stroke="#7a3b32"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M41 62 Q50 65 59 62 Z" fill="#fff" />

      {/* THE MUSTACHE. Its own group so it can wiggle independently. */}
      <g className="lk-ted-tache">
        <path
          d="M50 56 Q40 50 32 55 Q31 62 40 61 Q46 60 50 57 Q54 60 60 61 Q69 62 68 55 Q60 50 50 56 Z"
          fill="#8a6236"
          stroke="#6f4c27"
          strokeWidth="1"
        />
      </g>
    </svg>
  );
}

export default TedAvatar;
