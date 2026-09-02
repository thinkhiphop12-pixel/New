'use client';

import type { CSSProperties, ReactNode } from 'react';
import type { GameState, Player } from '@/engine/types';
import type { DayStop } from '@/engine/dailyTick';
import { formatGameDateLong } from '@/engine/calendar';
import { formatMoney } from '@/engine/utils';
import { Icon } from './Icon';
import { PlayerFace } from './PlayerFace';
import { CATEGORY_ICON, CATEGORY_LABEL, CATEGORY_TINT, type ChromeCategory } from './inboxChrome';

/** Triage order for the day's list. A knock outranks a contract deadline
 *  outranks a bid, and so on down to flavour — so the top of the list is the
 *  thing that actually needs deciding first, rather than whatever order the
 *  tick happened to push items in. Within a rank the rows sort by the
 *  player's rating, which is what makes five contract expiries a ranked list
 *  (your first-choice centre-half first) instead of five identical rows. */
const STOP_RANK: Record<ChromeCategory, number> = {
  matchday: 0,
  injury: 1,
  contract: 2,
  transfer: 3,
  board: 4,
  club: 5,
  youth: 6,
  match: 7,
  press: 8,
};

/**
 * The one line under a stop's title. For anything tied to a player this is
 * built from his own record — position, age, value, wage — rather than the
 * inbox body's first paragraph, which for the contract warning is a fixed
 * sentence every player shares ("...offer fresh terms now, or risk losing him
 * for nothing"). Printed five times under five different names it was the
 * single biggest reason the list read as a templated loop; printed as
 * "Contract · CB, 29 · £8.4M · £31K/wk" the rows differ on every field that
 * matters to the decision.
 */
function stopMeta(stop: DayStop, player: Player | undefined): string {
  const label = CATEGORY_LABEL[stop.category];
  if (!player) return `${label} · ${stop.detail}`;
  const facts = [`${player.role}, ${player.age}`, formatMoney(player.value), `${formatMoney(player.wage)}/wk`];
  if (stop.category === 'injury' && player.injuryWeeks > 0) {
    facts.push(`out ${player.injuryWeeks} week${player.injuryWeeks === 1 ? '' : 's'}`);
  }
  return `${label} · ${facts.join(' · ')}`;
}

/**
 * What "Sim Next Day" stops on. Shown instead of dumping the player straight
 * back on the Hub — the whole point of the daily loop is that something
 * always explains *why* the sim paused, and every reason is one click from
 * being resolved, not a dead-end sentence.
 */
