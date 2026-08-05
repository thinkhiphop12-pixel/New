'use client';

import { useEffect, useMemo, useState } from 'react';
import type { GameState, Negotiation, Player, Position } from '@/engine/types';
import {
  acceptIncomingOffer, askingPrice, buyPlayer, canBuy, counterIncomingOffer, delistPlayer,
  dismissNegotiation, getLoanMarket, getTransferMarket, isTransferBanned, listForSale,
  openNegotiation, rejectIncomingOffer, requestLoanIn, scoutRecommendations, submitFeeOffer,
  submitTermsOffer, toggleLoanList, transferTargets, triggerReleaseClause, walkAwayNegotiation,
  type MarketEntry, type MarketFilters,
} from '@/engine/transferMarket';
import { statusLabel, STATUS_ORDER } from '@/engine/negotiation';
import { getSquad } from '@/engine/teamManagement';
import { assignScout, newScouting, tickFacilitiesWeek, toggleShortlist } from '@/engine/facilities';
import { SEASON_ROUNDS } from '@/engine/gameRules';
import { weeklyWageBill } from '@/engine/seasonProgression';
import { formatMoney } from '@/engine/utils';
import { Icon } from './Icon';
import PlayerModal from './PlayerModal';

type MarketTab = 'hub' | 'search' | 'shortlist' | 'sent' | 'received';
const POSITIONS: (Position | 'ALL')[] = ['ALL', 'GK', 'DEF', 'MID', 'FWD'];
const AVAIL: { key: string; label: string }[] = [
  { key: 'all', label: 'Any' },
  { key: 'available', label: 'Available' },
  { key: 'listed', label: 'Listed' },
  { key: 'wants', label: 'Wants out' },
  { key: 'expiring', label: 'Expiring' },
];
const TABS: { id: MarketTab; label: string }[] = [
  { id: 'hub', label: 'Hub' },
  { id: 'search', label: 'Search' },
  { id: 'shortlist', label: 'Shortlist' },
  { id: 'sent', label: 'Offers Sent' },
  { id: 'received', label: 'Offers Received' },
];

