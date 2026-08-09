'use client';

import { useMemo, useState } from 'react';
import type { GameData, ScenarioId } from '@/engine/types';
import { SIMULATED_LEAGUE_IDS, clubStartingBudget, formatLeagueBlurb, leagueIdForDivision, leagueName } from '@/engine/gameRules';
import { formatMoney } from '@/engine/utils';
import { Crest } from './Crest';

/** Scenario club restrictions, applied here on the raw pre-newGame dataset —
 *  isBottomHalfClub in engine/scenarios.ts needs a live GameState (squad
 *  ratings computed from it), which doesn't exist yet at this point in the
 *  flow, so bottom-half ranking is recomputed directly from clubInfo below
 *  rather than reused. "Top flight" is division 1 — the only nation with
 *  more than one simulated tier is England, so this is a no-op restriction
 *  (nothing qualifies) for every other nation, which is correct: there is no
 *  "non-top-flight" club to promote from in a single-division country. */
function scenarioAllowsClub(
  scenarioId: ScenarioId | undefined,
  division: number,
  rankInDivision: number,
  divisionSize: number,
): boolean {
  if (!scenarioId) return true;
  if (scenarioId === 'relegation_battle' || scenarioId === 'underdog_title') {
    return rankInDivision > Math.ceil(divisionSize / 2);
  }
  if (scenarioId === 'hollywood' || scenarioId === 'takeover') {
    return division !== 1;
  }
  return true;
}

export default function ClubSelectScreen({
  data,
  divisions: allowedLeagueIds,
  scenarioId,
  onPick,
  onBack,
}: {
  data: GameData;
  divisions?: string[];
  scenarioId?: ScenarioId;
  onPick: (clubId: number, managerName: string) => void;
  onBack: () => void;
}) {
  const [division, setDivision] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [managerName, setManagerName] = useState('');
  // Gap 81: a real club search — the existing "fm-search" input just above
  // this one is actually the manager-name field, not a club filter at all,
  // despite the plan calling for "a searchable club grid with crests."
  const [clubQuery, setClubQuery] = useState('');

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

  const shownUnfiltered = division !== null ? clubInfo.filter((x) => leagueIdForDivision(x.club.division) === division) : [];
  // Rank within this division by squad rating, best first, so a "bottom half"
  // scenario check has something to rank against — same measure the engine
  // uses post-newGame (squadAvgRating), just computed on the raw dataset here.
  // Ranked BEFORE the name search filters it down, so the scenario gate still
  // sees the whole division's real bottom-half/top-flight shape rather than
  // a shape distorted by whatever the player has typed so far.
  const rankedInDivision = [...shownUnfiltered].sort((a, b) => b.avg - a.avg);
  // Budget is per club, not per division: the same ranking that drives the
  // scenario gate prices each side's transfer kitty, so the card shows what
  // this club would actually hand you rather than a league-wide figure.
  const budgetByClubId = new Map(
    rankedInDivision.map((x, i) =>
      [x.club.id, clubStartingBudget(leagueIdForDivision(x.club.division), i + 1, rankedInDivision.length)] as const,
    ),
  );
  const scenarioFiltered = shownUnfiltered.filter((x) =>
    scenarioAllowsClub(scenarioId, x.club.division, rankedInDivision.findIndex((r) => r.club.id === x.club.id) + 1, rankedInDivision.length)
  );
  const rankById = new Map(rankedInDivision.map((x, i) => [x.club.id, i + 1]));
  const query = clubQuery.trim().toLowerCase();
  const shown = query
    ? scenarioFiltered.filter((x) => x.club.name.toLowerCase().includes(query))
    : scenarioFiltered;

  return (
    <div className="fm-screen">
      <p className="fm-label" style={{ textAlign: 'center' }}>
        Choose your club
      </p>

      <div className="fm-pick-head">
        <div className="fm-division-toggle">
          {divisions.map((d) => (
            <button key={d} className={division === d ? 'active' : ''} onClick={() => setDivision(d)}>
              {leagueName(d)}
            </button>
          ))}
        </div>
        {division !== null && (
          <p className="fm-hint" style={{ margin: 0 }}>
            {formatLeagueBlurb(division)}{rankedInDivision.length > 0 && ` Budgets run ${formatMoney(
              budgetByClubId.get(rankedInDivision[rankedInDivision.length - 1].club.id) ?? 0
            )}–${formatMoney(budgetByClubId.get(rankedInDivision[0].club.id) ?? 0)} depending on the club.`}
          </p>
        )}
        <div className="fm-pick-head__fields">
          <input
            className="fm-search"
            placeholder="Your manager name (optional)"
            aria-label="Your manager name"
            value={managerName}
            maxLength={24}
            onChange={(e) => setManagerName(e.target.value)}
          />
        </div>
      </div>

      <div className="fm-club-filter">
        <span className="fm-club-filter__icon" aria-hidden>🔍</span>
        <input
          className="fm-club-filter__input"
          placeholder="Filter clubs by name…"
          aria-label="Filter clubs by name"
          value={clubQuery}
          onChange={(e) => setClubQuery(e.target.value)}
        />
      </div>

      {scenarioFiltered.length === 0 ? (
        <p className="fm-hint" style={{ textAlign: 'center' }}>
          This scenario doesn&apos;t start in {division !== null ? leagueName(division) : 'this division'} — pick another division above.
        </p>
      ) : (
        query && shown.length === 0 && (
          <p className="fm-hint" style={{ textAlign: 'center' }}>No clubs match &quot;{clubQuery}&quot; in this division.</p>
        )
      )}
      <div className="fm-club-grid">
        {shown.map(({ club, avg, star }) => (
          <button
            key={club.id}
            className={`fm-club-card${selected === club.id ? ' selected' : ''}`}
            aria-pressed={selected === club.id}
            onClick={() => setSelected(club.id)}
          >
            <span className="fm-club-card__crest">
              <Crest name={club.name} code={club.code} color={club.color} size={52} />
            </span>
            <span className="fm-club-card__name">{club.name}</span>
            <span className="fm-club-card__rank">
              {rankById.get(club.id)} of {rankedInDivision.length} in {division !== null ? leagueName(division) : 'division'}
            </span>
            <span className="fm-club-card__foot">
              <span className="fm-club-card__rating" title={`Squad rating ${avg}`}>{avg}</span>
              <span className="fm-club-card__star">{star ? `★ ${star.name}` : '—'}</span>
              <span
                className="fm-club-card__budget"
                title="Transfer budget the board would give you"
              >
                {formatMoney(budgetByClubId.get(club.id) ?? 0)}
              </span>
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
