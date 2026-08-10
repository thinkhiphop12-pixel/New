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
import FacilitiesScreen from './FacilitiesScreen';
import FinancesScreen from './FinancesScreen';
import BoardObjectivesScreen from './BoardObjectivesScreen';
import JobMarketScreen from './JobMarketScreen';
import EuropeanScreen from './EuropeanScreen';
import TrainingScreen from './TrainingScreen';
import OneToOneScreen from './OneToOneScreen';
import StaffHubScreen from './StaffHubScreen';
import ScoutingScreen from './ScoutingScreen';
import YouthAcademyScreen from './YouthAcademyScreen';
import { Icon } from './Icon';
import {
  GROUPS,
  firstScreenOf,
  groupOf,
  groupBadge,
  isScreenVisible,
  screenBadge,
  type GroupId,
  type ScreenId,
} from './hubNav';

/**
 * The in-game shell: a four-entry rail beside the current screen, with the
 * active group's sibling screens as a sub-tab strip.
 *
 * The rail used to carry a fifth, hard-coded "Hub" button next to a
 * "Matchday" group whose landing screen was the very same `Dashboard` this
 * one rendered — two destinations for one screen. Hub is now itself a group
 * (see hubNav.ts), so `route === null` simply means its Overview.
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
  /** `null` is the Hub landing — the club at a glance and nothing else. */
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
  // `null` is the Hub landing, which is now just Hub → Overview.
  const activeRoute: ScreenId = route ?? 'overview';
  const group = groupOf(activeRoute);
  // Cups/Europe only show once the club is actually in them (engine/cups.ts,
  // engine/europeanCup.ts) — a tab that always says "nothing here" reads as
  // broken. Filtered here rather than in GROUPS itself, since GROUPS is a
  // static, module-level structure with no access to per-save state.
  const visibleScreens = group.screens.filter((s) => isScreenVisible(state, s.id));

  // If the tab currently open just became hidden (cup elimination, failure
  // to qualify for Europe), fall back to the group's landing screen rather
  // than stranding the player on a tab that no longer renders in the strip.
  useEffect(() => {
    if (route && !isScreenVisible(state, route)) {
      onRoute(firstScreenOf(group.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route, state.cup, state.continental]);

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
  // Seeded with the group we mount on: `group.id` is never null now, so a
  // ref starting at `null` would read as a change and steal focus on mount.
  const prevGroup = useRef<GroupId>(group.id);
  useEffect(() => {
    if (group.id !== prevGroup.current) activeTabRef.current?.focus();
    prevGroup.current = group.id;
  }, [group.id]);

  // Automatic activation, which is the right ARIA pattern for tabs that swap
  // instantly with no loading step.
  const onTabKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const ids = visibleScreens.map((s) => s.id);
    const i = ids.indexOf(activeRoute);
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
    switch (activeRoute) {
      case 'overview': return <Dashboard state={state} onChange={onChange} onAbandon={onAbandon} onOpenScreen={onRoute} onSimulate={onSimulate} simRunning={simRunning} />;
      case 'calendar': return <CalendarScreen state={state} onSimulate={onSimulate} simRunning={simRunning} />;
      case 'fixtures': return <FixturesScreen state={state} />;
      case 'table': return <TableScreen state={state} />;
      case 'cups': return <CupScreen state={state} />;
      case 'european': return <EuropeanScreen state={state} />;
      case 'squad': return <SquadScreen state={state} onChange={onChange} onRoute={onRoute} />;
      case 'tactics': return <TacticsScreen state={state} onChange={onChange} />;
      case 'training': return <TrainingScreen state={state} onChange={onChange} />;
      case 'one-to-one': return <OneToOneScreen state={state} onChange={onChange} />;
      case 'transfers': return <TransfersScreen state={state} onChange={onChange} />;
      case 'scouting': return <ScoutingScreen state={state} onChange={onChange} />;
      case 'inbox': return <InboxScreen state={state} onChange={onChange} onOpenScreen={onRoute} />;
      case 'facilities': return <FacilitiesScreen state={state} onChange={onChange} />;
      case 'staff': return <StaffHubScreen state={state} onChange={onChange} />;
      case 'academy': return <YouthAcademyScreen state={state} onChange={onChange} />;
      case 'finances': return <FinancesScreen state={state} onChange={onChange} />;
      case 'board': return <BoardObjectivesScreen state={state} />;
      case 'jobs': return <JobMarketScreen state={state} onChange={onChange} />;
      default: return null;
    }
  };

  return (
    <div className="fm-hub-shell">
      {/* One rail for both layouts: a sticky icon column at ≥900px, a fixed
          thumb dock below it. Four destinations fit a phone directly, which
          is why the old "More" overflow sheet is gone. */}
      <nav className="fm-rail" aria-label="Game sections" data-tour="rail">
        {GROUPS.map((g) => {
          const count = groupBadge(state, g.id);
          const on = group.id === g.id;
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
        <div className="fm-subnav" data-tour="subnav">
          <span className="fm-subnav__group">
            <Icon name={group.icon} size={13} /> {group.label}
          </span>
          <div
            className="fm-subnav__tabs"
            role="tablist"
            aria-label={`${group.label} screens`}
            onKeyDown={onTabKeyDown}
          >
            {visibleScreens.map((s) => {
              const on = s.id === activeRoute;
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
          key={activeRoute}
          className="fm-hub-panel fm-screen-slide"
          id="fm-screen-panel"
          role="tabpanel"
          aria-labelledby={`fm-subtab-${activeRoute}`}
          tabIndex={-1}
        >
          {screen()}
        </div>
      </div>
    </div>
  );
}