export default function TransfersScreen({
  state,
  onChange,
}: {
  state: GameState;
  onChange: (next: GameState) => void;
}) {
  const [tab, setTab] = useState<MarketTab>('hub');
  const [posFilter, setPosFilter] = useState<Position | 'ALL'>('ALL');
  const [availFilter, setAvailFilter] = useState('all');
  const [natFilter, setNatFilter] = useState('');
  const [maxAge, setMaxAge] = useState(40);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [activeNegId, setActiveNegId] = useState<string | null>(null);

  const sc = state.scouting ?? newScouting();
  const shortlist = sc.shortlist;

  // Initialize scouting state if missing. Weekly progression happens at the
  // authoritative game-progress transition, not on mount, to prevent early
  // completion via repeated Transfers screen visits.
  useEffect(() => {
    if (!state.scouting) { onChange({ ...state, scouting: sc }); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const detail = detailId !== null ? state.players[detailId] : null;
  const negotiations = state.negotiations ?? [];
  const outgoing = negotiations.filter((n) => n.type === 'outgoing');
  const incoming = negotiations.filter((n) => n.type === 'incoming');
  const activeNeg = activeNegId ? negotiations.find((n) => n.id === activeNegId) ?? null : null;

  const filters: MarketFilters = { search, pos: posFilter, avail: availFilter };
  const marketRaw = useMemo(
    () => getTransferMarket(state, filters),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, search, posFilter, availFilter],
  );
  const market = useMemo(
    () => marketRaw.filter((p) => p.age <= maxAge && (!natFilter || p.nat === natFilter)).slice(0, 80),
    [marketRaw, maxAge, natFilter],
  );
  const nations = useMemo(
    () => Array.from(new Set(marketRaw.map((p) => p.nat))).sort().slice(0, 60),
    [marketRaw],
  );
  const loanMarket = useMemo(() => getLoanMarket(state).slice(0, 60), [state]);
  const mySquad = getSquad(state, state.userClubId).sort((a, b) => b.rating - a.rating);
  const reports = useMemo(() => scoutRecommendations(state), [state]);

  const shortlisted = useMemo(() => {
    const targets = transferTargets(state);
    const known = new Set(targets.map((p) => p.id));
    const extra = shortlist
      .filter((id) => !known.has(id))
      .map((id) => state.players[id])
      .filter((p): p is Player => !!p);
    return [...targets.filter((p) => shortlist.includes(p.id)), ...extra];
  }, [state, shortlist]);

  const apply = (result: { state: GameState; ok: boolean; message: string }) => {
    if (!result.ok) { setError(result.message); setNotice(null); return; }
    setError(null);
    setNotice(result.message);
    onChange(result.state);
  };

  const openTalks = (p: MarketEntry | Player) => {
    if (isTransferBanned(state, p.id)) { setError(`${p.name} won't talk to your club again this season.`); return; }
    const result = openNegotiation(state, p.id);
    apply(result);
    if (result.ok) {
      setTab('sent');
      const opened = (result.state.negotiations ?? []).find((n) => n.type === 'outgoing' && n.playerId === p.id);
      if (opened) setActiveNegId(opened.id);
    }
  };

  const doSign = (playerId: number) => {
    const check = canBuy(state, playerId);
    if (!check.ok) { setError(check.error ?? 'Cannot sign.'); return; }
    setError(null);
    onChange(toggleShortlist(buyPlayer(state, playerId), playerId));
  };

  const toggleScout = (playerId: number) => onChange(toggleShortlist(state, playerId));

  const clubName = (id: number) => (id === 0 ? 'Free agent' : state.clubs.find((c) => c.id === id)?.name ?? '—');
  const opponentClubs = state.clubs.filter((c) => c.id !== state.userClubId && !c.dormant).slice(0, 30);
  const activeAssignments = sc.assignments.filter((a) => !a.complete);

  return (
    <>
      <div className="fm-subnav__tabs" role="tablist" aria-label="Transfer market sections">
        {TABS.map((t) => {
          const count =
            t.id === 'sent' ? outgoing.length :
            t.id === 'received' ? incoming.filter((n) => n.awaiting === 'user').length :
            t.id === 'shortlist' ? shortlisted.length : 0;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`fm-subtab${tab === t.id ? ' active' : ''}`}
              onClick={() => { setTab(t.id); setActiveNegId(null); }}
            >
              <span className="fm-subtab__label">{t.label}{count ? ` (${count})` : ''}</span>
            </button>
          );
        })}
      </div>

      {error && <p className="fm-error-text">{error}</p>}
      {notice && !error && <p className="fm-hint" style={{ color: 'var(--green-600)' }}>{notice}</p>}

      {tab === 'hub' && (
        <div role="tabpanel">
          <TransferHub
          state={state}
          sc={sc}
          activeAssignments={activeAssignments}
          clubName={clubName}
          opponentClubs={opponentClubs}
          onChange={onChange}
          onGo={setTab}
        />
        </div>
      )}

      {tab === 'search' && (
        <div role="tabpanel">
          <div className="fm-filtercards">
            <FilterCard label="Position" icon="squad">
              <select className="fm-search" value={posFilter} onChange={(e) => setPosFilter(e.target.value as Position | 'ALL')}>
                {POSITIONS.map((p) => <option key={p} value={p}>{p === 'ALL' ? 'Any' : p}</option>)}
              </select>
            </FilterCard>
            <FilterCard label="Nationality" icon="flag">
              <select className="fm-search" value={natFilter} onChange={(e) => setNatFilter(e.target.value)}>
                <option value="">Any</option>
                {nations.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </FilterCard>
            <FilterCard label="Status" icon="info">
              <select className="fm-search" value={availFilter} onChange={(e) => setAvailFilter(e.target.value)}>
                {AVAIL.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
              </select>
            </FilterCard>
            <FilterCard label="Age" icon="person">
              <select className="fm-search" value={maxAge} onChange={(e) => setMaxAge(Number(e.target.value))}>
                <option value={40}>Any</option>
                <option value={21}>Under 21</option>
                <option value={24}>Under 24</option>
                <option value={28}>Under 28</option>
              </select>
            </FilterCard>
          </div>
          <input
            className="fm-search"
            style={{ marginBottom: 10 }}
            placeholder="Search name or nation…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
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
                  <button
                    className={`fm-btn fm-btn--small${shortlist.includes(p.id) ? ' fm-btn--secondary' : ' fm-btn--ghost'}`}
                    onClick={(e) => { e.stopPropagation(); toggleScout(p.id); }}
                  >
                    {shortlist.includes(p.id) ? 'Shortlisted' : 'Shortlist'}
                  </button>
                  {p.releaseClauseFee != null && p.releaseClauseFee <= state.budget && (
                    <button
                      className="fm-btn fm-btn--small fm-btn--ghost"
                      onClick={(e) => { e.stopPropagation(); apply(triggerReleaseClause(state, p.id)); setTab('sent'); }}
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

          <p className="fm-label" style={{ marginTop: 18 }}>Loan market</p>
          <div className="fm-player-list">
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
            {loanMarket.length === 0 && <p className="fm-hint">Nobody suitable is available on loan right now.</p>}
          </div>

          <p className="fm-label" style={{ marginTop: 18 }}>My squad</p>
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
                <button className="fm-btn fm-btn--small fm-btn--ghost" onClick={(e) => { e.stopPropagation(); apply(toggleLoanList(state, p.id)); }}>
                  {p.loanListed ? 'Unlist loan' : 'Loan list'}
                </button>
                <span className={`fm-player-row__rating${p.rating >= 85 ? ' fm-player-row__rating--elite' : ''}`}>
                  {p.rating}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'shortlist' && (
        <div role="tabpanel">
          <div className="fm-player-list">
          <p className="fm-hint">Full shortlist, with a scouting-status dot per player — full colour once your scouts have a complete read on him, dim while a report is still pending.</p>
          {shortlisted.length === 0 && <p className="fm-hint">Nobody shortlisted yet. Tap “Shortlist” on a player from Search.</p>}
          {shortlisted.map((p) => {
            const assignment = sc.assignments.find((a) => a.kind === 'player-search' && a.foundPlayerIds?.includes(p.id));
            const known = assignment?.complete ?? false;
            return (
              <button key={p.id} type="button" className={`fm-player-row fm-pos-${p.pos}`} onClick={() => setDetailId(p.id)} style={{ background: 'transparent', border: 'inherit', padding: 'inherit', font: 'inherit', color: 'inherit', width: '100%', textAlign: 'left', cursor: 'pointer' }}>
                <span
                  aria-hidden
                  style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: known ? 'var(--green)' : 'var(--muted-dim)',
                  }}
                />
                <span className="fm-player-row__badge">{p.role}</span>
                <span className="fm-player-row__name">
                  {p.name}
                  <span className="fm-player-row__sub">
                    {p.nat} · {p.age}y · {clubName(p.clubId)} · {known ? 'scouted' : 'report pending'}
                  </span>
                </span>
                <span style={{ display: 'flex', gap: 6 }} onClick={(e) => e.stopPropagation()}>
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
              </button>
            );
          })}
          </div>
        </div>
      )}

      {tab === 'sent' && (
        <div role="tabpanel">
          <div className="fm-split" style={{ ['--split-ratio' as string]: '1fr 1.3fr' }}>
          <div className="fm-panel">
            <p className="fm-label" style={{ marginTop: 0 }}>Sent</p>
            {outgoing.length === 0 && <p className="fm-hint">No talks open. Approach a target from Search.</p>}
            <div className="fm-player-list">
              {outgoing.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className={`fm-player-row fm-pos-${n.playerPos}${activeNegId === n.id ? ' active' : ''}`}
                  onClick={() => setActiveNegId(n.id)}
                  style={{ background: 'transparent', border: 'inherit', padding: 'inherit', font: 'inherit', color: 'inherit', width: '100%', textAlign: 'left', cursor: 'pointer' }}
                >
                  <span className="fm-player-row__name">
                    {n.playerName}
                    <span className="fm-player-row__sub">
                      {n.clubName} · {n.stage === 'fee' ? 'Agreeing fee' : n.stage === 'terms' ? 'Agreeing terms' : 'Outbid'}
                      {n.awaiting === 'club' ? ' · awaiting reply' : ' · your move'}
                    </span>
                  </span>
                  <span className="fm-player-row__rating">{n.playerRating}</span>
                </button>
              ))}
            </div>
          </div>
          {activeNeg ? (
            <NegotiationPanel state={state} neg={activeNeg} onApply={apply} onBack={() => setActiveNegId(null)} />
          ) : (
            <div className="fm-panel">
              <p className="fm-hint">Select a deal on the left to see its terms.</p>
            </div>
          )}
          </div>
        </div>
      )}

      {tab === 'received' && (
        <div role="tabpanel">
          <div className="fm-player-list">
          {incoming.length === 0 && <p className="fm-hint">No bids for your players this week.</p>}
          {incoming.map((n) => (
            <div key={n.id} className="fm-received-row">
              <button type="button" className="fm-received-row__head" onClick={() => setDetailId(n.playerId)} style={{ background: 'transparent', border: 'none', padding: 0, font: 'inherit', color: 'inherit', width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span className="fm-player-row__name">
                  {n.playerName}
                  <span className="fm-player-row__sub">from {n.clubName}</span>
                </span>
                <span style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800 }}>
                    {n.isLoan ? 'Loan bid' : formatMoney(n.fee ?? n.lastCounter ?? 0)}
                  </div>
                  <div className="fm-hint" style={{ margin: 0 }}>
                    {n.awaiting === 'user' ? 'Awaiting your reply' : 'Awaiting their reply'}
                    {n.rival ? ` · rival: ${n.rival.clubName} ${formatMoney(n.rival.offer)}` : ''}
                  </div>
                </span>
              </button>
              {n.awaiting === 'user' && (
                <div className="fm-received-row__actions">
                  <button
                    className="fm-btn fm-btn--small fm-btn--primary"
                    onClick={() => apply(acceptIncomingOffer(state, n.id))}
                  >
                    {n.isLoan ? 'Approve loan' : 'Accept'}
                  </button>
                  {!n.isLoan && (
                    <button
                      className="fm-btn fm-btn--small fm-btn--ghost"
                      onClick={() => {
                        const counter = Math.round((n.fee ?? 0) * 1.15);
                        apply(counterIncomingOffer(state, n.id, counter));
                      }}
                    >
                      Counter {formatMoney(Math.round((n.fee ?? 0) * 1.15))}
                    </button>
                  )}
                  <button
                    className="fm-btn fm-btn--small fm-btn--ghost"
                    onClick={() => apply(n.stage === 'outbid' ? dismissNegotiation(state, n.id) : rejectIncomingOffer(state, n.id))}
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
          </div>
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

/** Hub tab: budget ring + season-window countdown + scouting assignments,
 *  with quick links into the other four tabs. The mock's ring tracks a
 *  transfer-deadline day-count this engine doesn't model (there's no
 *  separate transfer-window field — see engine/types.ts's GameState); the
 *  ring here instead tracks the real, honest analogue: how much of the
 *  48-round season is behind you. */
function TransferHub({
  state,
  sc,
  activeAssignments,
  clubName,
  opponentClubs,
  onChange,
  onGo,
}: {
  state: GameState;
  sc: NonNullable<GameState['scouting']>;
  activeAssignments: NonNullable<GameState['scouting']>['assignments'];
  clubName: (id: number) => string;
  opponentClubs: GameState['clubs'];
  onChange: (next: GameState) => void;
  onGo: (t: MarketTab) => void;
}) {
  const weeksLeft = Math.max(0, SEASON_ROUNDS - state.week + 1);
  const pct = Math.round((state.week / SEASON_ROUNDS) * 100);
  const wageBill = weeklyWageBill(state);

  return (
    <>
      <div className="fm-split" style={{ ['--split-ratio' as string]: '1fr 1.3fr' }}>
        <div className="fm-panel">
          <p className="fm-label" style={{ marginTop: 0 }}>Transfer budget</p>
          <div className="fm-attr-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: 16 }}>
            <div>
              <p className="fm-hint" style={{ margin: 0 }}>TRANSFER</p>
              <p style={{ fontSize: 20, fontWeight: 900, margin: 0 }}>{formatMoney(state.budget)}</p>
            </div>
            <div>
              <p className="fm-hint" style={{ margin: 0 }}>WAGES</p>
              <p style={{ fontSize: 20, fontWeight: 900, margin: 0 }}>{formatMoney(wageBill)} pw</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="fm-ring" style={{ ['--ring-pct' as string]: pct, ['--ring-color' as string]: 'var(--green)' }}>
              <span className="fm-ring__value">{weeksLeft}</span>
            </div>
            <p className="fm-club-line" style={{ margin: 0 }}>Weeks left<br />this season</p>
          </div>
        </div>

        <div className="fm-panel">
          <p className="fm-label" style={{ marginTop: 0 }}>Scouting assignments</p>
          <p className="fm-club-line">Assign scouts to opponents or player searches. Reports land after their due week.</p>
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
            {opponentClubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          {activeAssignments.length > 0 ? (
            <ul className="fm-news" style={{ marginTop: 10 }}>
              {activeAssignments.map((a) => {
                const total = Math.max(1, a.dueWeek - a.startWeek || 1);
                const progress = Math.round((1 - a.weeksRemaining / total) * 100);
                const region =
                  a.kind === 'opponent' ? clubName(a.targetClubId ?? 0)
                  : a.kind === 'youth' ? 'Youth scouting'
                  : 'Player search';
                return (
                  <li key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="fm-icon-tile fm-icon-tile--sm"><Icon name="binoculars" size={16} /></span>
                    <span style={{ flex: 1 }}>
                      {region}
                      <span className="fm-hint" style={{ display: 'block' }}>{a.scoutName}</span>
                    </span>
                    <span className="fm-hint">{Math.max(0, Math.min(100, progress))}%</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="fm-hint">No scouts out in the field right now.</p>
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
      </div>

      <div className="fm-filters" style={{ marginTop: 14 }}>
        <button className="fm-pill" onClick={() => onGo('search')}>Search the market</button>
        <button className="fm-pill" onClick={() => onGo('shortlist')}>View shortlist</button>
        <button className="fm-pill" onClick={() => onGo('sent')}>Offers sent</button>
        <button className="fm-pill" onClick={() => onGo('received')}>Offers received</button>
      </div>
    </>
  );
}

function FilterCard({ label, icon, children }: { label: string; icon: Parameters<typeof Icon>[0]['name']; children: React.ReactNode }) {
  return (
    <div className="fm-filtercard">
      <p className="fm-filtercard__label">{label}</p>
      <div className="fm-icon-tile" style={{ margin: '0 auto 10px' }}>
        <Icon name={icon} size={18} />
      </div>
      {children}
    </div>
  );
}

/**
 * A negotiation is a conversation, not a form — the log reads top to bottom
 * like a transcript, and only the action the current stage actually allows
 * (a fee, then terms) is offered. A `.fm-ledger` summary sits above it so
 * the current ask vs your live offer reads at a glance before scrolling the
 * transcript, matching the mock's Negotiation Detail card.
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

  const ledgerRows: { label: string; current: string; offer: string | null }[] = [
    { label: 'Fee', current: formatMoney(neg.neg.asking), offer: neg.lastFee != null ? formatMoney(neg.lastFee) : null },
    { label: 'Wage', current: formatMoney(neg.neg.wageDemand), offer: neg.lastWage != null ? formatMoney(neg.lastWage) : null },
  ];
  if (neg.contractYears) ledgerRows.push({ label: 'Contract', current: '—', offer: `${neg.contractYears}y` });

  return (
    <div className="fm-panel fm-negotiation">
      <button className="fm-btn fm-btn--small fm-btn--ghost" onClick={onBack}>&larr; All negotiations</button>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', margin: '10px 0 4px' }}>
        <div>
          <h3 style={{ margin: 0 }}>{neg.playerName}</h3>
          <p className="fm-hint" style={{ margin: 0 }}>{neg.clubName} · {neg.playerPos}</p>
        </div>
        <span className={`fm-badge${neg.awaiting === 'club' ? '' : ' fm-badge--new'}`}>
          {statusLabel(neg.projectedStatus)}
        </span>
      </div>

      <div className="fm-ledger-card">
        {ledgerRows.map((r) => (
          <div className="fm-ledger-card__row" key={r.label}>
            <span className="fm-ledger-card__label">{r.label}</span>
            <span className="fm-ledger-card__current">{r.current}</span>
            <span className={`fm-ledger-card__offer${r.offer ? ' fm-ledger-card__offer--up' : ''}`}>{r.offer ?? '—'}</span>
          </div>
        ))}
      </div>
      {neg.demands.length > 0 && <p className="fm-hint">Wants: {neg.demands.join(', ')}</p>}

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
