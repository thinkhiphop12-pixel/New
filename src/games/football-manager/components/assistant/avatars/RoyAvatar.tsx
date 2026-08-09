'use client';

/**
 * Roy Kent, rendered as pure SVG so he scales from a 28px chat bubble to a
 * 120px reaction shot without a single raster asset.
 *
 * Everything expressive is driven by two props:
 *  - `expression` swaps the mouth/brow geometry (idle scowl, angrier scowl,
 *    the grudging almost-smile he'd deny under oath).
 *  - `animate` turns on the eyebrow twitch and the eye-roll, which is what
 *    the REACTION state uses.
 *
 * Animation keyframes live in `lassoKentStyles.ts` (injected once by the
 * provider) so both avatars share one stylesheet.
 */

export type RoyExpression = 'idle' | 'angry' | 'approve';

export interface RoyAvatarProps {
  size?: number;
  expression?: RoyExpression;
  /** Run the twitch/eye-roll loop. Used during REACTION. */
  animate?: boolean;
  /** Greyscale + dim, for when he's buggered off to the pub. */
  offline?: boolean;
  className?: string;
}

export function RoyAvatar({
  size = 64,
  expression = 'idle',
  animate = false,
  offline = false,
  className = '',
}: RoyAvatarProps) {
  // Brow angle carries most of the mood; the mouth just confirms it.
  const browTilt = expression === 'approve' ? 4 : expression === 'angry' ? 14 : 10;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label={`Roy Kent, ${expression}`}
      className={`lk-avatar ${animate ? 'lk-roy-anim' : ''} ${offline ? 'lk-offline' : ''} ${className}`}
    >
      <defs>
        <clipPath id="lk-roy-head">
          <ellipse cx="50" cy="44" rx="26" ry="29" />
        </clipPath>
      </defs>

      {/* Dark grey tracksuit shoulders */}
      <path d="M14 100 Q16 74 34 68 L66 68 Q84 74 86 100 Z" fill="#3b4048" />
      <path d="M50 68 L50 100" stroke="#2c3037" strokeWidth="2" />
      {/* Tracksuit zip collar */}
      <path d="M36 68 Q50 82 64 68" fill="#2c3037" />

      {/* Permanently crossed arms */}
      <g className="lk-roy-arms">
        <rect x="20" y="80" width="60" height="11" rx="5.5" fill="#454b54" />
        <rect x="20" y="88" width="60" height="11" rx="5.5" fill="#3b4048" />
        {/* Two white sleeve stripes, because it is a tracksuit */}
        <rect x="24" y="82" width="3" height="7" fill="#d7dbe0" opacity="0.7" />
        <rect x="73" y="90" width="3" height="7" fill="#d7dbe0" opacity="0.7" />
        {/* Hands tucked under the opposite elbow */}
        <circle cx="24" cy="93" r="6" fill="#d69b73" />
        <circle cx="76" cy="85" r="6" fill="#d69b73" />
      </g>

      {/* Neck */}
      <rect x="43" y="60" width="14" height="14" fill="#c98d66" />

      {/* Head */}
      <ellipse cx="50" cy="44" rx="26" ry="29" fill="#e0a87e" />

      {/* Hair — short, dark, receding just enough to be honest */}
      <path
        d="M24 40 Q26 15 50 15 Q74 15 76 40 Q70 27 50 27 Q30 27 24 40 Z"
        fill="#2f2a28"
        clipPath="url(#lk-roy-head)"
      />

      {/* Stubble: a shaded jaw block, clipped to the head so it can't spill */}
      <g clipPath="url(#lk-roy-head)" opacity="0.35">
        <path d="M26 52 Q50 82 74 52 L74 76 L26 76 Z" fill="#2f2a28" />
      </g>

      {/* Eyes. The pupils get the eye-roll animation. */}
      <ellipse cx="39" cy="43" rx="6" ry="4.4" fill="#fff" />
      <ellipse cx="61" cy="43" rx="6" ry="4.4" fill="#fff" />
      <circle className="lk-roy-pupil" cx="39" cy="43" r="2.6" fill="#241f1d" />
      <circle className="lk-roy-pupil" cx="61" cy="43" r="2.6" fill="#241f1d" />

      {/* Furrowed brows — thick, low, and angled inward */}
      <g className="lk-roy-brows">
        <rect
          x="30"
          y="33"
          width="18"
          height="5"
          rx="2.5"
          fill="#2f2a28"
          transform={`rotate(${browTilt} 39 35.5)`}
        />
        <rect
          x="52"
          y="33"
          width="18"
          height="5"
          rx="2.5"
          fill="#2f2a28"
          transform={`rotate(${-browTilt} 61 35.5)`}
        />
      </g>

      {/* Frown lines between the brows, because of course */}
      <path d="M47 30 L48 24 M53 30 L52 24" stroke="#2f2a28" strokeWidth="1.6" strokeLinecap="round" opacity="0.6" />

      {/* Nose */}
      <path d="M50 45 L47 53 Q50 55 53 53 Z" fill="#c98d66" />

      {/* Mouth */}
      {expression === 'approve' ? (
        // The grudging almost-smile. Barely. Don't get used to it.
        <path d="M41 60 Q50 63 59 60" stroke="#5a3529" strokeWidth="3" strokeLinecap="round" fill="none" />
      ) : (
        <path
          d={expression === 'angry' ? 'M40 63 Q50 55 60 63' : 'M42 62 Q50 57 58 62'}
          stroke="#5a3529"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
      )}
    </svg>
  );
}

export default RoyAvatar;
