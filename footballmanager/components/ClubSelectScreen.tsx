'use client';

import { useMemo, useState } from 'react';
import type { GameData } from '@/engine/types';
import { STARTING_BUDGET } from '@/engine/gameRules';
import { formatMoney } from '@/engine/utils';

export default function ClubSelectScreen({
  data,
  onPick,
  onBack,
}: {
  data: GameData;
  onPick: (clubId: number) => void;
  onBack: () => void;
}) {
  const [division, setDivision] = useState<1 | 2>(1);
  const [selected, setSelected] = useState<number | null>(null);

  const clubInfo = useMemo(() => {
    const byId = new Map(data.players.map((p) => [p.id, p]));
    return data.clubs.map((c) => {
      const squad = c.playerIds.map((id) => byId.get(id)!).filter(Boolean);
      const avg = Math.round(squad.reduce((s, p) => s + p.rating, 0) / Math.max(squad.length, 1));
      const star = squad.reduce((best, p) => (p.rating > best.rating ? p : best), squad[0]);
      return { club: c, avg, star };
    });
  }, [data]);

  const shown = clubInfo.filter((x) => x.club.division === division);

  return (
    <div className="fm-screen">
      <p className="fm-label" style={{ textAlign: 'center' }}>
        Choose your club
      </p>
      <div className="fm-division-toggle">
        <button className={division === 1 ? 'active' : ''} onClick={() => setDivision(1)}>
          Division 1
        </button>
        <button className={division === 2 ? 'active' : ''} onClick={() => setDivision(2)}>
          Division 2
        </button>
      </div>
      <p className="fm-hint">
        {division === 1
          ? `Top flight. Stronger squads, higher expectations. Budget ${formatMoney(STARTING_BUDGET[1])}.`
          : `Second tier. Weaker squads but a promotion push awaits. Budget ${formatMoney(STARTING_BUDGET[2])}.`}
      </p>
      <div className="fm-club-grid">
        {shown.map(({ club, avg, star }) => (
          <button
            key={club.id}
            className={`fm-club-card${selected === club.id ? ' selected' : ''}`}
            onClick={() => setSelected(club.id)}
          >
            <span className="fm-club-card__badge" style={{ background: club.color }}>
              {club.code}
            </span>
            <span className="fm-club-card__name">{club.name}</span>
            <span className="fm-club-card__meta">
              Squad {avg} · Star: {star?.name ?? '—'}
            </span>
          </button>
        ))}
      </div>
      <div className="fm-actions">
        <button className="fm-btn fm-btn--ghost" onClick={onBack}>
          Back
        </button>
        <button
          className="fm-btn fm-btn--primary"
          disabled={selected === null}
          onClick={() => selected !== null && onPick(selected)}
        >
          Take the job
        </button>
      </div>
    </div>
  );
}
