'use client';

import { useMemo, useState } from 'react';
import type { GameState, Negotiation, Position } from '@/engine/types';
import {
  acceptIncomingOffer, counterIncomingOffer, delistPlayer, dismissNegotiation, getLoanMarket,
  getTransferMarket, isTransferBanned, listForSale, openNegotiation, rejectIncomingOffer,
  requestLoanIn, submitFeeOffer, submitTermsOffer, toggleLoanList, triggerReleaseClause,
  walkAwayNegotiation, type MarketEntry, type MarketFilters,
} from '@/engine/transferMarket';
import { statusLabel, STATUS_ORDER } from '@/engine/negotiation';
import { getSquad } from '@/engine/teamManagement';
import { formatMoney } from '@/engine/utils';
import PlayerModal from './PlayerModal';

type MarketTab = 'market' | 'negotiations' | 'incoming' | 'squad' | 'loans';
const POSITIONS: (Position | 'ALL')[] = ['ALL', 'GK', 'DEF', 'MID', 'FWD'];
const AVAIL: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'available', label: 'Available' },
  { key: 'listed', label: 'Listed' },
  { key: 'wants', label: 'Wants out' },
  { key: 'expiring', label: 'Expiring' },
];

export default function TransfersScreen({
  state,
  onChange,
}: {
  state: GameState;
  onChange: (next: GameState) => void;
}) {
  const [tab, setTab] = useState<MarketTab>('market');
  const [posFilter, setPosFilter] = useState<Position | 'ALL'>('ALL');
  const [availFilter, setAvailFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [activeNegId, setActiveNegId] = useState<string | null>(null);

  const detail = detailId !== null ? state.players[detailId] : null;
  const negotiations = state.negotiations ?? [];
  const outgoing = negotiations.filter((n) => n.type === 'outgoing');
  const incoming = negotiations.filter((n) => n.type === 'incoming');
  const activeNeg = activeNegId ? negotiations.find((n) => n.id === activeNegId) ?? null : null;

  const filters: MarketFilters = { search, pos: posFilter, avail: availFilter };
  const market = useMemo(
    () => getTransferMarket(state, filters).slice(0, 80),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, search, posFilter, availFilter],
  );
  const loanMarket = useMemo(() => getLoanMarket(state).slice(0, 60), [state]);
  const mySquad = getSquad(state, state.userClubId).sort((a, b) => b.rating - a.rating);

  const apply = (result: { state: GameState; ok: boolean; message: string }) => {
    if (!result.ok) { setError(result.message); setNotice(null); return; }
    setError(null);
    setNotice(result.message);
    onChange(result.state);
  };

  const openTalks = (p: MarketEntry) => {
    if (isTransferBanned(state, p.id)) { setError(`${p.name} won't talk to your club again this season.`); return; }
    const result = openNegotiation(state, p.id);
    apply(result);
    if (result.ok) {
      setTab('negotiations');
      const opened = (result.state.negotiations ?? []).find((n) => n.type === 'outgoing' && n.playerId === p.id);
      if (opened) setActiveNegId(opened.id);
    }
  };

  const clubName = (id: number) => (id === 0 ? 'Free agent' : state.clubs.find((c) => c.id === id)?.name ?? '—');

  return (
    <>
      <div className="fm-division-toggle" style={{ alignSelf: 'center' }}>
        <button className={tab === 'market' ? 'active' : ''} onClick={() => setTab('market')}>Market</button>
        <button className={tab === 'negotiations' ? 'active' : ''} onClick={() => setTab('negotiations')}>
          Negotiations{outgoing.length ? ` (${outgoing.length})` : ''}
        </button>
        <button className={tab === 'incoming' ? 'active' : ''} onClick={() => setTab('incoming')}>
          Incoming{incoming.length ? ` (${incoming.length})` : ''}
        </button>
        <button className={tab === 'squad' ? 'active' : ''} onClick={() => setTab('squad')}>My Squad</button>
        <button className={tab === 'loans' ? 'active' : ''} onClick={() => setTab('loans')}>Loans</button>
      </div>

      {error && <p className="fm-error-text">{error}</p>}
      {notice && !error && <p className="fm-hint" style={{ color: 'var(--green-600)' }}>{notice}</p>}

      {tab === 'market' && (
        <>
          <div className="fm-filters">
            {POSITIONS.map((p) => (
              <button key={p} className={`fm-pill${posFilter === p ? ' active' : ''}`} onClick={() => setPosFilter(p)}>
                {p}
              </button>
            ))}
            {AVAIL.map((a) => (
              <button key={a.key} className={`fm-pill${availFilter === a.key ? ' active' : ''}`} onClick={() => setAvailFilter(a.key)}>
                {a.label}
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
            {market.map((p) => {
              const banned = isTransferBanned(state, p.id);
              const alreadyTalking = outgoing.some((n) => n.playerId === p.id);
              return (
                <div key={p.id} className={`fm-player-row fm-pos-${p.pos}`} onClick={() => setDetailId(p.id)}>
                  <span className="fm-player-row__badge">{p.role}</span>
                  <span className="fm-player-row__name">
                    {p.name}
                    <span className="fm-player-row__sub">
                      {p.nat} · {p.age}y · {p.clubName}
                      {p.status.listed && ' · Listed'}
                      {p.status.unsettled && ' · Wants out'}
                      {p.status.expiring && ` · ${p.status.monthsLeft}mo left`}
                      {p.releaseClauseFee != null && ` · Clause ${formatMoney(p.releaseClauseFee)}`}
                    </span>
                  </span>
                  {p.releaseClauseFee != null && p.releaseClauseFee <= state.budget && (
                    <button
                      className="fm-btn fm-btn--small fm-btn--ghost"
                      onClick={(e) => { e.stopPropagation(); apply(triggerReleaseClause(state, p.id)); setTab('negotiations'); }}
                    >
                      Trigger clause
                    </button>
                  )}
                  <button
                    className="fm-btn fm-btn--small fm-btn--primary"
                    disabled={banned || alreadyTalking}
                    onClick={(e) => { e.stopPropagation(); openTalks(p); }}
                  >
                    {banned ? 'Won’t talk' : alreadyTalking ? 'Talking' : `Guide ${formatMoney(p.askingGuide)}`}
                  </button>
                  <span className={`fm-player-row__rating${p.rating >= 85 ? ' fm-player-row__rating--elite' : ''}`}>
                    {p.rating}
                  </span>
                </div>
              );
            })}
            {market.length === 0 && <p className="fm-hint">No players match those filters.</p>}
          </div>
        </>
      )}

      {tab === 'negotiations' && (
        activeNeg ? (
          <NegotiationPanel
            state={state}
            neg={activeNeg}
            onApply={apply}
            onBack={() => setActiveNegId(null)}
          />
        ) : (
          <div className="fm-player-list">
            {outgoing.length === 0 && <p className="fm-hint">No talks open. Approach a target from the Market tab.</p>}
            {outgoing.map((n) => (
              <div key={n.id} className={`fm-player-row fm-pos-${n.playerPos}`} onClick={() => setActiveNegId(n.id)}>
                <span className="fm-player-row__name">
                  {n.playerName}
                  <span className="fm-player-row__sub">
                    {n.clubName} · {n.stage === 'fee' ? 'Agreeing fee' : n.stage === 'terms' ? 'Agreeing terms' : 'Outbid'}
                    {n.awaiting === 'club' ? ' · awaiting reply' : ' · your move'}
                  </span>
                </span>
                <span className="fm-player-row__rating">{n.playerRating}</span>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'incoming' && (
        <div className="fm-player-list">
          {incoming.length === 0 && <p className="fm-hint">No bids for your players this week.</p>}
          {incoming.map((n) => (
            <div key={n.id} className={`fm-player-row fm-pos-${n.playerPos}`} onClick={() => setDetailId(n.playerId)}>
              <span className="fm-player-row__name">
                {n.playerName}
                <span className="fm-player-row__sub">
                  {n.clubName} {n.isLoan ? 'want him on loan' : `bid ${formatMoney(n.fee ?? n.lastCounter ?? 0)}`}
                  {n.rival ? ` · rival: ${n.rival.clubName} ${formatMoney(n.rival.offer)}` : ''}
                </span>
              </span>
              {n.awaiting === 'user' && !n.isLoan && (
                <>
                  <button className="fm-btn fm-btn--small fm-btn--primary" onClick={(e) => { e.stopPropagation(); apply(acceptIncomingOffer(state, n.id)); }}>
                    Accept
                  </button>
                  <button
                    className="fm-btn fm-btn--small fm-btn--ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      const counter = Math.round((n.fee ?? 0) * 1.15);
                      apply(counterIncomingOffer(state, n.id, counter));
                    }}
                  >
                    Counter {formatMoney(Math.round((n.fee ?? 0) * 1.15))}
                  </button>
                </>
              )}
              {n.awaiting === 'user' && n.isLoan && (
                <button className="fm-btn fm-btn--small fm-btn--primary" onClick={(e) => { e.stopPropagation(); apply(acceptIncomingOffer(state, n.id)); }}>
                  Approve loan
                </button>
              )}
              <button
                className="fm-btn fm-btn--small fm-btn--ghost"
                onClick={(e) => { e.stopPropagation(); apply(n.stage === 'outbid' ? dismissNegotiation(state, n.id) : rejectIncomingOffer(state, n.id)); }}
              >
                {n.stage === 'outbid' ? 'Dismiss' : 'Reject'}
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === 'squad' && (
        <div className="fm-player-list">
          {mySquad.map((p) => (
            <div key={p.id} className={`fm-player-row fm-pos-${p.pos}`} onClick={() => setDetailId(p.id)}>
              <span className="fm-player-row__badge">{p.role}</span>
              <span className="fm-player-row__name">
                {p.name}
                <span className="fm-player-row__sub">
                  {p.nat} · {p.age}y · value {formatMoney(p.value)}
                  {p.transferListed && ` · listed ${formatMoney(p.listingPrice ?? p.value)}`}
                  {p.loanListed && ' · loan-listed'}
                </span>
              </span>
              {p.transferListed ? (
                <button className="fm-btn fm-btn--small fm-btn--ghost" onClick={(e) => { e.stopPropagation(); apply(delistPlayer(state, p.id)); }}>
                  Delist
                </button>
              ) : (
                <button
                  className="fm-btn fm-btn--small fm-btn--danger"
                  onClick={(e) => { e.stopPropagation(); apply(listForSale(state, p.id, Math.round(p.value * 1.05))); }}
                >
                  List {formatMoney(Math.round(p.value * 1.05))}
                </button>
              )}
              <button
                className="fm-btn fm-btn--small fm-btn--ghost"
                onClick={(e) => { e.stopPropagation(); apply(toggleLoanList(state, p.id)); }}
              >
                {p.loanListed ? 'Unlist loan' : 'Loan list'}
              </button>
              <span className={`fm-player-row__rating${p.rating >= 85 ? ' fm-player-row__rating--elite' : ''}`}>
                {p.rating}
              </span>
            </div>
          ))}
        </div>
      )}

      {tab === 'loans' && (
        <div className="fm-player-list">
          <p className="fm-hint">Players other clubs will let go on loan.</p>
          {loanMarket.map((p) => (
            <div key={p.id} className={`fm-player-row fm-pos-${p.pos}`} onClick={() => setDetailId(p.id)}>
              <span className="fm-player-row__badge">{p.role}</span>
              <span className="fm-player-row__name">
                {p.name}
                <span className="fm-player-row__sub">
                  {p.nat} · {p.age}y · {p.clubName}{p.devLoan ? ' · development loan' : ''}
                </span>
              </span>
              <button
                className="fm-btn fm-btn--small fm-btn--primary"
                disabled={p.fee > state.budget}
                onClick={(e) => { e.stopPropagation(); apply(requestLoanIn(state, p.id)); }}
              >
                Enquire {formatMoney(p.fee)}
              </button>
              <span className={`fm-player-row__rating${p.rating >= 85 ? ' fm-player-row__rating--elite' : ''}`}>
                {p.rating}
              </span>
            </div>
          ))}
          {loanMarket.length === 0 && <p className="fm-hint">Nobody suitable is available right now.</p>}
        </div>
      )}

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

/**
 * A negotiation is a conversation, not a form — the log reads top to bottom
 * like a transcript, and only the action the current stage actually allows
 * (a fee, then terms) is offered.
 */
function NegotiationPanel({
  state,
  neg,
  onApply,
  onBack,
}: {
  state: GameState;
  neg: Negotiation;
  onApply: (r: { state: GameState; ok: boolean; message: string }) => void;
  onBack: () => void;
}) {
  const [fee, setFee] = useState(String(neg.neg.asking));
  const [wage, setWage] = useState(String(neg.neg.wageDemand));
  const [years, setYears] = useState(neg.contractYears);
  const [status, setStatus] = useState(neg.promisedStatus);
  const [bonus, setBonus] = useState(0);

  return (
    <div className="fm-negotiation">
      <button className="fm-btn fm-btn--small fm-btn--ghost" onClick={onBack}>&larr; All negotiations</button>
      <h3 style={{ margin: '10px 0 4px' }}>{neg.playerName} <span className="fm-hint">— {neg.clubName}</span></h3>
      <p className="fm-hint">
        {statusLabel(neg.projectedStatus)} projected · asking guide {formatMoney(neg.neg.asking)}
        {neg.demands.length > 0 && ` · wants: ${neg.demands.join(', ')}`}
      </p>

      <div className="fm-negotiation__log">
        {neg.log.map((m, i) => (
          <p key={i} className={`fm-negotiation__msg fm-negotiation__msg--${m.tone}`}>{m.text}</p>
        ))}
      </div>

      {neg.awaiting === 'club' ? (
        <p className="fm-hint">Waiting on {neg.clubName}'s reply next week.</p>
      ) : neg.stage === 'fee' ? (
        <div className="fm-negotiation__form">
          <label>
            Fee offer
            <input value={fee} onChange={(e) => setFee(e.target.value)} inputMode="numeric" />
          </label>
          <div className="fm-negotiation__actions">
            <button className="fm-btn fm-btn--primary" onClick={() => onApply(submitFeeOffer(state, neg.id, Number(fee) || 0))}>
              Submit bid
            </button>
            <button className="fm-btn fm-btn--ghost" onClick={() => { onApply(walkAwayNegotiation(state, neg.id)); onBack(); }}>
              Walk away
            </button>
          </div>
        </div>
      ) : neg.stage === 'terms' ? (
        <div className="fm-negotiation__form">
          <label>
            Weekly wage
            <input value={wage} onChange={(e) => setWage(e.target.value)} inputMode="numeric" />
          </label>
          <label>
            Contract length
            <select value={years} onChange={(e) => setYears(Number(e.target.value))}>
              {[1, 2, 3, 4, 5].map((y) => <option key={y} value={y}>{y} year{y > 1 ? 's' : ''}</option>)}
            </select>
          </label>
          <label>
            Promised status
            <select value={status ?? ''} onChange={(e) => setStatus((e.target.value || null) as typeof status)}>
              <option value="">No promise</option>
              {STATUS_ORDER.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
            </select>
          </label>
          <label>
            Signing bonus
            <input value={bonus} onChange={(e) => setBonus(Number(e.target.value) || 0)} inputMode="numeric" />
          </label>
          <div className="fm-negotiation__actions">
            <button
              className="fm-btn fm-btn--primary"
              onClick={() => onApply(submitTermsOffer(state, neg.id, Number(wage) || 0, {
                contractYears: years, promisedStatus: status, signingBonus: bonus,
              }))}
            >
              Offer terms
            </button>
            <button className="fm-btn fm-btn--ghost" onClick={() => { onApply(walkAwayNegotiation(state, neg.id)); onBack(); }}>
              Walk away
            </button>
          </div>
        </div>
      ) : (
        <div className="fm-negotiation__actions">
          <p className="fm-hint">Outbid — a rival club has agreed a deal ahead of you.</p>
          <button className="fm-btn fm-btn--ghost" onClick={() => { onApply(dismissNegotiation(state, neg.id)); onBack(); }}>
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
