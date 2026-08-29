'use client';

import { useEffect, useMemo, useState } from 'react';
import type { GameState, Negotiation, Player, Position } from '@/engine/types';
import {
  acceptIncomingOffer, askingPrice, buyPlayer, canBuy, counterIncomingOffer, delistPlayer,
  dismissNegotiation, getLoanMarket, getTransferMarket, isTransferBanned, listForSale,
  openLoanNegotiation, openNegotiation, rejectIncomingOffer, requestLoanIn, saleValue,
  submitFeeOffer, submitLoanTermsOffer, submitTermsOffer, toggleLoanList,
  transferTargets, triggerReleaseClause, walkAwayNegotiation,
  type MarketEntry, type MarketFilters,
} from '@/engine/transferMarket';
import {
  LOAN_PLAYTIME, SELL_ON_MAX, effectiveBid, newSigningWageDemand, statusLabel, STATUS_ORDER,
  suggestBuyBack,
} from '@/engine/negotiation';
import { financesView } from '@/engine/finances';
import { getSquad, isOnLoan, squadAvgRating, wageCeiling } from '@/engine/teamManagement';
import { newScouting, toggleShortlist } from '@/engine/facilities';
import { MIN_SQUAD_SIZE, transferWindow } from '@/engine/gameRules';
import { weeklyWageBill } from '@/engine/seasonProgression';
import { clamp, formatMoney } from '@/engine/utils';
import { traitNames } from '@/engine/traits';
import { Icon } from './Icon';
import PlayerModal from './PlayerModal';
import { PlayerCard } from './InboxScreen';

type MarketTab = 'search' | 'shortlist' | 'sell' | 'sent' | 'received';
const POSITIONS: (Position | 'ALL')[] = ['ALL', 'GK', 'DEF', 'MID', 'FWD'];
const AVAIL: { key: string; label: string }[] = [
  { key: 'all', label: 'Anyone' },
  { key: 'available', label: 'Might be sold' },
  { key: 'listed', label: 'Up for sale' },
  { key: 'wants', label: 'Wants to leave' },
  { key: 'expiring', label: 'Contract running out' },
];
// Plain-English tab names. "Offers Sent" / "Offers Received" reads as jargon
// to a young player and, worse, is ambiguous about who is buying: these say
// which direction the money is going.
const TABS: { id: MarketTab; label: string }[] = [
  { id: 'search', label: 'Find players' },
  { id: 'shortlist', label: 'My list' },
  { id: 'sell', label: 'Sell players' },
  { id: 'sent', label: 'My offers' },
  { id: 'received', label: 'Bids for my players' },
];

/** Position codes spelled out, so the badge on a row means something on its
 *  own. Falls back to the raw code for anything the generator invents. */
const ROLE_FULL: Record<string, string> = {
  GK: 'Goalkeeper',
  CB: 'Centre-back', LB: 'Left-back', RB: 'Right-back',
  WB: 'Wing-back', LWB: 'Left wing-back', RWB: 'Right wing-back',
  SW: 'Sweeper', BPD: 'Ball-playing defender',
  CDM: 'Defensive midfielder', DM: 'Defensive midfielder',
  CM: 'Central midfielder', BBM: 'Box-to-box midfielder',
  CAM: 'Attacking midfielder', AM: 'Attacking midfielder',
  LM: 'Left midfielder', RM: 'Right midfielder',
  LW: 'Left winger', RW: 'Right winger',
  ST: 'Striker', CF: 'Centre-forward', SS: 'Second striker',
};
const roleFull = (role: string) => ROLE_FULL[role] ?? role;

/** Everyday words for the four position groups, for sentences like
 *  "better than your best defender". */
const POS_WORD: Record<Position, string> = {
  GK: 'goalkeeper', DEF: 'defender', MID: 'midfielder', FWD: 'attacker',
};

type Fit = { text: string; tone: 'good' | 'ok' | 'meh' };

/**
 * The question the screen never answered: is he actually better than what I
 * already have? One comparison against the manager's own players in that
 * position, in words rather than numbers.
 */
function squadFit(p: { rating: number; pos: Position; age: number; potential?: number | null }, squad: Player[]): Fit {
  const word = POS_WORD[p.pos];
  const samePos = squad.filter((q) => q.pos === p.pos);
  if (samePos.length === 0) return { text: `You have no ${word}!`, tone: 'good' };
  const best = Math.max(...samePos.map((q) => q.rating));
  const avg = samePos.reduce((a, q) => a + q.rating, 0) / samePos.length;
  if (p.rating >= best + 3) return { text: `Better than your best ${word}`, tone: 'good' };
  if (p.rating >= best) return { text: `As good as your best ${word}`, tone: 'good' };
  // A promising kid is worth flagging even when today's rating is short —
  // that is the whole point of buying young.
  if (p.age <= 21 && (p.potential ?? p.rating) >= best) return { text: 'One for the future', tone: 'ok' };
  if (p.rating >= avg) return { text: `Squad-level ${word}`, tone: 'ok' };
  return { text: `Weaker than your ${word}s`, tone: 'meh' };
}

type Afford = { text: string; tone: 'good' | 'ok' | 'meh' };

/** Whether the club can actually pay, said out loud. */
function affordability(cost: number, budget: number): Afford {
  if (cost <= 0) return { text: 'Free', tone: 'good' };
  if (cost <= budget * 0.4) return { text: 'Cheap for you', tone: 'good' };
  if (cost <= budget) return { text: 'You can afford this', tone: 'good' };
  if (cost <= budget * 2) return { text: 'Just out of reach', tone: 'ok' };
  return { text: 'Too expensive', tone: 'meh' };
}

/**
 * How a live deal is going, said the way a commentator would. Reads the same
 * two fields the row already had — whose move it is and how the club replied
 * — instead of leaving the state buried in a tab inside the offer sheet.
 */
