'use client';

import { useMemo, useState } from 'react';
import type { Division, GameData } from '@/engine/types';
import { DIVISION_NAMES, STARTING_BUDGET } from '@/engine/gameRules';
import { ALL_DIVISIONS } from '@/engine/seasonProgression';
import { formatMoney } from '@/engine/utils';
import { Crest } from './Crest';

const DIV_BLURB: Record<Division, string> = {
  1: 'Top flight. Stronger squads, higher expectations, continental football.',
  2: 'Second tier. Weaker squads but a promotion push awaits.',
  3: 'Third tier. Tiny budgets, big dreams — the ultimate rebuild.',
  4: 'Fourth tier. Semi-pro grit, shoestring budgets — a true test.',
  5: 'Spain\'s finest. Technical football, world-class talent, and El Clasico.',
  6: 'Italian elite. Tactical chess, defensive masters, and the Scudetto.',
  7: 'German powerhouse. High pressing, incredible atmospheres, and the Meisterschale.',
  8: 'French top flight. Physical football, emerging superstars, and PSG dominance.',
  9: 'Dutch top flight. Attacking football and a famous youth conveyor belt.',
  10: 'Portuguese top flight. Technical quality and Europe\'s best scouting network.',
};

export default function ClubSelectScreen({
  data,
  divisions: allowedDivisions,
  onPick,
  onBack,
}: {
  data: GameData;
  divisions?: Division[];
  onPick: (clubId: number, managerName: string) => void;
  onBack: () => void;
}) {
  const [division, setDivision] = useState<Division | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [managerName, setManagerName] = useState('');

  const divisions = useMemo(() => {
    const set = new Set(data.clubs.map((c) => c.division));
    const available = ALL_DIVISIONS.filter(
      (d) => set.has(d) && (!allowedDivisions || allowedDivisions.includes(d))
    );
    return available;
  }, [data, allowedDivisions]);

  // Set default division on first render
  useMemo(() => {
    if (division === null && divisions.length > 0) {
      setDivision(divisions[0]);
    }
  }, [divisions, division]);

  const clubInfo = useMemo(() => {
    const byId = new Map(data.players.map((p) => [p.id, p]));
    return data.clubs.map((c) => {
      const squad = c.playerIds.map((id) => byId.get(id)!).filter(Boolean);
      const avg = Math.round(squad.reduce((s, p) => s + p.rating, 0) / Math.max(squad.length, 1));
      const star = squad.reduce((best, p) => (p.rating > best.rating ? p : best), squad[0]);
      return { club: c, avg, star };
    });
  }, [data]);

  const shown = division !== null ? clubInfo.filter((x) => x.club.division === division) : [];

  return (
    <div className="fm-screen">
      <p className="fm-label" style={{ textAlign: 'center' }}>
        Choose your club
      </p>
      <input
        className="fm-search"
        style={{ alignSelf: 'center', maxWidth: 320 }}
        placeholder="Your manager name (optional)"
        value={managerName}
        maxLength={24}
        onChange={(e) => setManagerName(e.target.value)}
      />
      <div className="fm-division-toggle">
        {divisions.map((d) => (
          <button key={d} className={division === d ? 'active' : ''} onClick={() => setDivision(d)}>
            {DIVISION_NAMES[d]}
          </button>
        ))}
      </div>
      {division !== null && (
        <p className="fm-hint">
          {DIV_BLURB[division]} Budget {formatMoney(STARTING_BUDGET[division])}.
        </p>
      )}
      <div className="fm-club-grid">
        {shown.map(({ club, avg, star }) => (
          <button
            key={club.id}
            className={`fm-club-card${selected === club.id ? ' selected' : ''}`}
            onClick={() => setSelected(club.id)}
          >
            <Crest name={club.name} code={club.code} color={club.color} size={40} />
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
          onClick={() => selected !== null && onPick(selected, managerName.trim() || 'The Gaffer')}
        >
          Take the job
        </button>
      </div>
    </div>
  );
}
