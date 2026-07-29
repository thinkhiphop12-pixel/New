'use client';

import { useEffect, useMemo, useState } from 'react';
import type { GameState, Position } from '@/engine/types';
import { askingPrice, buyPlayer, canBuy, scoutRecommendations, transferTargets } from '@/engine/transferMarket';
import { getStaff } from '@/engine/seasonProgression';
import {
  assignScout, newScouting, tickFacilitiesWeek, toggleShortlist,
} from '@/engine/facilities';
import { formatMoney } from '@/engine/utils';
import { StatTile } from './visuals';
import PlayerModal from './PlayerModal';

const POSITIONS: (Position | 'ALL')[] = ['ALL', 'GK', 'DEF', 'MID', 'FWD'];

export default function ScoutScreen({
  state,
  onChange,
}: {
  state: GameState;
  onChange: (next: GameState) => void;
}) {
  const [posFilter, setPosFilter] = useState<Position | 'ALL'>('ALL');
  const [minRating, setMinRating] = useState(0);
  const [maxAge, setMaxAge] = useState(40);
  const [error, setError] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const detail = detailId !== null ? state.players[detailId] : null;

  const sc = state.scouting ?? newScouting();
  const shortlist = sc.shortlist;

  // Catch up scouting/facilities weekly progress when this screen is visited,
  // same pattern as FacilitiesScreen — persisted state, not local React state
  // (gap item 67: the old shortlist here was a bare useState and vanished on
  // navigation).
  const lastTickWeekKey = `${state.seasonYear}-${state.week}`;
  useEffect(() => {
    if (!state.scouting) {
      onChange({ ...state, scouting: sc });
      return;
    }
    if (sc.assignments.some((a) => !a.complete)) onChange(tickFacilitiesWeek(state));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastTickWeekKey]);

  const clubName = (id: number) => (id === 0 ? 'Free agent' : state.clubs.find((c) => c.id === id)?.name ?? '—');
  const scoutLevel = getStaff(state).scout;

  const reports = useMemo(() => scoutRecommendations(state), [state]);

  const filteredReports = useMemo(
    () =>
      reports
        .filter((r) => posFilter === 'ALL' || r.pos === posFilter)
        .map((r) => ({
          ...r,
          picks: r.picks.filter((p) => p.rating >= minRating && p.age <= maxAge),
        })),
    [reports, posFilter, minRating, maxAge]
  );

  const totalLeads = reports.reduce((s, r) => s + r.picks.length, 0);
  const needAttention = reports.filter((r) => r.picks.length === 0).length;

  const shortlisted = useMemo(() => {
    const targets = transferTargets(state);
    const known = new Set(targets.map((p) => p.id));
    const extra = shortlist
      .filter((id) => !known.has(id))
      .map((id) => state.players[id])
      .filter((p): p is NonNullable<typeof p> => !!p);
    return [...targets.filter((p) => shortlist.includes(p.id)), ...extra];
  }, [state, shortlist]);

  const toggleScout = (playerId: number) => onChange(toggleShortlist(state, playerId));

  const doSign = (playerId: number) => {
    const check = canBuy(state, playerId);
    if (!check.ok) {
      setError(check.error ?? 'Cannot sign.');
      return;
    }
    setError(null);
    onChange(toggleShortlist(buyPlayer(state, playerId), playerId));
  };

  const opponentClubs = state.clubs.filter((c) => c.id !== state.userClubId && !c.dormant).slice(0, 30);
  const activeAssignments = sc.assignments.filter((a) => !a.complete);

  return (
    <>
      <div className="fm-attr-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <StatTile icon="🔭" value={totalLeads} label="Leads available this week" />
        <StatTile icon="⚠️" value={needAttention} label="Position groups need attention" />
        <StatTile icon="🧑‍💼" value={`Lvl ${scoutLevel}`} label="Chief scout" />
      </div>

      {error && <p className="fm-error-text">{error}</p>}

      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>Scouting network</p>
        <p className="fm-club-line">Assign scouts to opponents or player searches. Reports arrive after their due week.</p>
        <div className="fm-filters">
          <button className="fm-pill" onClick={() => onChange(assignScout(state, 'player-search'))}>
            Assign: player search (2wk)
          </button>
          <button className="fm-pill" onClick={() => onChange(assignScout(state, 'youth'))}>
            Assign: youth scouting (3wk)
          </button>
        </div>
        <select
          className="fm-search"
          style={{ marginTop: 8 }}
          defaultValue=""
          onChange={(e) => {
            const clubId = Number(e.target.value);
            if (clubId) onChange(assignScout(state, 'opponent', clubId));
            e.target.value = '';
          }}
        >
          <option value="" disabled>Assign: scout an opponent (1wk)…</option>
          {opponentClubs.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {activeAssignments.length > 0 && (
          <ul className="fm-news" style={{ marginTop: 10 }}>
            {activeAssignments.map((a) => (
              <li key={a.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{a.scoutName} — {a.kind}{a.targetClubId ? `: ${clubName(a.targetClubId)}` : ''}</span>
                <span className="fm-hint">{a.weeksRemaining}wk left</span>
              </li>
            ))}
          </ul>
        )}

        {sc.reports.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <p className="fm-label">Opponent reports</p>
            {sc.reports.slice(0, 5).map((r) => (
              <div key={r.id} style={{ marginBottom: 6 }}>
                <p className="fm-club-line" style={{ margin: 0 }}>{clubName(r.clubId)} — {r.summary}</p>
                <p className="fm-hint" style={{ margin: 0 }}>
                  Strengths: {r.strengths.join(', ') || 'none noted'} · Weaknesses: {r.weaknesses.join(', ') || 'none noted'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>
          Available leads
        </p>
        <div className="fm-filters">
          {POSITIONS.map((p) => (
            <button
              key={p}
              className={`fm-pill${posFilter === p ? ' active' : ''}`}
              onClick={() => setPosFilter(p)}
            >
              {p}
            </button>
          ))}
          <select
            className="fm-search"
            style={{ width: 'auto' }}
            value={minRating}
            onChange={(e) => setMinRating(Number(e.target.value))}
          >
            <option value={0}>Any rating</option>
            <option value={65}>65+ rating</option>
            <option value={70}>70+ rating</option>
            <option value={75}>75+ rating</option>
            <option value={80}>80+ rating</option>
          </select>
          <select
            className="fm-search"
            style={{ width: 'auto' }}
            value={maxAge}
            onChange={(e) => setMaxAge(Number(e.target.value))}
          >
            <option value={40}>Any age</option>
            <option value={21}>Under 21</option>
            <option value={24}>Under 24</option>
            <option value={28}>Under 28</option>
          </select>
        </div>

        {filteredReports.every((r) => r.picks.length === 0) ? (
          <p className="fm-hint">No leads match these filters right now.</p>
        ) : (
          filteredReports.map((rep) => {
            if (rep.picks.length === 0) return null;
            return (
              <div key={rep.pos} style={{ marginTop: 10 }}>
                <p className="fm-label">
                  {rep.pos} — your average {rep.need}
                </p>
                <div className="fm-player-list">
                  {rep.picks.map((p) => (
                    <div key={p.id} className={`fm-player-row fm-pos-${p.pos}`} onClick={() => setDetailId(p.id)}>
                      <span className="fm-player-row__badge">{p.role}</span>
                      <span className="fm-player-row__name">
                        {p.name}
                        <span className="fm-player-row__sub">
                          {p.nat} · {p.age}y · {clubName(p.clubId)} · potential value {formatMoney(p.value)}
                        </span>
                      </span>
                      <span style={{ display: 'flex', gap: 6 }}>
                        <button
                          className={`fm-btn fm-btn--small${shortlist.includes(p.id) ? ' fm-btn--secondary' : ' fm-btn--ghost'}`}
                          onClick={(e) => { e.stopPropagation(); toggleScout(p.id); }}
                        >
                          {shortlist.includes(p.id) ? 'Scouted' : 'Scout'}
                        </button>
                        <button
                          className="fm-btn fm-btn--small fm-btn--primary"
                          disabled={askingPrice(p) > state.budget}
                          onClick={(e) => { e.stopPropagation(); doSign(p.id); }}
                        >
                          Sign {formatMoney(askingPrice(p))}
                        </button>
                      </span>
                      <span
                        className={`fm-player-row__rating${p.rating >= 85 ? ' fm-player-row__rating--elite' : ''}`}
                      >
                        {p.rating}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>
          Scouted targets{shortlisted.length ? ` (${shortlisted.length})` : ''}
        </p>
        {shortlisted.length === 0 ? (
          <p className="fm-hint">Tap “Scout” on a lead to track it here.</p>
        ) : (
          <div className="fm-player-list">
            {shortlisted.map((p) => (
              <div key={p.id} className={`fm-player-row fm-pos-${p.pos}`} onClick={() => setDetailId(p.id)}>
                <span className="fm-player-row__badge">{p.role}</span>
                <span className="fm-player-row__name">
                  {p.name}
                  <span className="fm-player-row__sub">
                    {p.nat} · {p.age}y · {clubName(p.clubId)}
                  </span>
                </span>
                <span style={{ display: 'flex', gap: 6 }}>
                  <button className="fm-btn fm-btn--small fm-btn--ghost" onClick={(e) => { e.stopPropagation(); toggleScout(p.id); }}>
                    Drop
                  </button>
                  <button
                    className="fm-btn fm-btn--small fm-btn--primary"
                    disabled={askingPrice(p) > state.budget}
                    onClick={(e) => { e.stopPropagation(); doSign(p.id); }}
                  >
                    Sign {formatMoney(askingPrice(p))}
                  </button>
                </span>
                <span className={`fm-player-row__rating${p.rating >= 85 ? ' fm-player-row__rating--elite' : ''}`}>
                  {p.rating}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="fm-hint">
        A better chief scout surfaces more leads and lowers the bar for what counts as an upgrade.
      </p>

      {detail && (
        <PlayerModal
          state={state}
          player={detail}
          club={state.clubs.find((c) => c.id === detail.clubId)}
          onChange={onChange}
          onClose={() => setDetailId(null)}
        />
      )}
    </>
  );
}