export default function DaySummaryScreen({
  state,
  stops,
  digest,
  onOpenInbox,
  onOpenTransfers,
  onPrepareMatch,
  onContinue,
  assistantSlot,
}: {
  state: GameState;
  stops: DayStop[];
  digest: string[];
  onOpenInbox: () => void;
  onOpenTransfers: () => void;
  onPrepareMatch: () => void;
  onContinue: () => void;
  /** The Assistant Manager's button, rendered into this screen's header.
   *  It used to float over the bottom-right of the page, which on a day
   *  with a long list of stops sat on top of a row's own chevron — so the
   *  tap that looked like "open this item" opened the assistant instead.
   *  Day Summary has no action dock to put him in, but it does have a
   *  header with room to spare. */
  assistantSlot?: ReactNode;
}) {
  const matchStop = stops.find((s) => s.category === 'matchday');
  const playerOf = (stop: DayStop): Player | undefined =>
    stop.playerId === undefined ? undefined : state.players[stop.playerId];
  const otherStops = stops
    .filter((s) => s.category !== 'matchday')
    .map((stop, i) => ({ stop, player: playerOf(stop), i }))
    // Stable: equal rank and equal rating keep the tick's own order.
    .sort((a, b) =>
      STOP_RANK[a.stop.category] - STOP_RANK[b.stop.category] ||
      (b.player?.rating ?? 0) - (a.player?.rating ?? 0) ||
      a.i - b.i
    );

  const resolve = (stop: DayStop) => {
    if (stop.category === 'matchday') return onPrepareMatch();
    if (stop.category === 'transfer') return onOpenTransfers();
    return onOpenInbox();
  };

  return (
    <div className="fm-daysummary">
      <div className="fm-daysummary__head">
        {assistantSlot && <span className="fm-daysummary__assistant">{assistantSlot}</span>}
        <p className="fm-hint" style={{ margin: 0 }}>Sim Next Day</p>
        <h2 className="fm-daysummary__date">{formatGameDateLong(state)}</h2>
        {stops.length > 0 && (
          <p className="fm-hint" style={{ textAlign: 'left', margin: '4px 0 0' }}>
            {stops.length} item{stops.length === 1 ? '' : 's'} need{stops.length === 1 ? 's' : ''} you
          </p>
        )}
      </div>

      {matchStop && (
        <button type="button" className="fm-daysummary__match" onClick={() => resolve(matchStop)}>
          <span className="fm-icon-tile" style={{ '--tile-tint': CATEGORY_TINT.matchday } as CSSProperties}>
            <Icon name={CATEGORY_ICON.matchday} size={20} />
          </span>
          <span className="fm-daysummary__match-body">
            <span className="fm-daysummary__match-title">{matchStop.title}</span>
            <span className="fm-hint" style={{ textAlign: 'left', margin: 0 }}>{matchStop.detail} — tap to prepare</span>
          </span>
          <Icon name="chevron" size={16} />
        </button>
      )}

      {otherStops.length > 0 && (
        <div className="fm-panel">
          <p className="fm-label" style={{ marginTop: 0 }}>Needs your attention</p>
          <div className="fm-msg-list">
            {otherStops.map(({ stop, player, i }) => (
              <button key={i} type="button" className="fm-msg-row unread" onClick={() => resolve(stop)}>
                {/* Every row used to wear the same red document tile whatever
                    it was about, so a day that stopped on five contract
                    expiries showed five identical icons. The tint and icon now
                    come from the shared category chrome (components/
                    inboxChrome.ts) the inbox already used, and a row that names
                    a player leads with his face instead — the category riding
                    along as a corner badge so the row still says at a glance
                    what kind of decision it is. */}
                {player ? (
                  <span className="fm-stoprow__who">
                    <PlayerFace playerId={player.id} size={34} />
                    <span
                      className="fm-stoprow__cat"
                      style={{ '--tile-tint': CATEGORY_TINT[stop.category] } as CSSProperties}
                    >
                      <Icon name={CATEGORY_ICON[stop.category]} size={10} />
                    </span>
                  </span>
                ) : (
                  <span
                    className="fm-icon-tile fm-icon-tile--sm"
                    style={{ '--tile-tint': CATEGORY_TINT[stop.category] } as CSSProperties}
                  >
                    <Icon name={CATEGORY_ICON[stop.category]} size={15} />
                  </span>
                )}
                <span className="fm-msg-row__main">
                  <span className="fm-msg-row__title">{stop.title}</span>
                  <span className="fm-msg-row__meta">{stopMeta(stop, player)}</span>
                </span>
                {player && <span className="ovr-badge">{player.rating}</span>}
                <Icon name="chevron" size={14} />
              </button>
            ))}
          </div>
        </div>
      )}

      {digest.length > 0 && (
        <div className="fm-panel">
          <p className="fm-label" style={{ marginTop: 0 }}>Since your last look</p>
          <ul className="fm-card__list">
            {digest.map((line, i) => (
              <li key={i} className="fm-card__list-item">{line}</li>
            ))}
          </ul>
        </div>
      )}

      {stops.length === 0 && digest.length === 0 && (
        <p className="fm-hint">A quiet day — nothing to report.</p>
      )}

      <div className="fm-daysummary__actions">
        {matchStop ? (
          <p className="fm-hint" style={{ margin: 0 }}>
            Prepare for the match above to continue — matchday can't be skipped.
          </p>
        ) : (
          <button type="button" className="fm-btn fm-btn--primary" onClick={onContinue}>
            <Icon name="play" size={15} /> Continue
          </button>
        )}
      </div>
    </div>
  );
}
