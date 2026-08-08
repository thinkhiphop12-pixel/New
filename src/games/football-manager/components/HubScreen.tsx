'use client';

import { useEffect, useRef, type KeyboardEvent } from 'react';
import type { GameState } from '@/engine/types';
import Dashboard from './Dashboard';
import CalendarScreen from './CalendarScreen';
import InboxScreen from './InboxScreen';
import SquadScreen from './SquadScreen';
import TacticsScreen from './TacticsScreen';
import TransfersScreen from './TransfersScreen';
import TableScreen from './TableScreen';
import FixturesScreen from './FixturesScreen';
import CupScreen from './CupScreen';
import ClubScreen from './ClubScreen';
import FacilitiesScreen from './FacilitiesScreen';
import FinancesScreen from './FinancesScreen';
import BoardObjectivesScreen from './BoardObjectivesScreen';
import JobMarketScreen from './JobMarketScreen';
import EuropeanScreen from './EuropeanScreen';
import TrainingScreen from './TrainingScreen';
import WeeklyScheduleScreen from './WeeklyScheduleScreen';
import StaffHubScreen from './StaffHubScreen';
import ScoutingScreen from './ScoutingScreen';
import YouthAcademyScreen from './YouthAcademyScreen';
import { Icon } from './Icon';
import {
  GROUPS,
  firstScreenOf,
  groupOf,
  groupBadge,
  screenBadge,
  type GroupId,
  type ScreenId,
} from './hubNav';

/**
 * The in-game shell: a five-entry rail (Hub + the four groups) beside the
 * current screen, with the group's sibling screens as a sub-tab strip.
 *
 * `route` is owned by FootballManagerGame, not by this component. HubScreen
 * is remounted on every top-level view change (the `key={view}` fade
 * wrapper), so local route state would reset every time you came back from
 * a match — dumping you on the Hub instead of the post-match Overview.
 */
