'use client';

import { useMemo, useState } from 'react';
import type { GameData } from '@/engine/types';
import { SIMULATED_LEAGUE_IDS, formatLeagueBlurb, leagueIdForDivision, leagueName, startingBudget } from '@/engine/gameRules';
import { formatMoney } from '@/engine/utils';
import { Crest } from './Crest';

export default function ClubSelectScreen({
  data,
  divisions: allowedLeagueIds,
  onPick,
  onBack,
}: {
  data: GameData;
  divisions?: string[];
  onPick: (clubId: number, managerName: string) => void;
  onBack: () => void;
}) {
  const [division, setDivision] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [managerName, setManagerName] = useState('');

  const divisions = useMemo(() => {
    const set = new Set(data.clubs.map((c) => leagueIdForDivision(c.division)));
    return SIMULATED_LEAGUE_IDS.filter(
      (id) => set.has(id) && (!allowedLeagueIds || allowedLeagueIds.includes(id))
    );
  }, [data, allowedLeagueIds]);

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

  const shown = division !== null ? clubInfo.filter((x) => leagueIdForDivision(x.club.division) === division) : [];

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
            {leagueName(d)}
          </button>
        ))}
      </div>
      {division !== null && (
        <p className="fm-hint">
          {formatLeagueBlurb(division)} Budget {formatMoney(startingBudget(division))}.
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
