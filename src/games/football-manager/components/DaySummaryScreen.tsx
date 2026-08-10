'use client';

import type { CSSProperties } from 'react';
import type { GameState, InboxCategory } from '@/engine/types';
import type { DayStop } from '@/engine/dailyTick';
import { formatGameDateLong } from '@/engine/calendar';
import { Icon, type IconName } from './Icon';

/** Mirrors InboxScreen's category chrome so a stop card looks like the
 *  message it came from, not a second visual language for the same idea. */
const CATEGORY_ICON: Record<InboxCategory | 'matchday', IconName> = {
  club: 'stadium',
  transfer: 'transfers',
  injury: 'injury',
  contract: 'document',
  youth: 'sprout',
  board: 'target',
  match: 'trophy',
  press: 'mic',
  matchday: 'stadium',
};

const CATEGORY_LABEL: Record<InboxCategory | 'matchday', string> = {
  club: 'Squad',
  transfer: 'Transfer',
  injury: 'Injury',
  contract: 'Contract',
  youth: 'Youth',
  board: 'Board',
  match: 'Match',
  press: 'Press',
  matchday: 'Matchday',
};

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
}: {
  state: GameState;
  stops: DayStop[];
  digest: string[];
  onOpenInbox: () => void;
  onOpenTransfers: () => void;
  onPrepareMatch: () => void;
  onContinue: () => void;
}) {
  const matchStop = stops.find((s) => s.category === 'matchday');
  const otherStops = stops.filter((s) => s.category !== 'matchday');

  const resolve = (stop: DayStop) => {
    if (stop.category === 'matchday') return onPrepareMatch();
    if (stop.category === 'transfer') return onOpenTransfers();
    return onOpenInbox();
  };

  return (
    <div className="fm-daysummary">
      <div className="fm-daysummary__head">
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
          <span className="fm-icon-tile" style={{ '--tile-tint': 'var(--gold)' } as CSSProperties}>
            <Icon name="stadium" size={20} />
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
            {otherStops.map((stop, i) => (
              <button key={i} type="button" className="fm-msg-row unread" onClick={() => resolve(stop)}>
                <span className="fm-icon-tile fm-icon-tile--sm" style={{ '--tile-tint': 'var(--red)' } as CSSProperties}>
                  <Icon name={CATEGORY_ICON[stop.category]} size={15} />
                </span>
                <span className="fm-msg-row__main">
                  <span className="fm-msg-row__title">{stop.title}</span>
                  <span className="fm-msg-row__meta">{CATEGORY_LABEL[stop.category]} · {stop.detail}</span>
                </span>
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
