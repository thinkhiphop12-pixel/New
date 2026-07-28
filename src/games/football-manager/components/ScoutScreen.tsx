'use client';

import { useMemo, useState } from 'react';
import type { GameState, Position } from '@/engine/types';
import { askingPrice, buyPlayer, canBuy, scoutRecommendations, transferTargets } from '@/engine/transferMarket';
import { getStaff } from '@/engine/seasonProgression';
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
  const [shortlist, setShortlist] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const detail = detailId !== null ? state.players[detailId] : null;

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
    return targets.filter((p) => shortlist.has(p.id));
  }, [state, shortlist]);

  const toggleScout = (playerId: number) => {
    setShortlist((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      return next;
    });
  };

  const doSign = (playerId: number) => {
    const check = canBuy(state, playerId);
    if (!check.ok) {
      setError(check.error ?? 'Cannot sign.');
      return;
    }
    setError(null);
    setShortlist((prev) => {
      const next = new Set(prev);
      next.delete(playerId);
      return next;
    });
    onChange(buyPlayer(state, playerId));
  };

  return (
    <>
      <div className="fm-attr-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <StatTile icon="🔭" value={totalLeads} label="Leads available this week" />
        <StatTile icon="⚠️" value={needAttention} label="Position groups need attention" />
        <StatTile icon="🧑‍💼" value={`Lvl ${scoutLevel}`} label="Chief scout" />
      </div>

      {error && <p className="fm-error-text">{error}</p>}

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
                          className={`fm-btn fm-btn--small${shortlist.has(p.id) ? ' fm-btn--secondary' : ' fm-btn--ghost'}`}
                          onClick={(e) => { e.stopPropagation(); toggleScout(p.id); }}
                        >
                          {shortlist.has(p.id) ? 'Scouted' : 'Scout'}
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
