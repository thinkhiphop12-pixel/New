'use client';

import type { CSSProperties } from 'react';
import { useCountUp } from '@/lib/useCountUp';

/**
 * A number that travels to its new value and says which way it went.
 *
 * The audit's core complaint is that the sim moves a dozen values every time
 * the clock advances and the player sees none of it happen. This is the
 * smallest possible fix: swap `{avgSharpness}` for `<StatValue value={…} />`
 * and the stat rolls, flashes its direction colour, and carries a `+5` until
 * it changes again.
 *
 * Deliberately does nothing on first mount — opening a screen shows real
 * numbers immediately rather than rolling every stat up from zero.
 */
export default function StatValue({
  value,
  decimals = 0,
  showDelta = true,
  suffix,
  className,
  style,
}: {
  value: number;
  decimals?: number;
  /** Hide the `+5` badge where the row has no space for it. */
  showDelta?: boolean;
  suffix?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const { value: shown, direction, delta, changeKey } = useCountUp(value, { decimals });

  return (
    <span className={`fm-count${className ? ` ${className}` : ''}`} style={style}>
      {/* Keyed on the change counter so the flash replays on every change,
          not just the first one in a given direction — a CSS animation does
          not restart while the same class stays on the same element. */}
      <span key={changeKey} className={direction ? `fm-num--${direction}` : undefined}>
        {shown.toFixed(decimals)}
        {suffix}
      </span>
      {showDelta && delta !== 0 && (
        <span
          key={`d${changeKey}`}
          className={`fm-delta fm-delta--${delta > 0 ? 'up' : 'down'}`}
          // The badge is decoration over a value the player can already read;
          // announcing "+5" separately would double up in a screen reader.
          aria-hidden="true"
        >
          {delta > 0 ? '+' : '−'}
          {Math.abs(delta).toFixed(decimals)}
        </span>
      )}
    </span>
  );
}
