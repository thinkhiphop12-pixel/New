'use client';

import { useMemo, useState } from 'react';
import type { GameState, Position } from '@/engine/types';
import {
  askingPrice, buyPlayer, canBuy, canSell, saleValue, scoutRecommendations, sellPlayer, transferTargets,
} from '@/engine/transferMarket';
import { getSquad } from '@/engine/teamManagement';
import { formatMoney } from '@/engine/utils';
import PlayerModal from './PlayerModal';

type MarketTab = 'buy' | 'sell' | 'offers' | 'scout';
const POSITIONS: (Position | 'ALL')[] = ['ALL', 'GK', 'DEF', 'MID', 'FWD'];

export default function TransfersScreen({
  state,
  onChange,
}: {
  state: GameState;
  onChange: (next: GameState) => void;
}) {
  const [tab, setTab] = useState<MarketTab>('buy');
  const [posFilter, setPosFilter] = useState<Position | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const detail = detailId !== null ? state.players[detailId] : null;

  const clubName = (id: number) => (id === 0 ? 'Free agent' : state.clubs.find((c) => c.id === id)?.name ?? '—');

  const targets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transferTargets(state)
      .filter((p) => posFilter === 'ALL' || p.pos === posFilter)
      .filter((p) => !q || p.name.toLowerCase().includes(q) || p.nat.toLowerCase().includes(q))
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 60);
  }, [state, posFilter, search]);

  const mySquad = getSquad(state, state.userClubId).sort((a, b) => b.rating - a.rating);

  const doBuy = (playerId: number) => {
    const check = canBuy(state, playerId);
    if (!check.ok) {
      setError(check.error ?? 'Cannot buy.');
      return;
    }
    setError(null);
    onChange(buyPlayer(state, playerId));
  };

  const doSell = (playerId: number, viaOffer = false) => {
    const check = canSell(state, playerId);
    if (!check.ok) {
      setError(check.error ?? 'Cannot sell.');
      return;
    }
    const offer = viaOffer ? state.incomingOffers.find((o) => o.playerId === playerId) : undefined;
    setError(null);
    onChange(sellPlayer(state, playerId, offer));
  };

  return (
    <>
      <div className="fm-division-toggle" style={{ alignSelf: 'center' }}>
        <button className={tab === 'buy' ? 'active' : ''} onClick={() => setTab('buy')}>
          Buy
        </button>
        <button className={tab === 'sell' ? 'active' : ''} onClick={() => setTab('sell')}>
          Sell
        </button>
        <button className={tab === 'offers' ? 'active' : ''} onClick={() => setTab('offers')}>
          Offers{state.incomingOffers.length ? ` (${state.incomingOffers.length})` : ''}
        </button>
        <button className={tab === 'scout' ? 'active' : ''} onClick={() => setTab('scout')}>
          Scout
        </button>
      </div>

      {error && <p className="fm-error-text">{error}</p>}

      {tab === 'buy' && (
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
            <input
              className="fm-search"
              placeholder="Search name or nation…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="fm-player-list">
            {targets.map((p) => {
              const price = askingPrice(p);
              const affordable = price <= state.budget;
              return (
                <div key={p.id} className={`fm-player-row fm-pos-${p.pos}`} onClick={() => setDetailId(p.id)}>
                  <span className="fm-player-row__badge">{p.role}</span>
                  <span className="fm-player-row__name">
                    {p.name}
                    <span className="fm-player-row__sub">
                      {p.nat} · {p.age}y · {clubName(p.clubId)}
                    </span>
                  </span>
                  <button
                    className="fm-btn fm-btn--small fm-btn--primary"
                    disabled={!affordable}
                    onClick={(e) => { e.stopPropagation(); doBuy(p.id); }}
                  >
                    {formatMoney(price)}
                  </button>
                  <span className={`fm-player-row__rating${p.rating >= 85 ? ' fm-player-row__rating--elite' : ''}`}>
                    {p.rating}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === 'sell' && (
        <div className="fm-player-list">
          {mySquad.map((p) => (
            <div key={p.id} className={`fm-player-row fm-pos-${p.pos}`} onClick={() => setDetailId(p.id)}>
              <span className="fm-player-row__badge">{p.role}</span>
              <span className="fm-player-row__name">
                {p.name}
                <span className="fm-player-row__sub">
                  {p.nat} · {p.age}y · value {formatMoney(p.value)}
                </span>
              </span>
              <button className="fm-btn fm-btn--small fm-btn--danger" onClick={(e) => { e.stopPropagation(); doSell(p.id); }}>
                Sell {formatMoney(saleValue(p))}
              </button>
              <span className={`fm-player-row__rating${p.rating >= 85 ? ' fm-player-row__rating--elite' : ''}`}>
                {p.rating}
              </span>
            </div>
          ))}
        </div>
      )}

      {tab === 'scout' && (
        <>
          <p className="fm-hint">Affordable upgrades, by position.</p>
          {scoutRecommendations(state).map((rep) => (
            <div key={rep.pos}>
              <p className="fm-label">
                {rep.pos} — your average {rep.need}
              </p>
              {rep.picks.length === 0 ? (
                <p className="fm-hint">No affordable upgrades found.</p>
              ) : (
                <div className="fm-player-list">
                  {rep.picks.map((p) => (
                    <div key={p.id} className={`fm-player-row fm-pos-${p.pos}`} onClick={() => setDetailId(p.id)}>
                      <span className="fm-player-row__badge">{p.role}</span>
                      <span className="fm-player-row__name">
                        {p.name}
                        <span className="fm-player-row__sub">
                          {p.nat} · {p.age}y · {clubName(p.clubId)}
                        </span>
                      </span>
                      <button className="fm-btn fm-btn--small fm-btn--primary" onClick={(e) => { e.stopPropagation(); doBuy(p.id); }}>
                        {formatMoney(askingPrice(p))}
                      </button>
                      <span
                        className={`fm-player-row__rating${p.rating >= 85 ? ' fm-player-row__rating--elite' : ''}`}
                      >
                        {p.rating}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {tab === 'offers' &&
        (state.incomingOffers.length === 0 ? (
          <p className="fm-hint">No offers this week.</p>
        ) : (
          <div className="fm-player-list">
            {state.incomingOffers.map((o) => {
              const p = state.players[o.playerId];
              if (!p) return null;
              const premium = o.amount > p.value;
              return (
                <div key={`${o.playerId}-${o.fromClubId}`} className={`fm-player-row fm-pos-${p.pos}`} onClick={() => setDetailId(p.id)}>
                  <span className="fm-player-row__badge">{p.role}</span>
                  <span className="fm-player-row__name">
                    {p.name}
                    <span className="fm-player-row__sub">
                      {clubName(o.fromClubId)} bids {formatMoney(o.amount)}
                      {premium ? ' (above value)' : ''}
                    </span>
                  </span>
                  <button className="fm-btn fm-btn--small fm-btn--primary" onClick={(e) => { e.stopPropagation(); doSell(o.playerId, true); }}>
                    Accept
                  </button>
                  <button
                    className="fm-btn fm-btn--small fm-btn--ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange({
                        ...state,
                        incomingOffers: state.incomingOffers.filter(
                          (x) => !(x.playerId === o.playerId && x.fromClubId === o.fromClubId)
                        ),
                      });
                    }}
                  >
                    Reject
                  </button>
                </div>
              );
            })}
          </div>
        ))}

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
