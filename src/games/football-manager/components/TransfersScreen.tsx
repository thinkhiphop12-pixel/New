'use client';

import { useEffect, useMemo, useState } from 'react';
import type { GameState, Negotiation, Player, Position } from '@/engine/types';
import {
  acceptIncomingOffer, askingPrice, buyPlayer, canBuy, counterIncomingOffer, delistPlayer,
  dismissNegotiation, getLoanMarket, getTransferMarket, isTransferBanned, listForSale,
  openLoanNegotiation, openNegotiation, rejectIncomingOffer, requestLoanIn, scoutRecommendations,
  submitFeeOffer, submitLoanTermsOffer, submitTermsOffer, toggleLoanList, transferTargets,
  triggerReleaseClause, walkAwayNegotiation,
  type MarketEntry, type MarketFilters,
} from '@/engine/transferMarket';
import { LOAN_PLAYTIME, statusLabel, STATUS_ORDER } from '@/engine/negotiation';
import { getSquad, wageCeiling } from '@/engine/teamManagement';
import { assignScout, newScouting, tickFacilitiesWeek, toggleShortlist } from '@/engine/facilities';
import { TRANSFER_WINDOWS, transferWindow } from '@/engine/gameRules';
import { weeklyWageBill } from '@/engine/seasonProgression';
import { formatMoney } from '@/engine/utils';
import { traitNames } from '@/engine/traits';
import { Icon } from './Icon';
import PlayerModal from './PlayerModal';
import { PlayerCard } from './InboxScreen';

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
}: {
  value: number;
  onChange: (v: number) => void;
  step: number;
  min?: number;
  max?: number;
  format: (v: number) => string;
  locked?: boolean;
}) {
  if (locked) {
    return (
      <div className="fm-stepper fm-stepper--locked">
        <span className="fm-stepper__value">{format(value)}</span>
      </div>
    );
  }
  return (
    <div className="fm-stepper">
      <button
        type="button"
        className="fm-stepper__btn"
        disabled={value - step < min}
        onClick={() => onChange(Math.max(min, value - step))}
      >
        −
      </button>
      <span className="fm-stepper__value">{format(value)}</span>
      <button
        type="button"
        className="fm-stepper__btn"
        disabled={max != null && value + step > max}
        onClick={() => onChange(max != null ? Math.min(max, value + step) : value + step)}
      >
        +
      </button>
    </div>
  );
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

  const offerType = neg.offerType ?? 'transfer';
  const player = state.players[neg.playerId];
  const traits = player ? traitNames(player) : [];
  const advice = neg.log[1]?.text ?? neg.log[0]?.text;

  const walk = () => { onApply(walkAwayNegotiation(state, neg.id)); onBack(); };

  return (
    <div className="fm-panel fm-negotiation">
      <button className="fm-btn fm-btn--small fm-btn--ghost" onClick={onBack}>&larr; All negotiations</button>

      <div className="fm-split" style={{ ['--split-ratio' as string]: '0.38', marginTop: 10 }}>
        <div className="fm-negotiation__card">
          {player && <PlayerCard p={player} club={state.clubs.find((c) => c.id === player.clubId)} seasonYear={state.seasonYear} />}
          {traits.length > 0 && (
            <div className="fm-negotiation__traits">
              {traits.map((t) => <span key={t} className="fm-trait">{t}</span>)}
            </div>
          )}
          <div className="fm-negotiation__meta">
            <div className="fm-negotiation__meta-row">
              <span className="fm-negotiation__meta-label">Squad status</span>
              <span className="fm-negotiation__meta-value">{statusLabel(neg.projectedStatus)}</span>
            </div>
            <div className="fm-negotiation__meta-row">
              <span className="fm-negotiation__meta-label">Interested clubs</span>
              <span className="fm-negotiation__meta-value">{neg.rival ? `1 — ${neg.rival.clubName}` : 'None yet'}</span>
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
        </div>

        <div>
          <div className="fm-subnav__tabs">
            <button className={`fm-subtab${tab === 'current' ? ' fm-subtab--active' : ''}`} onClick={() => setTab('current')}>Current Offer</button>
            <button className={`fm-subtab${tab === 'previous' ? ' fm-subtab--active' : ''}`} onClick={() => setTab('previous')}>Previous Offer</button>
            <button className={`fm-subtab${tab === 'interest' ? ' fm-subtab--active' : ''}`} onClick={() => setTab('interest')}>Interested Clubs</button>
          </div>

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
            <div style={{ marginTop: 12 }}>
              <div className="fm-offer-status">
                <div className="fm-offer-status__item">
                  <span className="fm-offer-status__label">Offer type</span>
                  <span className="fm-offer-status__value">
                    {offerType === 'transfer' ? 'Transfer' : offerType === 'loan' ? 'Loan' : 'Loan + buy option'}
                  </span>
                </div>
                <div className="fm-offer-status__item">
                  <span className="fm-offer-status__label">Budget</span>
                  <span className="fm-offer-status__value">{formatMoney(state.budget)}</span>
                </div>
              </div>

              {neg.demands.length > 0 && <p className="fm-hint">Wants: {neg.demands.join(', ')}</p>}

              {neg.awaiting === 'club' ? (
                <p className="fm-hint">Waiting on {neg.clubName}'s reply next week.</p>
              ) : neg.stage === 'fee' ? (
                <>
                  <div className="fm-offer-grid">
                    <div className="fm-offer-field">
                      <span className="fm-offer-field__label">Fee offer</span>
                      <Stepper value={fee} onChange={setFee} step={100000} format={formatMoney} />
                    </div>
                    <div className="fm-offer-field">
                      <span className="fm-offer-field__label">Transfer date</span>
                      <Stepper value={0} onChange={() => {}} step={1} format={() => 'Immediate'} locked />
                    </div>
                    <div className="fm-offer-field">
                      <span className="fm-offer-field__label">Exchange player</span>
                      <Stepper value={0} onChange={() => {}} step={1} format={() => 'None'} locked />
                    </div>
                  </div>
                  <div className="fm-negotiation__actions">
                    <button className="fm-btn fm-btn--ghost" onClick={() => setFee(neg.neg.asking)}>Match asking price</button>
                    <button className="fm-btn fm-btn--primary" onClick={() => onApply(submitFeeOffer(state, neg.id, fee))}>Submit bid</button>
                    <button className="fm-btn fm-btn--ghost" onClick={walk}>Reject / walk away</button>
                  </div>
                </>
              ) : neg.stage === 'terms' ? (
                <>
                  <div className="fm-offer-grid">
                    <div className="fm-offer-field">
                      <span className="fm-offer-field__label">Weekly wage</span>
                      <Stepper value={wage} onChange={setWage} step={500} format={formatMoney} />
                    </div>
                    <div className="fm-offer-field">
                      <span className="fm-offer-field__label">Contract length</span>
                      <select value={years} onChange={(e) => setYears(Number(e.target.value))}>
                        {[1, 2, 3, 4, 5].map((y) => <option key={y} value={y}>{y} year{y > 1 ? 's' : ''}</option>)}
                      </select>
                    </div>
                    <div className="fm-offer-field">
                      <span className="fm-offer-field__label">Promised status</span>
                      <select value={status ?? ''} onChange={(e) => setStatus((e.target.value || null) as typeof status)}>
                        <option value="">No promise</option>
                        {STATUS_ORDER.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
                      </select>
                    </div>
                    <div className="fm-offer-field">
                      <span className="fm-offer-field__label">Signing bonus</span>
                      <Stepper value={bonus} onChange={setBonus} step={50000} format={formatMoney} />
                    </div>
                  </div>
                  <div className="fm-negotiation__actions">
                    <button className="fm-btn fm-btn--ghost" onClick={() => setWage(neg.neg.wageDemand)}>Match asking wage</button>
                    <button
                      className="fm-btn fm-btn--primary"
                      onClick={() => onApply(submitTermsOffer(state, neg.id, wage, {
                        contractYears: years, promisedStatus: status, signingBonus: bonus,
                      }))}
                    >
                      Offer terms
                    </button>
                    <button className="fm-btn fm-btn--ghost" onClick={walk}>Reject / walk away</button>
                  </div>
                </>
              ) : neg.stage === 'loan_terms' ? (
                <>
                  <div className="fm-offer-grid">
                    <div className="fm-offer-field">
                      <span className="fm-offer-field__label">Wage share (you pay)</span>
                      <Stepper value={Math.round(wageShare * 100)} onChange={(v) => setWageShare(v / 100)} step={5} max={100} format={(v) => `${v}%`} />
                    </div>
                    <div className="fm-offer-field">
                      <span className="fm-offer-field__label">Playing time</span>
                      <select value={playingTime ?? ''} onChange={(e) => setPlayingTime((e.target.value || null) as typeof playingTime)}>
                        <option value="">No promise</option>
                        <option value="occasional">Occasional</option>
                        <option value="regular">Regular</option>
                      </select>
                    </div>
                    {offerType === 'loan_to_buy' && (
                      <div className="fm-offer-field">
                        <span className="fm-offer-field__label">Buy option fee</span>
                        <Stepper value={buyOptionFee} onChange={setBuyOptionFee} step={100000} format={formatMoney} />
                      </div>
                    )}
                  </div>
                  <div className="fm-negotiation__actions">
                    <button
                      className="fm-btn fm-btn--ghost"
                      onClick={() => {
                        setWageShare(neg.loanTerms?.minWageShare ?? wageShare);
                        setBuyOptionFee(neg.loanTerms?.minBuyOption ?? buyOptionFee);
                      }}
                    >
                      Match asking terms
                    </button>
                    <button
                      className="fm-btn fm-btn--primary"
                      onClick={() => onApply(submitLoanTermsOffer(state, neg.id, {
                        wageShare, playingTime, buyOptionFee: offerType === 'loan_to_buy' ? buyOptionFee : undefined,
                      }))}
                    >
                      Offer loan terms
                    </button>
                    <button className="fm-btn fm-btn--ghost" onClick={walk}>Reject / walk away</button>
                  </div>
                </>
              ) : (
                <div className="fm-negotiation__actions">
                  <p className="fm-hint">Outbid — a rival club has agreed a deal ahead of you.</p>
                  <button className="fm-btn fm-btn--ghost" onClick={() => { onApply(dismissNegotiation(state, neg.id)); onBack(); }}>
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
