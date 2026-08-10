'use client';

import type { GameState } from '@/engine/types';
import { leagueFixtures, userLeagueId } from '@/engine/seasonProgression';
import { isClubAlive, knockoutRoundDue, roundName } from '@/engine/cups';
import { continentalRoundDue, continentalRoundName, isContinentalClubAlive } from '@/engine/europeanCup';
import { getSchedule } from '@/engine/schedule';
import {
  DAY_LABELS, MATCH_DAY, dayIndexOfDay, dayOfSeason, formatGameDateOfDay, weekOfDayNumber,
} from '@/engine/calendar';
import { Icon, type IconName } from './Icon';

/** How far ahead the Calendar looks. Four weeks is enough to plan a run up
 *  to (and just past) the next couple of matches without listing the whole
 *  season, which would mostly be blank days. */
const HORIZON_DAYS = 28;

type Row = {
  day: number;
  isToday: boolean;
  label: string;
  weekday: string;
  event: { title: string; sub: string; icon: IconName; kind: 'match' | 'cup' | 'euro' } | null;
  scheduleType: 'training' | 'recovery';
};

function buildRows(state: GameState): Row[] {
  const today = dayOfSeason(state);
  const leagueId = userLeagueId(state);
  const fixtures = leagueFixtures(state, leagueId);
  const week = getSchedule(state);
  const rows: Row[] = [];

  for (let d = today; d < today + HORIZON_DAYS; d++) {
    const dIdx = dayIndexOfDay(d);
    const wk = weekOfDayNumber(d);
    let event: Row['event'] = null;

    if (dIdx === MATCH_DAY) {
      const lf = fixtures.find((f) => f.round === wk && (f.homeId === state.userClubId || f.awayId === state.userClubId));
      if (lf) {
        const oppId = lf.homeId === state.userClubId ? lf.awayId : lf.homeId;
        const opp = state.clubs.find((c) => c.id === oppId);
        const atHome = lf.homeId === state.userClubId;
        event = { title: `${atHome ? 'vs' : '@'} ${opp?.name ?? 'opponent'}`, sub: atHome ? 'Home' : 'Away', icon: 'fixtures', kind: 'match' };
      } else if (knockoutRoundDue(state.cup, wk) && isClubAlive(state.cup, state.userClubId)) {
        event = { title: roundName(state.cup, state.cup.round), sub: 'Cup', icon: 'trophy', kind: 'cup' };
      } else if (continentalRoundDue(state.continental, wk) && isContinentalClubAlive(state.continental, state.userClubId)) {
        event = { title: continentalRoundName(state.continental, state.continental.round), sub: 'Europe', icon: 'european', kind: 'euro' };
      }
    }

    rows.push({
      day: d,
      isToday: d === today,
      label: formatGameDateOfDay(state.seasonYear, d),
      weekday: DAY_LABELS[dIdx],
      event,
      scheduleType: week[dIdx] ?? 'recovery',
    });
  }
  return rows;
}

/**
 * Calendar: the season laid out as days, not weeks — matches, cup ties and
 * the Weekly Schedule's training/recovery split for the next four weeks,
 * each future day offering "Simulate to here" so the player can jump
 * straight to a date they care about (a run-in, a cup draw, transfer
 * deadline day) without clicking through the days in between one at a time.
 *
 * Shares its simulate engine with the action dock's Next Event button
 * (`onSimulate`, owned by FootballManagerGame) — this screen only adds a
 * *target*; the stop rules (matchday, injuries, offers…) still apply on the
 * way there, so "simulate to here" can still pull up short of its target
 * with something that needs a look.
 */
export default function CalendarScreen({
  state,
  onSimulate,
  simRunning,
}: {
  state: GameState;
  onSimulate: (untilDay?: number) => void;
  simRunning: boolean;
}) {
  const rows = buildRows(state);

  return (
    <>
      <div className="fm-panel">
        {/* No header "Next event" button here — the persistent action dock
            at the bottom of every Hub tab already has one, always visible
            on this screen too. Repeating it here was the same control
            twice on screen at once. This screen's own contribution is
            picking a *target* day via "Simulate to here" below. */}
        <p className="fm-label" style={{ margin: 0 }}>Calendar</p>
        <p className="fm-hint" style={{ textAlign: 'left', margin: '2px 0 0' }}>
          Next four weeks. Simulate straight to a day — the sim still stops early for anything that needs you.
        </p>
      </div>

      <div className="fm-panel">
        <div className="fm-calendar-list" data-tour="calendar-grid">
          {rows.map((row) => (
            <div key={row.day} className={`fm-calendar-row${row.isToday ? ' fm-calendar-row--today' : ''}`}>
              <div className="fm-calendar-row__date">
                <span className="fm-calendar-row__weekday">{row.isToday ? 'Today' : row.weekday}</span>
                <span className="fm-calendar-row__day">{row.label}</span>
              </div>

              <div className="fm-calendar-row__body">
                {row.event ? (
                  <span className={`fm-calendar-row__event fm-calendar-row__event--${row.event.kind}`}>
                    <Icon name={row.event.icon} size={14} /> {row.event.title}
                    <span className="fm-hint" style={{ margin: '0 0 0 6px' }}>{row.event.sub}</span>
                  </span>
                ) : (
                  <span className="fm-calendar-row__training">
                    <Icon name={row.scheduleType === 'training' ? 'training' : 'fitness'} size={13} />
                    {row.scheduleType === 'training' ? 'Training' : 'Recovery'}
                  </span>
                )}
              </div>

              {!row.isToday && (
                <button
                  type="button"
                  className="fm-btn fm-btn--ghost fm-btn--small"
                  disabled={simRunning}
                  title={simRunning ? 'Stop the current run first' : `Simulate to ${row.label}`}
                  onClick={() => onSimulate(row.day)}
                >
                  Simulate to here
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
