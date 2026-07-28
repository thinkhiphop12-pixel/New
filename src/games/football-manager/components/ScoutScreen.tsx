'use client';

import { useMemo, useState } from 'react';
import type { GameState, Position } from '@/engine/types';
import { scoutRecommendations } from '@/engine/transferMarket';
import { buyPlayer, canBuy } from '@/engine/transferMarket';
import { formatMoney } from '@/engine/utils';

type ScoutTab = 'leads' | 'targets';
const POSITIONS: (Position | 'ALL')[] = ['ALL', 'GK', 'DEF', 'MID', 'FWD'];

export default function ScoutScreen({
  state,
  onChange,
}: {
  state: GameState;
  onChange: (next: GameState) => void;
}) {
  const [tab, setTab] = useState<ScoutTab>('leads');
  const [posFilter, setPosFilter] = useState<Position | 'ALL'>('ALL');
  const [error, setError] = useState<string | null>(null);

  const recommendations = useMemo(() => {
    return scoutRecommendations(state)
      .filter((p) => posFilter === 'ALL' || p.pos === posFilter)
      .sort((a, b) => b.rating - a.rating);
  }, [state, posFilter]);

  const doBuy = (playerId: number) => {
    const check = canBuy(state, playerId);
    if (!check.ok) {
      setError(check.error ?? 'Cannot buy.');
      return;
    }
    setError(null);
    onChange(buyPlayer(state, playerId));
  };

  return (
    <>
      <div className="fm-division-toggle" style={{ alignSelf: 'center' }}>
        <button className={tab === 'leads' ? 'active' : ''} onClick={() => setTab('leads')}>
          Scouting Leads
        </button>
        <button className={tab === 'targets' ? 'active' : ''} onClick={() => setTab('targets')}>
          Your Targets
        </button>
      </div>

      {error && <p className="fm-error-text">{error}</p>}

      {tab === 'leads' && (
        <>
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
          </div>
          <div className="fm-player-list">
            {recommendations.length > 0 ? (
              recommendations.map((p) => {
                const affordable = p.value * 1.2 <= state.budget;
                return (
                  <div key={p.id} className={`fm-player-row fm-pos-${p.pos}`}>
                    <span className="fm-player-row__badge">{p.role}</span>
                    <span className="fm-player-row__name">
                      {p.name}
                      <span className="fm-player-row__sub">
                        {p.nat} · {p.age}y · {p.clubId === 0 ? 'Free agent' : state.clubs.find((c) => c.id === p.clubId)?.name}
                      </span>
                    </span>
                    <button
                      className="fm-btn fm-btn--small fm-btn--primary"
                      disabled={!affordable}
                      onClick={() => doBuy(p.id)}
                    >
                      {formatMoney(p.value)}
                    </button>
                    <span className={`fm-player-row__rating${p.rating >= 85 ? ' fm-player-row__rating--elite' : ''}`}>
                      {p.rating}
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="fm-hint">No scouting leads available. Scout more players!</p>
            )}
          </div>
        </>
      )}

      {tab === 'targets' && (
        <div className="fm-panel">
          <p className="fm-label" style={{ marginTop: 0 }}>
            Your scouting targets
          </p>
          <p className="fm-hint">Targets you add will appear here for tracking and comparison.</p>
          <p className="fm-club-line" style={{ textAlign: 'left', fontSize: '12px' }}>
            💡 Use the "Leads" tab to scout promising players and add them to your targets list.
          </p>
        </div>
      )}
    </>
  );
}