function dealTemperature(n: Negotiation): { text: string; tone: 'good' | 'ok' | 'meh' } {
  if (n.stage === 'outbid') return { text: '💔 You lost this one', tone: 'meh' };
  if (n.awaiting === 'club') return { text: '⏳ They’re thinking about it…', tone: 'ok' };
  // The club has replied and it is the user's move — the tone of that reply is
  // the honest read on how close the deal is.
  const reply = n.log.find((m) => m.tone === 'good' || m.tone === 'bad');
  if (n.stage === 'terms' || n.stage === 'loan_terms') return { text: '🔥 Nearly done — your move', tone: 'good' };
  if (reply?.tone === 'good') return { text: '🔥 They’re interested — your move', tone: 'good' };
  if (reply?.tone === 'bad') return { text: '🧊 They didn’t like that — try more', tone: 'meh' };
  return { text: '👉 Your move', tone: 'ok' };
}

/**
 * The three questions someone new to the screen actually arrives with, each
 * one wired to the filters that answer it. They replace the five-dropdown
 * wall as the opening move — the dropdowns stay behind "More filters".
 */
const PRESETS: {
  id: string; label: string; hint: string;
  set: { pos?: Position | 'ALL'; avail?: string; maxAge?: number; minRating?: number; affordable?: boolean };
}[] = [
  {
    id: 'bargain', label: '💸 Cheap and good', hint: 'Decent players your club can actually pay for',
    set: { minRating: 65, avail: 'all', maxAge: 40, affordable: true },
  },
  {
    id: 'young', label: '🌱 Young talent', hint: 'Under 21, room to grow into a star',
    set: { minRating: 0, avail: 'all', maxAge: 21, affordable: false },
  },
  {
    id: 'ready', label: '⚡ Ready right now', hint: 'Good enough to walk into your team today',
    set: { minRating: 70, avail: 'available', maxAge: 40, affordable: false },
  },
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
  const [minRating, setMinRating] = useState(0);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [activeNegId, setActiveNegId] = useState<string | null>(null);
  // Search opens on three ready-made questions rather than five dropdowns;
  // the dropdowns are still there, one tap away.
  const [preset, setPreset] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [affordableOnly, setAffordableOnly] = useState(false);
  // The payoff. Signing a player used to change the squad list silently.
  const [celebrate, setCelebrate] = useState<Player | null>(null);
  // Extra loan routes are hidden per row until asked for — three buttons on
  // every loan row is one decision too many.
  const [loanOptionsFor, setLoanOptionsFor] = useState<number | null>(null);
  const [sort, setSort] = useState<'rating' | 'price' | 'age' | 'fit'>('rating');
  // Any tap that spends real money asks first. One dialog serves both the
  // sell-listing and the buy-out clause.
  const [confirm, setConfirm] = useState<{
    kicker: string; name: string; body: string; go: string; keep: string; run: () => void;
  } | null>(null);
  // The two-step shape of a deal is explained once, up front, rather than
  // only from inside a negotiation you have already opened.
  const [showHow, setShowHow] = useState(false);

  const sc = state.scouting ?? newScouting();
  const shortlist = sc.shortlist;

  // Initialize scouting state if missing. Weekly progression happens at the
  // authoritative game-progress transition, not on mount, to prevent early
  // completion via repeated Transfers screen visits.
  useEffect(() => {
    if (!state.scouting) { onChange({ ...state, scouting: sc }); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Shown until it is dismissed once, then never again on this device.
  useEffect(() => {
    try { setShowHow(localStorage.getItem('gaffa.transfers.how') !== 'seen'); } catch { /* private mode */ }
  }, []);
  const dismissHow = () => {
    setShowHow(false);
    try { localStorage.setItem('gaffa.transfers.how', 'seen'); } catch { /* private mode */ }
  };

  const detail = detailId !== null ? state.players[detailId] : null;
  const negotiations = state.negotiations ?? [];
  const outgoing = negotiations.filter((n) => n.type === 'outgoing');
  const incoming = negotiations.filter((n) => n.type === 'incoming');
  const activeNeg = activeNegId ? negotiations.find((n) => n.id === activeNegId) ?? null : null;

  const filters: MarketFilters = {
    search, pos: posFilter, avail: availFilter,
    // "Search by overall" — the engine side of this already existed
    // (ratingMode/ratingVal), it just wasn't exposed in the filter row.
    ...(minRating > 0 ? { ratingMode: 'over' as const, ratingVal: minRating } : {}),
  };
  const marketRaw = useMemo(
    () => getTransferMarket(state, filters),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, search, posFilter, availFilter, minRating],
  );
  // Gap 10 (Userbrain): the market used to sort purely by rating, so a
  // lower-division club with a small budget saw Salah/Mbappé-tier names at
  // the very top of every search — unrealistic, and it buried the loan
  // market (the actual route to a squad upgrade) below them. Nothing is
  // hidden — a huge reach signing should still be findable — but realistic
  // targets now sort first, and anything wildly out of budget carries a
  // "reputation gap" badge instead of reading as a normal, biddable option.
  //
  // A fee-vs-budget check alone isn't enough: a star player's askingGuide is
  // his `value` times a fairly narrow multiplier, which can still land under
  // even a small budget's reach multiplier — a live check against real data
  // found Mbappé/Van Dijk/Rodri/Bellingham still sorting to the top of a
  // Championship club's search on fee grounds alone. The rating gap against
  // the manager's own squad is what actually reads as "unrealistic" to a
  // player, so both signals count.
  // The board's second ceiling. `canBuy` and the negotiation both reject on
  // it, but nothing said so until after a deal had been worked up — you
  // could pick an affordable player, haggle for two weeks and only then be
  // told his wages never fitted.
  const wageRoom = Math.max(0, wageCeiling(state) - weeklyWageBill(state));
  const wageFitsFor = (clubId: number, wage: number, p: Player) =>
    (clubId === 0 ? newSigningWageDemand(p, 1) : wage) <= wageRoom;
  const projectedWage = (p: Player) => (p.clubId === 0 ? newSigningWageDemand(p, 1) : p.wage);
  const wageFits = (p: Player) => projectedWage(p) <= wageRoom;

  const REACH_MULTIPLIER = 4;
  const REACH_RATING_GAP = 10;
  const mySquadAvgRating = squadAvgRating(state, state.userClubId);
  const marketCost = (p: MarketEntry) => (p.clubId === 0 ? askingPrice(p) : p.askingGuide);
  // Wages are the second ceiling and, for a small club, the one that
  // actually bites: a League Two side can meet the fee for half the Premier
  // League and pay none of their salaries. A player it could never pay
  // belongs in the same bucket as one it could never afford — findable, but
  // not sorted above the players it can really sign.
  const isReach = (p: MarketEntry) =>
    marketCost(p) > Math.max(state.budget, 1) * REACH_MULTIPLIER ||
    p.rating - mySquadAvgRating > REACH_RATING_GAP ||
    !wageFitsFor(p.clubId, p.wage, p);
  const market = useMemo(
    () => {
      const filtered = marketRaw.filter((p) =>
        p.age <= maxAge
        && (!natFilter || p.nat === natFilter)
        && (!affordableOnly || marketCost(p) <= Math.max(state.budget, 1)));
      const realistic = filtered.filter((p) => !isReach(p));
      const reach = filtered.filter((p) => isReach(p));
      // "Who's cheapest?" and "who's youngest?" are the two questions asked
      // most and neither was answerable — the list only ever came back in
      // rating order. Reach players stay pinned below whatever the sort is,
      // so a cheap sort can't fill the top with players who'd never sign.
      const by = (list: MarketEntry[]) => {
        const s = [...list];
        if (sort === 'price') s.sort((a, b) => marketCost(a) - marketCost(b));
        else if (sort === 'age') s.sort((a, b) => a.age - b.age || b.rating - a.rating);
        else if (sort === 'fit') s.sort((a, b) => (b.rating - mySquadAvgRating) - (a.rating - mySquadAvgRating));
        else s.sort((a, b) => b.rating - a.rating);
        return s;
      };
      return [...by(realistic), ...by(reach)].slice(0, 80);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [marketRaw, maxAge, natFilter, affordableOnly, sort, state.budget, mySquadAvgRating],
  );
  const nations = useMemo(
    () => Array.from(new Set(marketRaw.map((p) => p.nat))).sort().slice(0, 60),
    [marketRaw],
  );
  const loanMarket = useMemo(() => getLoanMarket(state).slice(0, 60), [state]);
  const mySquad = getSquad(state, state.userClubId).sort((a, b) => b.rating - a.rating);

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
    // The whole screen exists to reach this moment, so say so.
    setCelebrate(bought.players[playerId] ?? state.players[playerId] ?? null);
  };

  const applyPreset = (id: string) => {
    const p = PRESETS.find((x) => x.id === id);
    if (!p || preset === id) {
      // Tapping the active preset clears it — back to the whole market.
      setPreset(null);
      setAffordableOnly(false);
      return;
    }
    setPreset(id);
    if (p.set.pos !== undefined) setPosFilter(p.set.pos);
    if (p.set.avail !== undefined) setAvailFilter(p.set.avail);
    if (p.set.maxAge !== undefined) setMaxAge(p.set.maxAge);
    if (p.set.minRating !== undefined) setMinRating(p.set.minRating);
    setAffordableOnly(!!p.set.affordable);
  };

  const toggleScout = (playerId: number) => onChange(toggleShortlist(state, playerId));

  // The window gates every paid deal, so the screens where deals are started
  // have to say so up front — otherwise the buttons just fail on click.
  const win = transferWindow(state.week);

  // Player rows are divs carrying an onClick, so keyboard users could never
  // open a player. The row itself can't take the button role — it contains
  // buttons of its own, and a role="button" ancestor swallows their
  // accessible names into one giant label — so the row keeps a plain mouse
  // click and the player's *name* becomes the real, focusable button.
  const rowProps = (playerId: number) => ({ onClick: () => setDetailId(playerId) });
  const nameButton = (playerId: number, name: string) => (
    <button
      type="button"
      className="fm-rowname"
      onClick={(e) => { e.stopPropagation(); setDetailId(playerId); }}
    >
      {name}
    </button>
  );

  const clubName = (id: number) => (id === 0 ? 'Free agent' : state.clubs.find((c) => c.id === id)?.name ?? '—');

  // A club with almost nothing it can buy is a club that should be looking at
  // loans first. Counted off the unfiltered market so the current filters
  // can't flip the ordering underneath the user mid-search.
  const affordableCount = useMemo(
    () => marketRaw.filter((p) => marketCost(p) <= state.budget).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [marketRaw, state.budget],
  );
  const loansFirstBudget = affordableCount < 5;
  const loansFirst = loansFirstBudget && loanMarket.length > 0;

  // Your assistant, in a voice rather than a table. He reads the same numbers
  // the screen already has and says the one thing worth doing next.
  const tip = (() => {
    if (!win.open) return 'Market’s shut, boss. Free agents are still fair game — everyone else has to wait.';
    if (incoming.some((n) => n.awaiting === 'user')) return 'Someone’s bidding for one of our players. Have a look at “Bids for my players”.';
    if (outgoing.some((n) => n.awaiting === 'user')) return 'One of our deals needs your answer — check “My offers”.';
    if (state.budget <= 0) return 'No money left, boss. Loans cost far less, or sell someone first.';
    if (loansFirstBudget) return 'We can’t match the big clubs on fees. A loan gets us a good player for almost nothing.';
    if (win.weeksLeft <= 1) return 'Last week of the window — if we want someone, it has to be now.';
    return `We’ve got ${formatMoney(state.budget)} to spend. Try one of the shortcuts below to see who fits.`;
  })();

  const buySection = (
    <>
      <SectionIntro
        title="Players you could buy"
        text="Their club would listen to an offer. The price on the button is roughly what they want for him."
      />
      <div className="fm-sortrow">
        <span className="fm-sortrow__label">Show me</span>
        {([
          ['rating', 'Best players'],
          ['price', 'Cheapest first'],
          ['age', 'Youngest first'],
          ['fit', 'Best for my team'],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`fm-sortchip${sort === id ? ' active' : ''}`}
            aria-pressed={sort === id}
            onClick={() => setSort(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="fm-player-list">
        {market.map((p) => {
          const banned = isTransferBanned(state, p.id);
          const alreadyTalking = outgoing.some((n) => n.playerId === p.id);
          const fit = squadFit(p, mySquad);
          const money = affordability(marketCost(p), state.budget);
          const payable = wageFits(p);
          return (
            <div key={p.id} {...rowProps(p.id)} className={`fm-player-row fm-pos-${p.pos}`}>
              <span className="fm-player-row__badge" title={roleFull(p.role)}>{p.role}</span>
              <span className="fm-player-row__name">
                {nameButton(p.id, p.name)}
                <span className="fm-player-row__sub">
                  {roleFull(p.role)} · {p.age}y · {p.clubName}
                  {p.status.listed && ' · his club want to sell him'}
                  {p.status.unsettled && ' · he wants to leave'}
                  {/* `monthsLeft` is a raw float off the contract date — it
                      used to render as "10.74961673236969mo left". */}
                  {p.status.expiring && ` · contract ends in ${Math.max(1, Math.round(p.status.monthsLeft))} months`}
                  {p.releaseClauseFee != null && ` · buy-out price ${formatMoney(p.releaseClauseFee)}`}
                </span>
                <span className="fm-chiprow">
                  <span className={`fm-chip fm-chip--${fit.tone}`}>{fit.text}</span>
                  {/* One money verdict per row. "Cheap for you" next to
                      "wages too high" reads as a contradiction, and the wage
                      is the one that stops the deal. */}
                  {/* "You can afford this" was true of nearly every row on
                      the default sort, so it told you nothing and did it in
                      green, eight times down the screen. The money chip now
                      shows only when the money is actually news — free,
                      cheap, a stretch, or out of reach. Plain affordability
                      is the assumption, and says nothing. */}
                  {payable ? (
                    money.text !== 'You can afford this' && (
                      <span className={`fm-chip fm-chip--${money.tone}`}>{money.text}</span>
                    )
                  ) : (
                    <span className="fm-chip fm-chip--meh" title={`He earns ${formatMoney(projectedWage(p))} a week and you only have ${formatMoney(wageRoom)} a week spare`}>
                      Wages too high for us
                    </span>
                  )}
                  {isReach(p) && (
                    <span className="fm-chip fm-chip--meh" title="He plays for a far bigger club than yours — he would never sign for you right now">
                      Way out of your league
                    </span>
                  )}
                </span>
              </span>
              <span className="fm-rowactions" onClick={(e) => e.stopPropagation()}>
              {/* A star, not a third full-size button. Three buttons of
                  equal weight per row made every row a decision about which
                  button to read first; there is only one action here you
                  take often. */}
              <button
                className={`fm-star${shortlist.includes(p.id) ? ' is-on' : ''}`}
                title={shortlist.includes(p.id) ? 'On your list — your scouts are watching him' : 'Keep an eye on him — your scouts will report back'}
                aria-pressed={shortlist.includes(p.id)}
                aria-label={shortlist.includes(p.id) ? `${p.name} is on your list` : `Add ${p.name} to your list`}
                onClick={(e) => { e.stopPropagation(); toggleScout(p.id); }}
              >
                {shortlist.includes(p.id) ? '★' : '☆'}
              </button>
              {p.releaseClauseFee != null && p.releaseClauseFee <= state.budget && (
                <button
                  className="fm-btn fm-btn--small fm-btn--quiet"
                  title="His contract lets you buy him at this exact price — his club cannot say no"
                  onClick={(e) => {
                    e.stopPropagation();
                    // One tap can spend most of the budget, so it asks first.
                    setConfirm({
                      kicker: 'Spend the money?',
                      name: p.name,
                      body: `His contract says any club paying ${formatMoney(p.releaseClauseFee!)} can talk to him, and his club cannot refuse. That is ${formatMoney(p.releaseClauseFee!)} out of your ${formatMoney(state.budget)} budget.`,
                      go: 'Pay it',
                      keep: 'Not now',
                      run: () => { apply(triggerReleaseClause(state, p.id)); setTab('sent'); },
                    });
                  }}
                >
                  Pay buy-out price
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
                  disabled={askingPrice(p) > state.budget || !payable}
                  title={!payable
                    ? `You can't fit his ${formatMoney(projectedWage(p))} a week into the wage budget`
                    : 'He has no club, so there is nobody to haggle with — you can sign him on the spot'}
                  onClick={(e) => { e.stopPropagation(); doSign(p.id); }}
                >
                  Sign him now · {formatMoney(askingPrice(p))}
                </button>
              ) : (
                <button
                  className="fm-btn fm-btn--small fm-btn--primary"
                  disabled={banned || alreadyTalking || !win.open}
                  title={!win.open
                    ? `${win.name} window opens in ${win.weeksLeft} week${win.weeksLeft === 1 ? '' : 's'}`
                    : 'Start talks with his club — you choose what to offer next'}
                  onClick={(e) => { e.stopPropagation(); openTalks(p); }}
                >
                  {banned
                    ? 'Won’t talk to you'
                    : alreadyTalking
                      ? 'Talks going on'
                      : !win.open
                        ? 'Window shut'
                        : `Make an offer · about ${formatMoney(p.askingGuide)}`}
                </button>
              )}
              </span>
              <span className={`fm-player-row__rating${p.rating >= 85 ? ' fm-player-row__rating--elite' : ''}`} title="Overall rating out of 100">
                {p.rating}
              </span>
            </div>
          );
        })}
        {market.length === 0 && <p className="fm-hint">Nobody matches that. Try clearing the filters or picking a different shortcut.</p>}
      </div>
    </>
  );

  const loanSection = (
    <>
      <SectionIntro
        title="Players you could borrow"
        text="A loan means another club lends you their player for a season. You pay a small fee and some of his wages — much cheaper than buying."
      />
      <div className="fm-player-list">
        {loanMarket.map((p) => {
          const fit = squadFit(p, mySquad);
          const open = loanOptionsFor === p.id;
          return (
            <div key={p.id} {...rowProps(p.id)} className={`fm-player-row fm-pos-${p.pos}`}>
              <span className="fm-player-row__badge" title={roleFull(p.role)}>{p.role}</span>
              <span className="fm-player-row__name">
                {nameButton(p.id, p.name)}
                <span className="fm-player-row__sub">
                  {roleFull(p.role)} · {p.age}y · {p.clubName}{p.devLoan ? ' · his club want him playing games' : ''}
                </span>
                <span className="fm-chiprow">
                  <span className={`fm-chip fm-chip--${fit.tone}`}>{fit.text}</span>
                </span>
              </span>
              {/* `requestLoanIn` refuses outright while the window is shut, so
                  the button has to say so up front — otherwise it reads as live
                  and the rejection only surfaces as an error after the click.
                  Same treatment as the Sign button above. Loans are a club-to-club
                  deal, so unlike free agents there is no shut-window exemption. */}
              <span className="fm-rowactions" onClick={(e) => e.stopPropagation()}>
              <button
                className="fm-btn fm-btn--small fm-btn--primary"
                disabled={p.fee > state.budget || !win.open}
                title={!win.open ? `${win.name} window opens in ${win.weeksLeft} week${win.weeksLeft === 1 ? '' : 's'}` : 'They answer straight away — yes or no'}
                onClick={(e) => { e.stopPropagation(); apply(requestLoanIn(state, p.id)); }}
              >
                {!win.open ? 'Window shut' : `Borrow him · ${formatMoney(p.fee)}`}
              </button>
              {/* The negotiated loan routes are real but rarely the first
                  thing you want; one tap keeps them off every row. */}
              <button
                className="fm-btn fm-btn--small fm-btn--ghost"
                aria-expanded={open}
                onClick={(e) => { e.stopPropagation(); setLoanOptionsFor(open ? null : p.id); }}
              >
                {open ? 'Fewer options' : 'Other ways'}
              </button>
              {open && (
                <>
                  <button
                    className="fm-btn fm-btn--small fm-btn--secondary"
                    disabled={!win.open}
                    title="Haggle over how much of his wages you pay and how often he plays"
                    onClick={(e) => { e.stopPropagation(); openLoanTalks(p, 'loan'); }}
                  >
                    Haggle over the loan
                  </button>
                  <button
                    className="fm-btn fm-btn--small fm-btn--ghost"
                    disabled={!win.open}
                    title="Borrow him now, with the right to buy him at the end"
                    onClick={(e) => { e.stopPropagation(); openLoanTalks(p, 'loan_to_buy'); }}
                  >
                    Loan, then buy later
                  </button>
                </>
              )}
              </span>
              <span className={`fm-player-row__rating${p.rating >= 85 ? ' fm-player-row__rating--elite' : ''}`} title="Overall rating out of 100">
                {p.rating}
              </span>
            </div>
          );
        })}
        {loanMarket.length === 0 && <p className="fm-hint">No club wants to lend you a player right now.</p>}
      </div>
    </>
  );

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

      {/* What you have to spend, on every tab. It used to live only inside a
          negotiation and in a hub panel that was never rendered, so the
          screen asked you to shop without showing you your money. */}
      <div className="fm-moneybar">
        <div className="fm-moneybar__item">
          <span className="fm-moneybar__label">Money to spend</span>
          <span className="fm-moneybar__value">{formatMoney(state.budget)}</span>
        </div>
        <div className="fm-moneybar__item">
          <span className="fm-moneybar__label">Wages left each week</span>
          <span className={`fm-moneybar__value${wageRoom <= 0 ? ' is-out' : ''}`}>{formatMoney(wageRoom)}</span>
        </div>
        <div className="fm-moneybar__item">
          <span className="fm-moneybar__label">{win.open ? 'Window shuts in' : 'Window opens in'}</span>
          <span className={`fm-moneybar__value${win.open && win.weeksLeft <= 1 ? ' is-out' : ''}`}>
            {win.weeksLeft === 0 && win.open ? 'This week!' : `${win.weeksLeft} week${win.weeksLeft === 1 ? '' : 's'}`}
          </span>
        </div>
      </div>

      {showHow && tab === 'search' && (
        <div className="fm-explainer">
          <button className="fm-explainer__close" onClick={dismissHow} aria-label="Close">
            <Icon name="cross" size={14} />
          </button>
          <p className="fm-explainer__title">How signing a player works</p>
          <ol className="fm-explainer__steps">
            <li><strong>Find someone.</strong> Use a shortcut below, then check the green tags — they say if he&apos;s better than what you have and if you can afford him.</li>
            <li><strong>Agree a price</strong> with his club. They usually say no the first time. Offer a bit more.</li>
            <li><strong>Agree his wages.</strong> Once the clubs agree, you talk to the player. Then he&apos;s yours.</li>
          </ol>
          <p className="fm-explainer__foot">Short of money? Borrowing a player on loan costs far less.</p>
        </div>
      )}

      {error && <p className="fm-error-text">{error}</p>}
      {notice && !error && <p className="fm-hint" style={{ color: 'var(--green-600)' }}>{notice}</p>}

      {tab === 'search' && (
        <div role="tabpanel">
          <WindowNotice win={win} />
          <AssistantTip text={tip} />

          <div className="fm-presets">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`fm-preset${preset === p.id ? ' fm-preset--on' : ''}`}
                aria-pressed={preset === p.id}
                onClick={() => applyPreset(p.id)}
              >
                <span className="fm-preset__label">{p.label}</span>
                <span className="fm-preset__hint">{p.hint}</span>
              </button>
            ))}
          </div>

          <div className="fm-searchbar">
            <input
              className="fm-search"
              placeholder="Or type a player's name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button
              type="button"
              className={`fm-pill${showFilters ? ' active' : ''}`}
              aria-expanded={showFilters}
              onClick={() => setShowFilters((v) => !v)}
            >
              {showFilters ? 'Hide filters' : 'More filters'}
            </button>
          </div>

          {showFilters && (
            <div className="fm-filtercards">
              <FilterCard label="Position" icon="squad">
                <select className="fm-search" value={posFilter} onChange={(e) => { setPreset(null); setPosFilter(e.target.value as Position | 'ALL'); }}>
                  {POSITIONS.map((p) => (
                    <option key={p} value={p}>
                      {p === 'ALL' ? 'Anywhere on the pitch' : `${p} — ${POS_WORD[p as Position]}s`}
                    </option>
                  ))}
                </select>
              </FilterCard>
              <FilterCard label="Country" icon="flag">
                <select className="fm-search" value={natFilter} onChange={(e) => { setPreset(null); setNatFilter(e.target.value); }}>
                  <option value="">Anywhere</option>
                  {nations.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </FilterCard>
              <FilterCard label="Is he available?" icon="info">
                <select className="fm-search" value={availFilter} onChange={(e) => { setPreset(null); setAvailFilter(e.target.value); }}>
                  {AVAIL.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
                </select>
              </FilterCard>
              <FilterCard label="Age" icon="person">
                <select className="fm-search" value={maxAge} onChange={(e) => { setPreset(null); setMaxAge(Number(e.target.value)); }}>
                  <option value={40}>Any age</option>
                  <option value={21}>Under 21</option>
                  <option value={24}>Under 24</option>
                  <option value={28}>Under 28</option>
                </select>
              </FilterCard>
              <FilterCard label="How good?" icon="stat">
                <select className="fm-search" value={minRating} onChange={(e) => { setPreset(null); setMinRating(Number(e.target.value)); }}>
                  <option value={0}>Any rating</option>
                  <option value={60}>60+ (solid)</option>
                  <option value={65}>65+ (good)</option>
                  <option value={70}>70+ (very good)</option>
                  <option value={75}>75+ (top player)</option>
                  <option value={80}>80+ (superstar)</option>
                </select>
              </FilterCard>
            </div>
          )}

          {/* On a small budget the loan market is the realistic route to a
              better squad, so it goes first rather than sitting under eighty
              rows of players the club cannot buy. */}
          {loansFirst ? <>{loanSection}{buySection}</> : <>{buySection}{loanSection}</>}
        </div>
      )}

      {tab === 'sell' && (
        <div role="tabpanel">
          <SectionIntro
            title="Your players"
            text="Put a player up for sale and other clubs can bid for him. Their bids show up under “Bids for my players”."
          />
          <div className="fm-player-list">
            {mySquad.map((p) => (
              <div key={p.id} {...rowProps(p.id)} className={`fm-player-row fm-pos-${p.pos}`}>
                <span className="fm-player-row__badge" title={roleFull(p.role)}>{p.role}</span>
                <span className="fm-player-row__name">
                  {nameButton(p.id, p.name)}
                  <span className="fm-player-row__sub">
                    {roleFull(p.role)} · {p.age}y · worth about {formatMoney(p.value)}
                    {p.transferListed && ` · for sale at ${formatMoney(p.listingPrice ?? p.value)}`}
                    {p.loanListed && ' · available on loan'}
                  </span>
                </span>
                <span className="fm-rowactions" onClick={(e) => e.stopPropagation()}>
                {p.transferListed ? (
                  <button className="fm-btn fm-btn--small fm-btn--ghost" onClick={(e) => { e.stopPropagation(); apply(delistPlayer(state, p.id)); }}>
                    Take off the list
                  </button>
                ) : (
                  <button
                    className="fm-btn fm-btn--small fm-btn--danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirm({
                        kicker: 'Are you sure?',
                        name: p.name,
                        body: `You're putting him up for sale at ${formatMoney(Math.round(p.value * 1.05))}. Other clubs will start bidding, and you can still say no to every bid.`,
                        go: 'Put him up for sale',
                        keep: 'Keep him',
                        run: () => apply(listForSale(state, p.id, Math.round(p.value * 1.05))),
                      });
                    }}
                  >
                    Sell for {formatMoney(Math.round(p.value * 1.05))}
                  </button>
                )}
                <button className="fm-btn fm-btn--small fm-btn--ghost" onClick={(e) => { e.stopPropagation(); apply(toggleLoanList(state, p.id)); }}>
                  {p.loanListed ? 'Cancel loan' : 'Loan him out'}
                </button>
                </span>
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
          <SectionIntro
            title="Players you're watching"
            text="A green dot means your scouts have finished watching him and you can trust his rating. A grey dot means they're still working on it."
          />
          <div className="fm-player-list">
          {shortlisted.length === 0 && <p className="fm-hint">Your list is empty. Tap the ☆ next to anyone in Find players.</p>}
          {shortlisted.map((p) => {
            const assignment = sc.assignments.find((a) => a.kind === 'player-search' && a.foundPlayerIds?.includes(p.id));
            const known = assignment?.complete ?? false;
            return (
              <div key={p.id} {...rowProps(p.id)} className={`fm-player-row fm-pos-${p.pos}`}>
                <span
                  aria-hidden
                  style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: known ? 'var(--green)' : 'var(--muted-dim)',
                  }}
                />
                <span className="fm-player-row__badge" title={roleFull(p.role)}>{p.role}</span>
                <span className="fm-player-row__name">
                  {nameButton(p.id, p.name)}
                  <span className="fm-player-row__sub">
                    {roleFull(p.role)} · {p.age}y · {clubName(p.clubId)} · {known ? 'scouts have seen him' : 'scouts still watching'}
                  </span>
                  <span className="fm-chiprow">
                    {(() => { const f = squadFit(p, mySquad); return <span className={`fm-chip fm-chip--${f.tone}`}>{f.text}</span>; })()}
                  </span>
                </span>
                <span style={{ display: 'flex', gap: 6 }} onClick={(e) => e.stopPropagation()}>
                  <button className="fm-btn fm-btn--small fm-btn--ghost" onClick={() => toggleScout(p.id)}>
                    Remove
                  </button>
                  {/* A player under contract has to be negotiated for, the
                      same as he is in Search. This button used to call
                      `buyPlayer` on him directly — same player, a different
                      price and a different mechanic depending on which tab
                      you happened to be looking at. Free agents keep the
                      instant path, because for them there is nobody to
                      negotiate with. */}
                  {p.clubId === 0 ? (
                    <button
                      className="fm-btn fm-btn--small fm-btn--primary"
                      disabled={askingPrice(p) > state.budget || !wageFits(p)}
                      onClick={() => doSign(p.id)}
                    >
                      Sign him now · {formatMoney(askingPrice(p))}
                    </button>
                  ) : (
                    <button
                      className="fm-btn fm-btn--small fm-btn--primary"
                      disabled={!win.open || outgoing.some((n) => n.playerId === p.id) || isTransferBanned(state, p.id)}
                      title={!win.open ? `${win.name} window opens in ${win.weeksLeft} week${win.weeksLeft === 1 ? '' : 's'}` : undefined}
                      onClick={() => openTalks(p)}
                    >
                      {!win.open
                        ? 'Window shut'
                        : outgoing.some((n) => n.playerId === p.id)
                          ? 'Talks going on'
                          : `Make an offer · about ${formatMoney(askingPrice(p))}`}
                    </button>
                  )}
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
              <SectionIntro
                title="Deals you've started"
                text="Every player you're trying to sign. Tap one to change your offer — clubs reply the week after you send it."
              />
              {outgoing.length === 0 && <p className="fm-hint">You haven't started any deals. Pick someone in Find players and tap “Make an offer”.</p>}
              <div className="fm-player-list">
                {outgoing.map((n) => {
                  const temp = dealTemperature(n);
                  return (
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
                          {n.clubName} · {n.stage === 'fee' ? 'still arguing about the price'
                            : n.stage === 'terms' ? 'price agreed — now his wages'
                            : n.stage === 'loan_terms' ? 'agreeing the loan'
                            : 'another club beat you to him'}
                        </span>
                        <span className="fm-chiprow">
                          <span className={`fm-chip fm-chip--${temp.tone}`}>{temp.text}</span>
                          {n.rival && (
                            <span className="fm-chip fm-chip--meh">
                              ⚠️ {n.rival.clubName} are bidding too — {formatMoney(n.rival.offer)}
                            </span>
                          )}
                        </span>
                      </span>
                      <span className="fm-player-row__rating">{n.playerRating}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'received' && (
        <div role="tabpanel">
          <SectionIntro
            title="Other clubs want your players"
            text="Accept and the money goes into your transfer budget. Ask for more and they might walk away — or pay up."
          />
          <div className="fm-player-list">
          {incoming.length === 0 && <p className="fm-hint">Nobody has bid for your players this week.</p>}
          {incoming.map((n) => (
            <div key={n.id} className="fm-received-row">
              <button type="button" className="fm-received-row__head" onClick={() => setDetailId(n.playerId)} style={{ background: 'transparent', border: 'none', padding: 0, font: 'inherit', color: 'inherit', width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span className="fm-player-row__name">
                  {n.playerName}
                  <span className="fm-player-row__sub">{n.clubName} want to sign him</span>
                </span>
                <span style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800 }}>
                    {n.isLoan ? 'Wants him on loan' : `They’ll pay ${formatMoney(n.fee ?? n.lastCounter ?? 0)}`}
                  </div>
                  <div className="fm-hint" style={{ margin: 0 }}>
                    {n.awaiting === 'user' ? 'They’re waiting on you' : 'Waiting for their answer'}
                    {n.rival ? ` · ${n.rival.clubName} also want him (${formatMoney(n.rival.offer)})` : ''}
                  </div>
                </span>
              </button>
              {n.awaiting === 'user' && (
                <div className="fm-received-row__actions">
                  <button
                    className="fm-btn fm-btn--small fm-btn--primary"
                    onClick={() => apply(acceptIncomingOffer(state, n.id))}
                  >
                    {n.isLoan ? 'Let him go on loan' : 'Sell him'}
                  </button>
                  {!n.isLoan && (
                    <button
                      className="fm-btn fm-btn--small fm-btn--ghost"
                      title="Ask them for more money — they can say no"
                      onClick={() => {
                        const counter = Math.round((n.fee ?? 0) * 1.15);
                        apply(counterIncomingOffer(state, n.id, counter));
                      }}
                    >
                      Ask for {formatMoney(Math.round((n.fee ?? 0) * 1.15))}
                    </button>
                  )}
                  <button
                    className="fm-btn fm-btn--small fm-btn--ghost"
                    onClick={() => apply(n.stage === 'outbid' ? dismissNegotiation(state, n.id) : rejectIncomingOffer(state, n.id))}
                  >
                    Say no
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

      {celebrate && (
        <SigningCelebration
          player={celebrate}
          clubName={state.clubs.find((c) => c.id === state.userClubId)?.name ?? 'your club'}
          fit={squadFit(celebrate, mySquad.filter((p) => p.id !== celebrate.id))}
          onClose={() => setCelebrate(null)}
        />
      )}

      {confirm && (
        <ConfirmDialog
          {...confirm}
          onCancel={() => setConfirm(null)}
          onConfirm={() => { confirm.run(); setConfirm(null); }}
        />
      )}
    </>
  );
}

/** A titled sentence above a list, saying in plain words what the list is and
 *  what the buttons in it do. Every list on this screen has one. */
function SectionIntro({ title, text }: { title: string; text: string }) {
  return (
    <div className="fm-sectionintro">
      <p className="fm-sectionintro__title">{title}</p>
      <p className="fm-sectionintro__text">{text}</p>
    </div>
  );
}

/** The assistant manager, with a voice. He says one thing, and it is the thing
 *  worth doing next. */
function AssistantTip({ text }: { text: string }) {
  return (
    <div className="fm-assistant-tip">
      <span className="fm-assistant-tip__face" aria-hidden><Icon name="staff" size={18} /></span>
      <span>
        <span className="fm-assistant-tip__who">Your assistant</span>
        <span className="fm-assistant-tip__what">{text}</span>
      </span>
    </div>
  );
}

/** The payoff for the whole screen: you signed someone, and the game says so. */
function SigningCelebration({
  player, clubName, fit, onClose,
}: {
  player: Player;
  clubName: string;
  fit: Fit;
  onClose: () => void;
}) {
  return (
    <div className="fm-celebrate" role="dialog" aria-modal="true" aria-label={`${player.name} signed`} onClick={onClose}>
      <div className="fm-celebrate__card" onClick={(e) => e.stopPropagation()}>
        <div className="fm-celebrate__confetti" aria-hidden>
          {Array.from({ length: 14 }, (_, i) => (
            <span key={i} style={{ ['--i' as string]: i }} />
          ))}
        </div>
        <p className="fm-celebrate__kicker">Done deal!</p>
        <p className="fm-celebrate__name">{player.name}</p>
        <p className="fm-celebrate__club">has signed for {clubName}</p>
        <div className="fm-celebrate__stats">
          <span><strong>{player.rating}</strong>rating</span>
          <span><strong>{player.age}</strong>years old</span>
          <span><strong>{roleFull(player.role)}</strong>position</span>
        </div>
        <p className="fm-celebrate__verdict">{fit.text}</p>
        <button className="fm-btn fm-btn--primary" onClick={onClose}>Get in!</button>
      </div>
    </div>
  );
}

/** Every tap that spends money or puts one of your own players on the market
 *  goes through here first. Both used to be a single unguarded tap on a red
 *  button in a list you were only scrolling through. */
function ConfirmDialog({
  kicker, name, body, go, keep, onCancel, onConfirm,
}: {
  kicker: string;
  name: string;
  body: string;
  go: string;
  keep: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fm-celebrate" role="dialog" aria-modal="true" aria-label={`${kicker} ${name}`} onClick={onCancel}>
      <div className="fm-celebrate__card" onClick={(e) => e.stopPropagation()}>
        <p className="fm-celebrate__kicker">{kicker}</p>
        <p className="fm-celebrate__name">{name}</p>
        <p className="fm-celebrate__club">{body}</p>
        <div className="fm-celebrate__actions">
          <button className="fm-btn fm-btn--ghost" onClick={onCancel}>{keep}</button>
          <button className="fm-btn fm-btn--danger" onClick={onConfirm}>{go}</button>
        </div>
      </div>
    </div>
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

  // You are the one making the offer here, so the button says so. It used to
  // read "Accept Offer" — which reads as accepting theirs, the opposite of
  // what it does.
  const acceptLabel = neg.stage === 'fee' ? 'Send this offer'
    : neg.stage === 'terms' ? 'Offer him this contract' : 'Send these loan terms';

  // What is actually being decided right now, in one line at the top.
  const stageLine = neg.stage === 'fee'
    ? `Step 1 of 2 — agree a price with ${neg.clubName}.`
    : neg.stage === 'terms'
      ? `Step 2 of 2 — ${neg.clubName} said yes. Now agree wages with ${neg.playerName}.`
      : neg.stage === 'loan_terms'
        ? `Agree how much of his wages you pay and how often he plays.`
        : 'This deal is over.';

  return (
    <div className="fm-panel fm-negotiation">
      <button className="fm-btn fm-btn--small fm-btn--ghost" onClick={onBack}>&larr; Back to my offers</button>

      {neg.stage !== 'outbid' && <p className="fm-negotiation__stage">{stageLine}</p>}

      {/* A rival bid is the drama of a transfer window; it used to be a line
          of small grey text inside a tab nobody opens. */}
      {neg.rival && (
        <p className="fm-rival-banner">
          <Icon name="warning" size={14} style={{ verticalAlign: -2 }} />{' '}
          <strong>{neg.rival.clubName}</strong> are bidding for him too — they&apos;ve offered {formatMoney(neg.rival.offer)}.
        </p>
      )}

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
              <button role="tab" aria-selected={tab === 'current'} className={`fm-offer-tab${tab === 'current' ? ' fm-offer-tab--active' : ''}`} onClick={() => setTab('current')}>Your offer</button>
              <button role="tab" aria-selected={tab === 'previous'} className={`fm-offer-tab${tab === 'previous' ? ' fm-offer-tab--active' : ''}`} onClick={() => setTab('previous')}>What&apos;s been said</button>
              <button role="tab" aria-selected={tab === 'interest'} className={`fm-offer-tab${tab === 'interest' ? ' fm-offer-tab--active' : ''}`} onClick={() => setTab('interest')}>Who else wants him</button>
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
                    <button className="fm-btn fm-btn--ghost" onClick={onBack}>Back</button>
                    <button
                      className="fm-btn fm-btn--ghost fm-btn--danger"
                      title="Give up on this player and end the talks"
                      onClick={walk}
                    >
                      Walk away
                    </button>
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