export default function HubScreen({
  state,
  route,
  onRoute,
  onChange,
  onAbandon,
  onSimulate,
  simRunning,
}: {
  state: GameState;
  /** `null` is the Hub landing — the four group cards and nothing else. */
  route: ScreenId | null;
  onRoute: (next: ScreenId | null) => void;
  onChange: (next: GameState) => void;
  onAbandon: () => void;
  /** Skip straight to the next event, or (with a day-of-season target) to a
   *  specific day — the same engine the dock's Next Event button uses. Only
   *  consumed by the Calendar screen's per-day "Simulate to here" today. */
  onSimulate: (untilDay?: number) => void;
  /** Whether a run is currently in progress, so Calendar can offer to
   *  cancel it instead of starting a second one. */
  simRunning: boolean;
}) {
  const group = route === null ? null : groupOf(route);

  // Same in-place-swap scroll issue as the top-level view switch: reset to
  // the top of the (new, usually shorter) screen whenever the destination
  // changes, so the nav doesn't start out scrolled off-screen.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [route]);

  // Entering a group moves focus onto its active sub-tab, so the arrow keys
  // work immediately and the next Tab lands in the screen itself. Guarded on
  // a real group *change* so nothing steals focus on mount or when switching
  // screens within a group.
  const activeTabRef = useRef<HTMLButtonElement>(null);
  const prevGroup = useRef<GroupId | null>(null);
  useEffect(() => {
    const id = group?.id ?? null;
    if (id && id !== prevGroup.current) activeTabRef.current?.focus();
    prevGroup.current = id;
  }, [group?.id]);

  // Automatic activation, which is the right ARIA pattern for tabs that swap
  // instantly with no loading step.
  const onTabKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!group) return;
    const ids = group.screens.map((s) => s.id);
    const i = ids.indexOf(route as ScreenId);
    let next: ScreenId | undefined;
    if (e.key === 'ArrowRight') next = ids[(i + 1) % ids.length];
    else if (e.key === 'ArrowLeft') next = ids[(i - 1 + ids.length) % ids.length];
    else if (e.key === 'Home') next = ids[0];
    else if (e.key === 'End') next = ids[ids.length - 1];
    if (!next) return;
    e.preventDefault();
    onRoute(next);
  };

  const screen = () => {
    switch (route) {
      case 'overview': return <Dashboard state={state} onChange={onChange} onAbandon={onAbandon} onOpenScreen={onRoute} />;
      case 'calendar': return <CalendarScreen state={state} onSimulate={onSimulate} simRunning={simRunning} />;
      case 'fixtures': return <FixturesScreen state={state} />;
      case 'table': return <TableScreen state={state} />;
      case 'cups': return <CupScreen state={state} />;
      case 'european': return <EuropeanScreen state={state} />;
      case 'squad': return <SquadScreen state={state} onChange={onChange} />;
      case 'tactics': return <TacticsScreen state={state} onChange={onChange} />;
      case 'training': return <TrainingScreen state={state} onChange={onChange} />;
      case 'schedule': return <WeeklyScheduleScreen state={state} onChange={onChange} />;
      case 'transfers': return <TransfersScreen state={state} onChange={onChange} />;
      case 'scouting': return <ScoutingScreen state={state} onChange={onChange} />;
      case 'inbox': return <InboxScreen state={state} onChange={onChange} onOpenScreen={onRoute} />;
      case 'club': return <ClubScreen state={state} onChange={onChange} />;
      case 'facilities': return <FacilitiesScreen state={state} onChange={onChange} />;
      case 'staff': return <StaffHubScreen state={state} onChange={onChange} />;
      case 'academy': return <YouthAcademyScreen state={state} onChange={onChange} />;
      case 'finances': return <FinancesScreen state={state} />;
      case 'board': return <BoardObjectivesScreen state={state} />;
      case 'jobs': return <JobMarketScreen state={state} onChange={onChange} />;
      default: return null;
    }
  };

  return (
    <div className="fm-hub-shell">
      {/* One rail for both layouts: a sticky icon column at ≥900px, a fixed
          thumb dock below it. Five destinations fit a phone directly, which
          is why the old "More" overflow sheet is gone. */}
      <nav className="fm-rail" aria-label="Game sections">
        <button
          type="button"
          className={`fm-rail__item${route === null ? ' active' : ''}`}
          onClick={() => onRoute(null)}
          aria-current={route === null ? 'page' : undefined}
          title="Hub"
        >
          <Icon name="home" size={19} className="fm-rail__icon" />
          <span className="fm-rail__label">Hub</span>
        </button>
        {GROUPS.map((g) => {
          const count = groupBadge(state, g.id);
          const on = group?.id === g.id;
          return (
            <button
              key={g.id}
              type="button"
              className={`fm-rail__item${on ? ' active' : ''}`}
              onClick={() => onRoute(firstScreenOf(g.id))}
              aria-current={on ? 'page' : undefined}
              title={g.label}
            >
              <Icon name={g.icon} size={19} className="fm-rail__icon" />
              <span className="fm-rail__label">{g.label}</span>
              {count > 0 && (
                <span className="fm-rail__badge">
                  {count}
                  <span className="fm-u-sr"> needing attention</span>
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="fm-hub-shell__main">
        {group ? (
          <>
            <div className="fm-subnav">
              <span className="fm-subnav__group">
                <Icon name={group.icon} size={13} /> {group.label}
              </span>
              <div
                className="fm-subnav__tabs"
                role="tablist"
                aria-label={`${group.label} screens`}
                onKeyDown={onTabKeyDown}
              >
                {group.screens.map((s) => {
                  const on = s.id === route;
                  const count = screenBadge(state, s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      id={`fm-subtab-${s.id}`}
                      role="tab"
                      aria-selected={on}
                      aria-controls="fm-screen-panel"
                      tabIndex={on ? 0 : -1}
                      ref={on ? activeTabRef : undefined}
                      className={`fm-subtab${on ? ' active' : ''}`}
                      onClick={() => onRoute(s.id)}
                    >
                      <Icon name={s.icon} size={14} className="fm-subtab__icon" />
                      <span className="fm-subtab__label">{s.label}</span>
                      {count > 0 && (
                        <span className="fm-subtab__badge">
                          {count}
                          <span className="fm-u-sr"> needing attention</span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              className="fm-hub-panel"
              id="fm-screen-panel"
              role="tabpanel"
              aria-labelledby={`fm-subtab-${route}`}
              tabIndex={-1}
            >
              {screen()}
            </div>
          </>
        ) : (
          <Dashboard state={state} onChange={onChange} onAbandon={onAbandon} onOpenScreen={onRoute} />
        )}
      </div>
    </div>
  );
}
