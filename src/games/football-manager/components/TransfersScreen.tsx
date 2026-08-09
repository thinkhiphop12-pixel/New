'use client';

import { useEffect, useMemo, useState } from 'react';
import type { GameState, Negotiation, Player, Position } from '@/engine/types';
import {
  acceptIncomingOffer, askingPrice, buyPlayer, canBuy, counterIncomingOffer, delistPlayer,
  dismissNegotiation, getLoanMarket, getTransferMarket, isTransferBanned, listForSale,
  openLoanNegotiation, openNegotiation, rejectIncomingOffer, requestLoanIn, saleValue,
  scoutRecommendations, submitFeeOffer, submitLoanTermsOffer, submitTermsOffer, toggleLoanList,
  transferTargets, triggerReleaseClause, walkAwayNegotiation,
  type MarketEntry, type MarketFilters,
} from '@/engine/transferMarket';
import {
  LOAN_PLAYTIME, SELL_ON_MAX, effectiveBid, statusLabel, STATUS_ORDER, suggestBuyBack,
} from '@/engine/negotiation';
import { financesView } from '@/engine/finances';
import { getSquad, isOnLoan, wageCeiling } from '@/engine/teamManagement';
import { assignScout, newScouting, tickFacilitiesWeek, toggleShortlist } from '@/engine/facilities';
import { MIN_SQUAD_SIZE, TRANSFER_WINDOWS, transferWindow } from '@/engine/gameRules';
import { weeklyWageBill } from '@/engine/seasonProgression';
import { clamp, formatMoney } from '@/engine/utils';
import { traitNames } from '@/engine/traits';
import { Icon } from './Icon';
import PlayerModal from './PlayerModal';
import { PlayerCard } from './InboxScreen';

