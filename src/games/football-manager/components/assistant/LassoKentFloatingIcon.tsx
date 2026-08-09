'use client';

/**
 * The summon icon: a biscuit with a split face — Roy's scowl on the left,
 * Ted's grin on the right.
 *
 * Drag it anywhere; on release it snaps to the nearest corner and remembers
 * which one (localStorage), because a floating widget that sits over the
 * team sheet is worse than no widget. A drag never counts as a click, so
 * you can reposition it without the chat flying open.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

type Corner = 'br' | 'bl' | 'tr' | 'tl';

const CORNER_KEY = 'lassoKent.corner.v1';
const EDGE_GAP = 18;
/** Pointer travel (px) past which we treat the gesture as a drag, not a tap. */
const DRAG_THRESHOLD = 6;

export interface LassoKentFloatingIconProps {
  onClick(): void;
  /** Pulses the ring — there's something they want to say. */
  attention?: boolean;
  /** Roy's in the pub: the icon greys out but still opens Ted. */
  offline?: boolean;
  size?: number;
}

function loadCorner(): Corner {
  if (typeof window === 'undefined') return 'br';
  const saved = window.localStorage.getItem(CORNER_KEY);
  return saved === 'bl' || saved === 'tr' || saved === 'tl' ? saved : 'br';
}

export function LassoKentFloatingIcon({
  onClick,
  attention = false,
  offline = false,
  size = 68,
}: LassoKentFloatingIconProps) {
  const [corner, setCorner] = useState<Corner>('br');
  /** Live pixel position while dragging; null when parked in a corner. */
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const moved = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  useEffect(() => setCorner(loadCorner()), []);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    offset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    moved.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ x: rect.left, y: rect.top });
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (!drag) return;
      const x = e.clientX - offset.current.x;
      const y = e.clientY - offset.current.y;
      if (Math.abs(x - drag.x) > DRAG_THRESHOLD || Math.abs(y - drag.y) > DRAG_THRESHOLD) {
        moved.current = true;
      }
      // Never let it be dragged off-screen and become unreachable.
      setDrag({
        x: Math.max(0, Math.min(window.innerWidth - size, x)),
        y: Math.max(0, Math.min(window.innerHeight - size, y)),
      });
    },
    [drag, size],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (!drag) return;
      e.currentTarget.releasePointerCapture(e.pointerId);
      const cx = drag.x + size / 2;
      const cy = drag.y + size / 2;
      const next: Corner = `${cy < window.innerHeight / 2 ? 't' : 'b'}${
        cx < window.innerWidth / 2 ? 'l' : 'r'
      }` as Corner;
      setCorner(next);
      try {
        window.localStorage.setItem(CORNER_KEY, next);
      } catch {
        /* storage blocked — it just won't remember next session. */
      }
      setDrag(null);
      if (!moved.current) onClick();
    },
    [drag, onClick, size],
  );

  const parked: React.CSSProperties = {
    top: corner[0] === 't' ? EDGE_GAP : undefined,
    bottom: corner[0] === 'b' ? EDGE_GAP : undefined,
    left: corner[1] === 'l' ? EDGE_GAP : undefined,
    right: corner[1] === 'r' ? EDGE_GAP : undefined,
  };

  return (
    <button
      type="button"
      aria-label="Open assistant manager chat"
      className={`lk-fab ${drag ? 'lk-fab-dragging' : attention ? 'lk-fab-nudge' : 'lk-fab-idle'}`}
      style={{
        width: size,
        height: size,
        ...(drag ? { left: drag.x, top: drag.y, right: 'auto', bottom: 'auto' } : parked),
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => setDrag(null)}
      // Pointer events handle activation; this keeps keyboard users working.
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {attention && !drag && <span className="lk-fab-ping" />}
      <SplitBiscuit size={size} offline={offline} />
    </button>
  );
}

/** The icon itself: one biscuit, two moods, split down the middle. */
function SplitBiscuit({ size, offline }: { size: number; offline: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden="true"
      className={offline ? 'lk-offline' : undefined}
    >
      <defs>
        <clipPath id="lk-half-left">
          <rect x="0" y="0" width="50" height="100" />
        </clipPath>
        <clipPath id="lk-half-right">
          <rect x="50" y="0" width="50" height="100" />
        </clipPath>
      </defs>

      {/* Biscuit base — left half baked a shade darker, so the split reads
          even at 24px where the faces turn to mush. */}
      <circle cx="50" cy="50" r="46" fill="#d9a95f" stroke="#a8762f" strokeWidth="4" />
      <path d="M50 4 A46 46 0 0 0 50 96 Z" fill="#c2933f" />
      {/* Crumb texture */}
      <circle cx="26" cy="30" r="3" fill="#9c6f2c" opacity="0.5" />
      <circle cx="70" cy="24" r="2.6" fill="#a8762f" opacity="0.45" />
      <circle cx="76" cy="70" r="3" fill="#a8762f" opacity="0.45" />
      <circle cx="30" cy="72" r="2.4" fill="#9c6f2c" opacity="0.5" />

      {/* Left: Roy scowling */}
      <g clipPath="url(#lk-half-left)">
        <rect x="20" y="34" width="17" height="5" rx="2.5" fill="#2f2a28" transform="rotate(16 28 36)" />
        <circle cx="30" cy="48" r="4.5" fill="#fff" />
        <circle cx="31" cy="48" r="2.3" fill="#241f1d" />
        {/* Stubbled jaw */}
        <path d="M12 62 Q30 82 50 78 L50 92 L14 84 Z" fill="#2f2a28" opacity="0.28" />
        <path d="M24 72 Q37 64 50 70" stroke="#5a3529" strokeWidth="4" strokeLinecap="round" fill="none" />
      </g>

      {/* Right: Ted beaming, mustache and all */}
      <g clipPath="url(#lk-half-right)">
        <path d="M62 36 Q70 31 79 36" stroke="#8a6236" strokeWidth="3" strokeLinecap="round" fill="none" />
        <circle cx="70" cy="48" r="4.5" fill="#fff" />
        <circle cx="69" cy="48" r="2.3" fill="#4a6f3f" />
        <path d="M50 70 Q64 84 78 68" fill="#7a3b32" />
        <path d="M55 71 Q64 76 73 70 Z" fill="#fff" />
        <path
          d="M50 64 Q60 58 70 62 Q73 68 66 68 Q57 67 50 66 Z"
          fill="#8a6236"
          stroke="#6f4c27"
          strokeWidth="1"
        />
      </g>

      {/* The seam */}
      <line x1="50" y1="6" x2="50" y2="94" stroke="#8f6224" strokeWidth="2" opacity="0.55" />
    </svg>
  );
}

export default LassoKentFloatingIcon;
