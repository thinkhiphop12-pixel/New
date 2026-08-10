'use client';

import type { GameState } from '@/engine/types';
import { leagueFixtures, userLeagueId } from '@/engine/seasonProgression';
import { isClubAlive, knockoutRoundDue, roundName } from '@/engine/cups';
import { continentalRoundDue, continentalRoundName, isContinentalClubAlive } from '@/engine/europeanCup';
import { getSchedule } from '@/engine/schedule';
import { TRANSFER_WINDOWS } from '@/engine/gameRules';
import {
  DAYS_PER_WEEK, DAY_LABELS, MATCH_DAY, dayIndexOfDay, dayOfSeason, formatGameDateOfDay,
  seasonLastDay, weekOfDayNumber,
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

type Skip = { label: string; when: string; day: number; dateLabel: string; icon: IconName };

/**
 * The named places a manager actually wants to skip to.
 *
 * "Simulate to here" on a specific row already existed, but it makes the
 * player do the work: find the row that is the next match, or the row that
 * is deadline day, and press the button on it. These name the destination
 * instead. Every one of them is a target for the same engine the dock uses,
 * so the stop rules still apply on the way — a skip to deadline day that
 * runs into an injury still stops at the injury.
 *
 * Anything already behind us, or past the end of the season, is left out
 * rather than shown disabled: a row that cannot do anything is noise.
 */
function buildSkips(state: GameState, rows: Row[]): Skip[] {
  const today = dayOfSeason(state);
  const lastDay = seasonLastDay();
  const skips: Skip[] = [];

  const push = (label: string, day: number, icon: IconName) => {
    if (day <= today || day > lastDay) return;
    const days = day - today;
    skips.push({
      label,
      when: days === 1 ? 'tomorrow' : `${days} days`,
      day,
      dateLabel: formatGameDateOfDay(state.seasonYear, day),
      icon,
    });
  };

  // The next fixture of any kind, taken from the rows already built so the
  // two can never disagree about when the next match is.
  const nextMatch = rows.find((r) => !r.isToday && r.event);
  if (nextMatch) push(`Next match — ${nextMatch.event!.title}`, nextMatch.day, nextMatch.event!.icon);

  // Monday of next week: the natural planning boundary, since training and
  // the weekly schedule both reset on it.
  const dayIdx = dayIndexOfDay(today);
  push('End of the week', today + (DAYS_PER_WEEK - dayIdx), 'calendar');

  // Whichever transfer deadline is still ahead. `closes` is the last week
  // the window is open, so the deadline is the end of that week.
  const week = weekOfDayNumber(today);
  const window = TRANSFER_WINDOWS.find((w) => w.closes >= week);
  if (window) {
    const deadlineDay = window.closes * DAYS_PER_WEEK - 1;
    push(`${window.name} deadline day`, deadlineDay, 'transfers');
  }

  return skips;
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
  const skips = buildSkips(state, rows);

  return (
    <>
      <div className="fm-panel">
        {/* No header "Next event" button here — the persistent action dock
            at the bottom of every Hub tab already has one, always visible
            on this screen too. Repeating it here was the same control
            twice on screen at once. This screen's own contribution is
            picking a *target* day via "Simulate to here" below. */}
        <p className="fm-label" style={{ margin: 0 }}>Calendar</p>
        <p className="fm-hint" style={{ textAlign: 'left', margin: '2px 0 6px' }}>
          Next four weeks. Simulate straight to a day — the sim still stops early for anything that needs you.
        </p>

        {/* Named destinations, not just "the next thing". The dock's Next
            Event answers "what happens next"; these answer "get me to the
            part I care about" — the question a manager who wants to plan a
            run-in, or get to deadline day, was previously left to solve by
            counting rows and clicking one of them. */}
        <div className="fm-skiprow" data-tour="calendar-skips">
          {skips.map((s) => (
            <button
              key={s.label}
              type="button"
              className="fm-skipbtn"
              disabled={simRunning}
              title={simRunning ? 'Stop the current run first' : `Simulate to ${s.dateLabel}`}
              onClick={() => onSimulate(s.day)}
            >
              <Icon name={s.icon} size={14} />
              <span className="fm-skipbtn__label">{s.label}</span>
              <span className="fm-skipbtn__when">{s.when}</span>
            </button>
          ))}
        </div>
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