type MarketTab = 'search' | 'shortlist' | 'sent' | 'received';
const POSITIONS: (Position | 'ALL')[] = ['ALL', 'GK', 'DEF', 'MID', 'FWD'];
const AVAIL: { key: string; label: string }[] = [
  { key: 'all', label: 'Any' },
  { key: 'available', label: 'Available' },
  { key: 'listed', label: 'Listed' },
  { key: 'wants', label: 'Wants out' },
  { key: 'expiring', label: 'Expiring' },
];
const TABS: { id: MarketTab; label: string }[] = [
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
  const [tab, setTab] = useState<MarketTab>('search');
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
  // Gap 10 (Userbrain): the market used to sort purely by rating, so a
  // lower-division club with a small budget saw Salah/Mbappé-tier names at
  // the very top of every search — unrealistic, and it buried the loan
  // market (the actual route to a squad upgrade) below them. Nothing is
  // hidden — a huge reach signing should still be findable — but realistic
  // targets now sort first, and anything wildly out of budget carries a
  // "reputation gap" badge instead of reading as a normal, biddable option.
  const REACH_MULTIPLIER = 4;
  const marketCost = (p: MarketEntry) => (p.clubId === 0 ? askingPrice(p) : p.askingGuide);
  const isReach = (p: MarketEntry) => marketCost(p) > Math.max(state.budget, 1) * REACH_MULTIPLIER;
  const market = useMemo(
    () => {
      const filtered = marketRaw.filter((p) => p.age <= maxAge && (!natFilter || p.nat === natFilter));
      const realistic = filtered.filter((p) => !isReach(p));
      const reach = filtered.filter((p) => isReach(p));
      return [...realistic, ...reach].slice(0, 80);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [marketRaw, maxAge, natFilter, state.budget],
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

  const openLoanTalks = (p: MarketEntry | Player, offerType: 'loan' | 'loan_to_buy') => {
    if (isTransferBanned(state, p.id)) { setError(`${p.name} won't talk to your club again this season.`); return; }
    const result = openLoanNegotiation(state, p.id, offerType);
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
    // Clear him off the shortlist once he's signed — but only if he was on it.
    // This runs from Search too, where an unconditional toggle would *add* a
    // player you just bought to your list of targets.
    const bought = buyPlayer(state, playerId);
    onChange(shortlist.includes(playerId) ? toggleShortlist(bought, playerId) : bought);
  };

  const toggleScout = (playerId: number) => onChange(toggleShortlist(state, playerId));

  // The window gates every paid deal, so the screens where deals are started
  // have to say so up front — otherwise the buttons just fail on click.
  const win = transferWindow(state.week);

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

      {tab === 'search' && (
        <div role="tabpanel">
          <WindowNotice win={win} />
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
                  {isReach(p) && (
                    <span className="fm-badge fm-badge--gap" title="Well beyond your current budget — unlikely to move for you">
                      Reputation gap
                    </span>
                  )}
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
                  {/* A free agent has no club on the other side of the table,
                      so there is nothing to negotiate — `openNegotiation`
                      refuses him outright ("no club to negotiate with"). He
                      gets the direct signing action instead, and keeps it while
                      the window is shut, which is the exemption `canBuy` makes
                      for him. Everyone else goes through talks. */}
                  {p.clubId === 0 ? (
                    <button
                      className="fm-btn fm-btn--small fm-btn--primary"
                      disabled={askingPrice(p) > state.budget}
                      onClick={(e) => { e.stopPropagation(); doSign(p.id); }}
                    >
                      Sign {formatMoney(askingPrice(p))}
                    </button>
                  ) : (
                    <button
                      className="fm-btn fm-btn--small fm-btn--primary"
                      disabled={banned || alreadyTalking || !win.open}
                      title={!win.open ? `${win.name} window opens in ${win.weeksLeft} week${win.weeksLeft === 1 ? '' : 's'}` : undefined}
                      onClick={(e) => { e.stopPropagation(); openTalks(p); }}
                    >
                      {banned
                        ? 'Won’t talk'
                        : alreadyTalking
                          ? 'Talking'
                          : !win.open
                            ? 'Window shut'
                            : `Guide ${formatMoney(p.askingGuide)}`}
                    </button>
                  )}
                  <span className={`fm-player-row__rating${p.rating >= 85 ? ' fm-player-row__rating--elite' : ''}`}>
                    {p.rating}
                  </span>
                </div>
              );
            })}
            {market.length === 0 && <p className="fm-hint">No players match those filters.</p>}
          </div>

          <p className="fm-hint" style={{ margin: '12px 0 0', textAlign: 'left' }}>
            Can&apos;t compete for a big fee yet? Try the loan market below ↓
          </p>
          <p className="fm-label" style={{ marginTop: 8 }}>Loan market</p>
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
                {/* `requestLoanIn` refuses outright while the window is shut, so
                    the button has to say so up front — otherwise it reads as live
                    and the rejection only surfaces as an error after the click.
                    Same treatment as the Sign button above. Loans are a club-to-club
                    deal, so unlike free agents there is no shut-window exemption. */}
                <button
                  className="fm-btn fm-btn--small fm-btn--primary"
                  disabled={p.fee > state.budget || !win.open}
                  title={!win.open ? `${win.name} window opens in ${win.weeksLeft} week${win.weeksLeft === 1 ? '' : 's'}` : 'Instant yes/no — no back-and-forth'}
                  onClick={(e) => { e.stopPropagation(); apply(requestLoanIn(state, p.id)); }}
                >
                  {!win.open ? 'Window shut' : `Quick loan ${formatMoney(p.fee)}`}
                </button>
                {/* The negotiated alternative to the instant Quick Loan above —
                    opens real talks over wage share / playing time, and (Loan +
                    option) a buy-option fee, through the same negotiation panel
                    a transfer uses. */}
                <button
                  className="fm-btn fm-btn--small fm-btn--secondary"
                  disabled={!win.open}
                  onClick={(e) => { e.stopPropagation(); openLoanTalks(p, 'loan'); }}
                >
                  Negotiate loan
                </button>
                <button
                  className="fm-btn fm-btn--small fm-btn--ghost"
                  disabled={!win.open}
                  onClick={(e) => { e.stopPropagation(); openLoanTalks(p, 'loan_to_buy'); }}
                >
                  + buy option
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
          <WindowNotice win={win} />
          <div className="fm-player-list">
          <p className="fm-hint">Full shortlist, with a scouting-status dot per player — full colour once your scouts have a complete read on him, dim while a report is still pending.</p>
          {shortlisted.length === 0 && <p className="fm-hint">Nobody shortlisted yet. Tap “Shortlist” on a player from Search.</p>}
          {shortlisted.map((p) => {
            const assignment = sc.assignments.find((a) => a.kind === 'player-search' && a.foundPlayerIds?.includes(p.id));
            const known = assignment?.complete ?? false;
            return (
              <div key={p.id} className={`fm-player-row fm-pos-${p.pos}`} onClick={() => setDetailId(p.id)}>
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
                  <button className="fm-btn fm-btn--small fm-btn--ghost" onClick={() => toggleScout(p.id)}>
                    Drop
                  </button>
                  <button
                    className="fm-btn fm-btn--small fm-btn--primary"
                    disabled={askingPrice(p) > state.budget || (!win.open && p.clubId !== 0)}
                    title={!win.open && p.clubId !== 0 ? `${win.name} window opens in ${win.weeksLeft} week${win.weeksLeft === 1 ? '' : 's'}` : undefined}
                    onClick={() => doSign(p.id)}
                  >
                    {!win.open && p.clubId !== 0 ? 'Window shut' : `Sign ${formatMoney(askingPrice(p))}`}
                  </button>
                </span>
                <span className={`fm-player-row__rating${p.rating >= 85 ? ' fm-player-row__rating--elite' : ''}`}>
                  {p.rating}
                </span>
              </div>
            );
          })}
          </div>
        </div>
      )}

      {tab === 'sent' && (
        <div role="tabpanel">
          {/* Opening a deal replaces the list rather than sitting beside it —
              the offer sheet needs the full width to lay its fields out three
              across, and the panel's own "All negotiations" / "Close" actions
              only mean anything if there is something to go back to. */}
          {activeNeg ? (
            <NegotiationPanel state={state} neg={activeNeg} onApply={apply} onBack={() => setActiveNegId(null)} />
          ) : (
            <div className="fm-panel">
              <p className="fm-label" style={{ marginTop: 0 }}>Sent</p>
              {outgoing.length === 0 && <p className="fm-hint">No talks open. Approach a target from Search.</p>}
              <div className="fm-player-list">
                {outgoing.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    className={`fm-player-row fm-pos-${n.playerPos}`}
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
          )}
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
  const wageBill = weeklyWageBill(state);
  const ceiling = wageCeiling(state);
  const wagePct = ceiling > 0 ? Math.min(100, Math.round((wageBill / ceiling) * 100)) : 0;

  // Real deadline, not season progress: when the window is open the ring
  // counts down to deadline day; when it is shut it counts down to the next
  // window opening, and turns gold to say the market is closed.
  const win = transferWindow(state.week);
  const span = win.open
    ? (TRANSFER_WINDOWS.find((w) => w.name === win.name)?.closes ?? 0) -
      (TRANSFER_WINDOWS.find((w) => w.name === win.name)?.opens ?? 0) + 1
    : 0;
  const windowPct = win.open && span > 0 ? Math.round(((span - win.weeksLeft) / span) * 100) : 100;

  return (
    <>
      <div className="fm-split" style={{ ['--split-ratio' as string]: '1fr 1.3fr' }}>
        <div className="fm-panel">
          <p className="fm-label" style={{ marginTop: 0 }}>Budgets</p>
          <div className="fm-attr-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: 12 }}>
            <div>
              <p className="fm-hint" style={{ margin: 0 }}>TRANSFER</p>
              <p style={{ fontSize: 20, fontWeight: 900, margin: 0 }}>{formatMoney(state.budget)}</p>
            </div>
            <div>
              <p className="fm-hint" style={{ margin: 0 }}>WAGES</p>
              <p style={{ fontSize: 20, fontWeight: 900, margin: 0 }}>{formatMoney(wageBill)} pw</p>
              <p className="fm-hint" style={{ margin: 0 }}>of {formatMoney(ceiling)} ceiling</p>
            </div>
          </div>
          <div className="fm-meter-row" style={{ marginBottom: 14 }}>
            <div className="fm-meter-row__head">
              <span>Wage budget used</span>
              <span className="fm-meter-row__value">{wagePct}%</span>
            </div>
            <div className="fm-meter-row__track">
              <div
                className="fm-meter-row__fill"
                style={{
                  width: `${wagePct}%`,
                  background: wagePct >= 95 ? 'var(--red)' : wagePct >= 80 ? 'var(--gold)' : 'var(--green)',
                }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              className="fm-ring"
              style={{
                ['--ring-pct' as string]: windowPct,
                ['--ring-color' as string]: win.open ? 'var(--green)' : 'var(--gold)',
              }}
            >
              <span className="fm-ring__value">{win.weeksLeft}</span>
            </div>
            <p className="fm-club-line" style={{ margin: 0 }}>
              {win.open ? (
                <>
                  <strong>{win.name} window open</strong>
                  <br />
                  {win.weeksLeft === 0
                    ? 'Deadline day — last week to deal'
                    : `${win.weeksLeft} week${win.weeksLeft === 1 ? '' : 's'} to deadline`}
                </>
              ) : (
                <>
                  <strong>Window shut</strong>
                  <br />
                  {win.weeksLeft > 0
                    ? `${win.name} opens in ${win.weeksLeft} week${win.weeksLeft === 1 ? '' : 's'}`
                    : 'No window left this season'}
                  <br />
                  Free agents can still be signed.
                </>
              )}
            </p>
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

/**
 * Deadline banner for the two screens deals are started from.
 *
 * Without this the window is invisible here — Search and Shortlist would
 * offer buttons that simply fail, with the state only explained a tab away
 * on the Hub. Says nothing at all while the window is open, so it costs no
 * space in the case that matters most.
 */
function WindowNotice({ win }: { win: ReturnType<typeof transferWindow> }) {
  if (win.open) {
    return win.weeksLeft <= 1 ? (
      <p className="fm-hint" style={{ color: 'var(--gold-2)', marginTop: 0 }}>
        <Icon name="warning" size={12} style={{ verticalAlign: -1 }} />{' '}
        {win.weeksLeft === 0
          ? `Deadline day — last week of the ${win.name} window.`
          : `${win.name} window closes after next week.`}
      </p>
    ) : null;
  }
  return (
    <p className="fm-hint" style={{ color: 'var(--gold-2)', marginTop: 0 }}>
      <Icon name="warning" size={12} style={{ verticalAlign: -1 }} /> Transfer window shut
      {win.weeksLeft > 0
        ? ` — the ${win.name} window opens in ${win.weeksLeft} week${win.weeksLeft === 1 ? '' : 's'}.`
        : ' — no window remains this season.'}{' '}
      Free agents can still be signed.
    </p>
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

function Stepper({
  value,
  onChange,
  step,
  min = 0,
  max,
  format,
  locked,
  highlight,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  step: number;
  min?: number;
  max?: number;
  format: (v: number) => string;
  locked?: boolean;
  /** Draw the contested-field treatment — the value the other side is arguing over. */
  highlight?: boolean;
  /** Accessible name for the two buttons, e.g. "transfer fee". */
  label?: string;
}) {
  if (locked) {
    return (
      <div className="fm-stepper fm-stepper--locked">
        <span className="fm-stepper__value">{format(value)}</span>
      </div>
    );
  }
  return (
    <div className={`fm-stepper${highlight ? ' fm-stepper--hot' : ''}`}>
      <button
        type="button"
        className="fm-stepper__btn"
        aria-label={`Decrease${label ? ` ${label}` : ''}`}
        disabled={value - step < min}
        onClick={() => onChange(Math.max(min, value - step))}
      >
        −
      </button>
      <span className="fm-stepper__value">{format(value)}</span>
      <button
        type="button"
        className="fm-stepper__btn"
        aria-label={`Increase${label ? ` ${label}` : ''}`}
        disabled={max != null && value + step > max}
        onClick={() => onChange(max != null ? Math.min(max, value + step) : value + step)}
      >
        +
      </button>
    </div>
  );
}

/**
 * One cell of the offer sheet: an uppercase label with an optional padlock,
 * and whatever control edits it. The padlock is the whole reason this exists —
 * every field on the sheet stays visible at every stage, and the lock is what
 * says "this one is settled" rather than the field vanishing from the grid.
 */
function OfferField({
  label,
  locked,
  hint,
  children,
}: {
  label: string;
  locked?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="fm-offer-field">
      <span className="fm-offer-field__label">
        {locked && <Icon name="lock" size={11} className="fm-offer-field__lock" />}
        {label}
      </span>
      {children}
      {hint && <span className="fm-offer-field__hint">{hint}</span>}
    </div>
  );
}

/** Read-only dropdown-alike, for a select whose value the stage has fixed. */
function LockedValue({ children }: { children: React.ReactNode }) {
  return <div className="fm-stepper fm-stepper--locked"><span className="fm-stepper__value">{children}</span></div>;
}

type NegTab = 'current' | 'previous' | 'interest';

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
  const [tab, setTab] = useState<NegTab>('current');
  const [fee, setFee] = useState(neg.neg.asking);
  const [wage, setWage] = useState(neg.neg.wageDemand);
  const [years, setYears] = useState(neg.contractYears);
  const [status, setStatus] = useState(neg.promisedStatus);
  const [bonus, setBonus] = useState(0);
  const [wageShare, setWageShare] = useState(neg.loanTerms?.minWageShare ?? 0.5);
  const [playingTime, setPlayingTime] = useState<'regular' | 'occasional' | null>(
    neg.loanTerms?.requiresPlayingTime ? 'regular' : null
  );
  const [buyOptionFee, setBuyOptionFee] = useState(neg.loanTerms?.minBuyOption ?? 0);
  // The rest of the offer sheet. Sell-on and buy-back start at nothing —
  // clauses are something you choose to concede, never a default.
  const [sellOnPct, setSellOnPct] = useState(neg.sellOnPct ?? 0);
  const [buyBackFee, setBuyBackFee] = useState(neg.buyBackFee ?? 0);
  const [exchangeId, setExchangeId] = useState<number | null>(neg.exchangePlayerId ?? null);
  const [endOfSeason, setEndOfSeason] = useState(!!neg.endOfSeason);
  const [showHelp, setShowHelp] = useState(false);

  const offerType = neg.offerType ?? 'transfer';
  const player = state.players[neg.playerId];
  const traits = player ? traitNames(player) : [];
  const advice = neg.log[1]?.text ?? neg.log[0]?.text;

  const walk = () => { onApply(walkAwayNegotiation(state, neg.id)); onBack(); };

  // Whatever the stage, the sheet shows the same six fields — these say which
  // of them the user may still move.
  const waiting = neg.awaiting === 'club';
  const feeStage = neg.stage === 'fee' && !waiting;
  const marketValue = neg.marketValue ?? player?.value ?? 0;

  // A part-exchange can only be offered on a permanent deal, and only with a
  // player you own outright and can spare.
  const squad = getSquad(state, state.userClubId);
  const swappable = squad.filter((p) => !p.loan && !isOnLoan(p));
  const canTrade = squad.length > MIN_SQUAD_SIZE && offerType === 'transfer';
  const exchange = exchangeId != null ? state.players[exchangeId] : null;

  // The board's two ceilings and its patience, exactly as the sheet in the
  // real game shows them — a signing can clear one and fail the other.
  const wageCap = wageCeiling(state);
  const wageBill = weeklyWageBill(state);
  const mood = clamp(financesView(state).boardConfidence, 0, 100);

  const clauses = {
    sellOnPct, buyBackFee,
    exchangePlayerId: canTrade ? exchangeId : null,
    endOfSeason: endOfSeason && !neg.preContract,
  };
  // What the seller hears, so the sheet can explain why a bid under the
  // asking price is still worth sending.
  const packageValue = effectiveBid(fee, marketValue, {
    sellOnPct, buyBackFee,
    exchangeValue: canTrade && exchange ? saleValue(exchange) : 0,
    endOfSeason: clauses.endOfSeason,
  });

  const submitCurrent = () => {
    if (neg.stage === 'fee') return onApply(submitFeeOffer(state, neg.id, fee, clauses));
    if (neg.stage === 'terms') {
      return onApply(submitTermsOffer(state, neg.id, wage, {
        contractYears: years, promisedStatus: status, signingBonus: bonus,
      }));
    }
    return onApply(submitLoanTermsOffer(state, neg.id, {
      wageShare, playingTime, buyOptionFee: offerType === 'loan_to_buy' ? buyOptionFee : undefined,
    }));
  };

  const acceptLabel = neg.stage === 'fee' ? 'Accept Offer'
    : neg.stage === 'terms' ? 'Offer Terms' : 'Offer Loan Terms';

  return (
    <div className="fm-panel fm-negotiation">
      <button className="fm-btn fm-btn--small fm-btn--ghost" onClick={onBack}>&larr; All negotiations</button>

      {/* Not `.fm-split`: this panel is itself the right pane of the Sent
          tab's split, so how much room it has depends on that grid and not on
          the viewport `.fm-split` measures. A container query is the only
          thing that can see the difference. */}
      <div className="fm-negotiation__layout">
        <div className="fm-negotiation__card">
          {player && <PlayerCard p={player} club={state.clubs.find((c) => c.id === player.clubId)} seasonYear={state.seasonYear} />}
          {traits.length > 0 && (
            <div className="fm-negotiation__traits">
              {traits.map((t) => <span key={t} className="fm-trait">{t}</span>)}
            </div>
          )}
          <div className="fm-negotiation__meta">
            <div className="fm-negotiation__meta-row">
              <span className="fm-negotiation__meta-label">Asking price</span>
              <span className="fm-negotiation__meta-value">
                {neg.preContract ? 'Free (pre-contract)' : formatMoney(neg.neg.asking)}
              </span>
            </div>
            <div className="fm-negotiation__meta-row">
              <span className="fm-negotiation__meta-label">Squad status</span>
              <span className="fm-negotiation__meta-value">{statusLabel(neg.projectedStatus)}</span>
            </div>
            <div className="fm-negotiation__meta-row">
              <span className="fm-negotiation__meta-label">Interest</span>
              <span className="fm-negotiation__meta-value">
                {neg.rival ? `${neg.rival.clubName} + you` : 'You only'}
              </span>
            </div>
          </div>
        </div>

        <div>
          <div className="fm-offer-tabs">
            <div className="fm-offer-tabs__set" role="tablist">
              <button role="tab" aria-selected={tab === 'current'} className={`fm-offer-tab${tab === 'current' ? ' fm-offer-tab--active' : ''}`} onClick={() => setTab('current')}>Current Offer</button>
              <button role="tab" aria-selected={tab === 'previous'} className={`fm-offer-tab${tab === 'previous' ? ' fm-offer-tab--active' : ''}`} onClick={() => setTab('previous')}>Previous Offer</button>
              <button role="tab" aria-selected={tab === 'interest'} className={`fm-offer-tab${tab === 'interest' ? ' fm-offer-tab--active' : ''}`} onClick={() => setTab('interest')}>Interested Clubs</button>
            </div>
            <button
              type="button"
              className={`fm-offer-info${showHelp ? ' fm-offer-info--on' : ''}`}
              aria-label="Explain the offer fields"
              aria-expanded={showHelp}
              onClick={() => setShowHelp((v) => !v)}
            >
              <Icon name="info" size={16} />
            </button>
          </div>

          {showHelp && (
            <div className="fm-offer-help">
              <p><strong>Sell on percentage</strong> — a share of your profit if you sell him on later. Costs nothing now, so sellers only discount it a little.</p>
              <p><strong>Buy back fee</strong> — lets his old club re-sign him at a set price. The lower you set it, the more it is worth to them.</p>
              <p><strong>Exchange player</strong> — sends one of yours the other way. Real money to a seller, but valued at what they could sell him for, not what you think he is worth.</p>
              <p><strong>Transfer date</strong> — end of season leaves him with his club for the run-in. The fee leaves your budget when the deal is agreed.</p>
            </div>
          )}

          {tab === 'previous' && (
            <div className="fm-negotiation__log" style={{ marginTop: 12 }}>
              {neg.log.length === 0 && <p className="fm-hint">No offers exchanged yet.</p>}
              {neg.log.map((m, i) => (
                <p key={i} className={`fm-negotiation__msg fm-negotiation__msg--${m.tone}`}>{m.text}</p>
              ))}
            </div>
          )}

          {tab === 'interest' && (
            <div style={{ marginTop: 12 }}>
              {neg.rival ? (
                <p className="fm-hint">{neg.rival.clubName} are also in talks for {neg.playerName}, offering {formatMoney(neg.rival.offer)}.</p>
              ) : (
                <p className="fm-hint">No other clubs are known to be interested right now.</p>
              )}
            </div>
          )}

          {tab === 'current' && (
            <div className="fm-offer-sheet">
              {neg.stage === 'outbid' ? (
                <div className="fm-negotiation__actions">
                  <p className="fm-hint">Outbid — a rival club has agreed a deal ahead of you.</p>
                  <button className="fm-btn fm-btn--ghost" onClick={() => { onApply(dismissNegotiation(state, neg.id)); onBack(); }}>
                    Dismiss
                  </button>
                </div>
              ) : (
                <>
                  {/* The fee half of the sheet. Always six fields: the stage
                      locks the ones it has already settled rather than hiding
                      them, so the deal reads the same all the way through. */}
                  <div className="fm-offer-grid">
                    <OfferField label="Offer type" locked>
                      <LockedValue>
                        {offerType === 'transfer' ? 'Transfer' : offerType === 'loan' ? 'Loan' : 'Loan + buy option'}
                      </LockedValue>
                    </OfferField>

                    <OfferField
                      label="Transfer fee"
                      locked={!feeStage}
                      hint={feeStage && packageValue > fee ? `Worth ${formatMoney(packageValue)} to them with clauses` : undefined}
                    >
                      {feeStage ? (
                        <Stepper value={fee} onChange={setFee} step={100000} max={state.budget} format={formatMoney} highlight label="transfer fee" />
                      ) : (
                        <LockedValue>{neg.preContract ? 'Free' : formatMoney(neg.agreedFee ?? neg.lastFee ?? fee)}</LockedValue>
                      )}
                    </OfferField>

                    <OfferField label="Transfer date" locked={!feeStage || neg.preContract}>
                      {feeStage && !neg.preContract ? (
                        <select
                          aria-label="Transfer date"
                          value={endOfSeason ? 'end' : 'now'}
                          onChange={(e) => setEndOfSeason(e.target.value === 'end')}
                        >
                          <option value="now">Immediate</option>
                          <option value="end">End of season</option>
                        </select>
                      ) : (
                        <LockedValue>{neg.preContract ? 'Next season' : endOfSeason ? 'End of season' : 'Immediate'}</LockedValue>
                      )}
                    </OfferField>

                    <OfferField
                      label="Sell on percentage"
                      locked={!feeStage}
                      hint={sellOnPct > 0 ? 'Of your profit if you sell him on' : undefined}
                    >
                      {feeStage ? (
                        <Stepper
                          value={Math.round(sellOnPct * 100)}
                          onChange={(v) => setSellOnPct(v / 100)}
                          step={5}
                          max={Math.round(SELL_ON_MAX * 100)}
                          format={(v) => `${v}%`}
                          label="sell on percentage"
                        />
                      ) : (
                        <LockedValue>{Math.round(sellOnPct * 100)}%</LockedValue>
                      )}
                    </OfferField>

                    <OfferField label="Buy back fee" locked={!feeStage}>
                      {feeStage ? (
                        <div className="fm-offer-togglerow">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={buyBackFee > 0}
                            aria-label="Offer a buy back clause"
                            className={`fm-offer-toggle${buyBackFee > 0 ? ' fm-offer-toggle--on' : ''}`}
                            onClick={() => setBuyBackFee(buyBackFee > 0 ? 0 : Math.max(fee, suggestBuyBack(marketValue)))}
                          >
                            <Icon name="check" size={12} />
                          </button>
                          <Stepper
                            value={buyBackFee}
                            onChange={setBuyBackFee}
                            step={500000}
                            min={0}
                            format={(v) => (v > 0 ? formatMoney(v) : 'Not Set')}
                            locked={buyBackFee === 0}
                            label="buy back fee"
                          />
                        </div>
                      ) : (
                        <LockedValue>{buyBackFee > 0 ? formatMoney(buyBackFee) : 'Not Set'}</LockedValue>
                      )}
                    </OfferField>

                    <OfferField
                      label="Exchange player"
                      locked={!feeStage || !canTrade}
                      hint={exchange && canTrade ? `They value him at ${formatMoney(saleValue(exchange))}` : undefined}
                    >
                      {feeStage && canTrade ? (
                        <select
                          aria-label="Exchange player"
                          value={exchangeId ?? ''}
                          onChange={(e) => setExchangeId(e.target.value ? Number(e.target.value) : null)}
                        >
                          <option value="">None</option>
                          {swappable.map((p) => (
                            <option key={p.id} value={p.id}>{p.name} ({p.pos})</option>
                          ))}
                        </select>
                      ) : (
                        <LockedValue>{exchange ? exchange.name : 'None'}</LockedValue>
                      )}
                    </OfferField>
                  </div>

                  {/* Personal terms — the same grid, shown once the fee is
                      settled so the sheet grows rather than swapping out. */}
                  {neg.stage === 'terms' && !waiting && (
                    <div className="fm-offer-grid fm-offer-grid--terms">
                      <OfferField label="Weekly wage" hint={`He is asking ${formatMoney(neg.neg.wageDemand)}`}>
                        <Stepper value={wage} onChange={setWage} step={500} format={formatMoney} highlight label="weekly wage" />
                      </OfferField>
                      <OfferField label="Contract length">
                        <select aria-label="Contract length" value={years} onChange={(e) => setYears(Number(e.target.value))}>
                          {[1, 2, 3, 4, 5].map((y) => <option key={y} value={y}>{y} year{y > 1 ? 's' : ''}</option>)}
                        </select>
                      </OfferField>
                      <OfferField label="Promised status">
                        <select aria-label="Promised status" value={status ?? ''} onChange={(e) => setStatus((e.target.value || null) as typeof status)}>
                          <option value="">No promise</option>
                          {STATUS_ORDER.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
                        </select>
                      </OfferField>
                      <OfferField label="Signing bonus">
                        <Stepper value={bonus} onChange={setBonus} step={50000} format={formatMoney} label="signing bonus" />
                      </OfferField>
                    </div>
                  )}

                  {neg.stage === 'loan_terms' && !waiting && (
                    <div className="fm-offer-grid fm-offer-grid--terms">
                      <OfferField label="Wage share" hint="The share of his wages you cover">
                        <Stepper value={Math.round(wageShare * 100)} onChange={(v) => setWageShare(v / 100)} step={5} max={100} format={(v) => `${v}%`} highlight label="wage share" />
                      </OfferField>
                      <OfferField label="Playing time">
                        <select aria-label="Playing time" value={playingTime ?? ''} onChange={(e) => setPlayingTime((e.target.value || null) as typeof playingTime)}>
                          <option value="">No promise</option>
                          <option value="occasional">{LOAN_PLAYTIME.occasional.label}</option>
                          <option value="regular">{LOAN_PLAYTIME.regular.label}</option>
                        </select>
                      </OfferField>
                      {offerType === 'loan_to_buy' && (
                        <OfferField label="Buy option fee">
                          <Stepper value={buyOptionFee} onChange={setBuyOptionFee} step={100000} format={formatMoney} label="buy option fee" />
                        </OfferField>
                      )}
                    </div>
                  )}

                  {/* What the board has given you to work with, and how much
                      patience it has left. */}
                  <div className="fm-offer-bar">
                    <div className="fm-offer-bar__item">
                      <span className="fm-offer-bar__label">Transfer budget</span>
                      <span className="fm-offer-bar__value">{formatMoney(state.budget)}</span>
                    </div>
                    <div className="fm-offer-bar__item">
                      <span className="fm-offer-bar__label">Wage budget</span>
                      <span className="fm-offer-bar__value">
                        {formatMoney(Math.max(0, wageCap - wageBill))} <em>(p/w)</em>
                      </span>
                    </div>
                    <div className="fm-offer-bar__item fm-offer-bar__item--mood">
                      <span className="fm-offer-bar__label">Mood</span>
                      <span
                        className="fm-offer-meter"
                        role="meter"
                        aria-valuenow={Math.round(mood)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label="Board confidence"
                      >
                        <span className="fm-offer-meter__fill" style={{ width: `${mood}%` }} />
                      </span>
                    </div>
                  </div>

                  {advice && (
                    <div className="fm-assistant-banner">
                      <Icon name="staff" size={16} />
                      <div>
                        <p className="fm-assistant-banner__label">Assistant advice</p>
                        <p className="fm-assistant-banner__text">{advice}</p>
                      </div>
                    </div>
                  )}
                  {neg.demands.length > 0 && (
                    <p className="fm-hint">He wants: {neg.demands.map((d) => d.replace(/_/g, ' ')).join(', ')}.</p>
                  )}
                  {waiting && <p className="fm-hint">Waiting on {neg.clubName}&apos;s reply next week.</p>}

                  <div className="fm-offer-actions">
                    <button className="fm-btn fm-btn--ghost" onClick={onBack}>Close</button>
                    <button className="fm-btn fm-btn--ghost fm-btn--danger" onClick={walk}>Reject Offer</button>
                    <button className="fm-btn fm-btn--primary" disabled={waiting} onClick={submitCurrent}>
                      {acceptLabel}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
