'use client';

import type { FormationDef, MatchEvent, Player } from '@/engine/types';

/** Deterministic pseudo-random x position (20–80) seeded from event data, so the ball doesn't jump around on rerender. */
function seededX(seed: number): number {
  const v = Math.sin(seed * 12.9898) * 43758.5453;
  return 20 + (v - Math.floor(v)) * 60;
}

function ballPosition(latest: MatchEvent | undefined, userClubId: number): { x: number; y: number } {
  if (!latest) return { x: 50, y: 50 };
  const seed = latest.minute * 7 + latest.clubId * 3;
  if (latest.type === 'goal' || latest.type === 'chance') {
    const attacking = latest.clubId === userClubId;
    return { x: seededX(seed), y: attacking ? 88 : 8 };
  }
  return { x: seededX(seed), y: 50 };
}

export default function MatchPitchView({
  formation,
  lineup,
  players,
  latestEvent,
  userClubId,
}: {
  formation: FormationDef;
  lineup: (number | null)[];
  players: Record<number, Player>;
  latestEvent?: MatchEvent;
  userClubId: number;
}) {
  const ball = ballPosition(latestEvent, userClubId);
  return (
    <div className="fm-pitch fm-pitch--live">
      {formation.slots.map((slot, i) => {
        const id = lineup[i];
        const p = id != null ? players[id] : null;
        return (
          <div key={i} className={`fm-slot fm-slot--live${p ? ' filled' : ''}`} style={{ left: `${slot.x}%`, bottom: `${slot.y}%` }}>
            <span className="fm-slot__chip">{p ? Math.round(p.rating * p.form) : slot.label}</span>
            {p && <span className="fm-slot__name">{p.name}</span>}
          </div>
        );
      })}
      <div
        className="fm-live-ball"
        style={{ left: `${ball.x}%`, bottom: `${ball.y}%` }}
        title={latestEvent?.text}
      />
    </div>
  );
}
