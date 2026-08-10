import type { GameState } from '@/engine/types';
import { isLineupValid } from '@/engine/teamManagement';
import { isClubAlive } from '@/engine/cups';
import { isContinentalClubAlive } from '@/engine/europeanCup';
import type { IconName } from './Icon';

/**
 * The hub's two-level navigation model.
 *
 * Six sections in the bar, two to four screens inside each. The previous
 * shape was four sections, one of which (Club) held eight screens and
 * opened on an *Overview* built entirely out of icon tiles that duplicated
 * the sub-tab strip directly above it. Every group had one of those. So the
 * player met the same destination three ways — rail icon, tile, sub-tab —
 * and the screens themselves were mostly navigation.
 *
 * Moving destinations up into the bar means each one is reachable in one
 * tap, the strip under it is short enough to read at a glance, and the
 * icon-grid landing screens are gone entirely: opening a section lands you
 * on something that does a job, not on a menu.
 *
 * Two things also went with them. **Identity** was a nine-panel scroll of
 * club trivia, most of it restated from Finances, Board and Squad; what was
 * worth keeping (records, legends, the captain's armband) now lives with the
 * screens it belongs to. **Weekly Schedule** was unreachable from the strip
 * anyway and has folded into Training, where the rest of the week's plan is.
 */

export type ScreenId =
  | 'overview' | 'calendar' | 'inbox'
  | 'squad' | 'tactics'
  | 'training' | 'one-to-one' | 'academy'
  | 'transfers' | 'scouting' | 'jobs'
  | 'facilities' | 'staff' | 'finances' | 'board'
  | 'table' | 'fixtures' | 'cups' | 'european';

export type GroupId = 'home' | 'squad' | 'training' | 'market' | 'club' | 'league';

export type ScreenDef = { id: ScreenId; label: string; icon: IconName };
export type GroupDef = {
  id: GroupId;
  label: string;
  icon: IconName;
  /** First entry is the screen you land on when you open the group. */
  screens: ScreenDef[];
};

export const GROUPS: GroupDef[] = [
  {
    id: 'home',
    label: 'Home',
    icon: 'home',
    screens: [
      { id: 'overview', label: 'Overview', icon: 'home' },
      { id: 'inbox', label: 'Inbox', icon: 'inbox' },
      { id: 'calendar', label: 'Calendar', icon: 'calendar' },
    ],
  },
  {
    id: 'squad',
    label: 'Squad',
    icon: 'squad',
    screens: [
      { id: 'squad', label: 'Players', icon: 'squad' },
      { id: 'tactics', label: 'Tactics', icon: 'tactics' },
    ],
  },
  {
    id: 'training',
    label: 'Training',
    icon: 'training',
    screens: [
      { id: 'training', label: 'Team', icon: 'training' },
      { id: 'one-to-one', label: 'One-to-one', icon: 'person' },
      { id: 'academy', label: 'Academy', icon: 'sprout' },
    ],
  },
  {
    id: 'market',
    label: 'Market',
    icon: 'transfers',
    screens: [
      { id: 'transfers', label: 'Transfers', icon: 'transfers' },
      { id: 'scouting', label: 'Scouting', icon: 'binoculars' },
      // The manager's own market. It sat in Club next to "Job Security",
      // where the two near-identical labels meant opposite things; it is a
      // market, so it lives with the others.
      { id: 'jobs', label: 'Jobs', icon: 'document' },
    ],
  },
  {
    id: 'club',
    label: 'Club',
    icon: 'club',
    screens: [
      { id: 'board', label: 'Board', icon: 'target' },
      { id: 'staff', label: 'Staff', icon: 'staff' },
      { id: 'facilities', label: 'Facilities', icon: 'facilities' },
      { id: 'finances', label: 'Finances', icon: 'finances' },
    ],
  },
  {
    id: 'league',
    label: 'League',
    icon: 'table',
    screens: [
      { id: 'table', label: 'Table', icon: 'table' },
      { id: 'fixtures', label: 'Fixtures', icon: 'fixtures' },
      { id: 'cups', label: 'Cups', icon: 'trophy' },
      { id: 'european', label: 'Europe', icon: 'european' },
    ],
  },
];

/** screen id → the group that owns it. Built once, O(1) at call sites. */
const GROUP_OF = Object.fromEntries(
  GROUPS.flatMap((g) => g.screens.map((s) => [s.id, g])),
) as Record<ScreenId, GroupDef>;

export function groupOf(id: ScreenId): GroupDef {
  return GROUP_OF[id];
}

export function groupById(id: GroupId): GroupDef {
  return GROUPS.find((g) => g.id === id)!;
}

/** The screen a group opens on. Entering a group is always this screen —
 *  the rail and the hub card must agree, and there is no affordance saying
 *  which screen a group would resume on, so a remembered position would
 *  read as a bug rather than a convenience. */
export function firstScreenOf(id: GroupId): ScreenId {
  return groupById(id).screens[0].id;
}

/** Whether a tab should show at all for this save. Cups and Europe are
 *  built-in tabs even for a club with nothing on there — most careers spend
 *  most of a season alive in one but not the other, or neither, and an
 *  always-visible tab that says "nothing here" every time you tap it reads
 *  as a broken feature. Domestic cup entry is universal (every club plays
 *  round one), so this only ever hides Cups after elimination; Europe hides
 *  both for non-qualification and elimination, since `isContinentalClubAlive`
 *  already means both at once (engine/europeanCup.ts). */
export function isScreenVisible(state: GameState, id: ScreenId): boolean {
  if (id === 'cups') return isClubAlive(state.cup, state.userClubId);
  if (id === 'european') return isContinentalClubAlive(state.continental, state.userClubId);
  return true;
}

/**
 * Attention count for a single screen — the things that are genuinely
 * waiting on a decision, not a count of what a screen contains.
 */
export function screenBadge(state: GameState, id: ScreenId): number {
  if (id === 'transfers') {
    return (
      state.incomingOffers.length +
      (state.negotiations ?? []).filter((n) => n.type === 'incoming' && n.awaiting === 'user').length
    );
  }
  if (id === 'inbox') return state.inbox.filter((i) => !i.read).length;
  // The lineup gate. Previously this only surfaced as a PortalHub "task" and
  // as a *disabled* action-dock button — flagged, but unreachable from
  // anywhere. Badging Tactics puts it on the rail from every screen.
  if (id === 'tactics') return isLineupValid(state, state.userClubId, state.lineup) ? 0 : 1;
  // This season's trialists, until every one of them has been signed or let
  // go. The intake expires with the season, so an unanswered class is a real
  // deadline rather than a list that will keep.
  if (id === 'academy') return (state.academyIntake ?? []).length;
  // Empty individual slots. Four unused sessions a week is free development
  // being thrown away, and nothing else in the UI would ever say so.
  if (id === 'one-to-one') {
    const booked = Object.values(state.oneToOne ?? {}).filter((v) => v != null).length;
    return 4 - booked;
  }
  // Jobs badges only when the market is worth looking at *from where you are*:
  // your own board has lost patience and something is open. There is almost
  // always a vacancy somewhere, so badging on the count alone would be noise
  // the player learns to ignore.
  if (id === 'jobs') {
    const open = (state.vacancies ?? []).length;
    return open > 0 && state.board.confidence < 30 ? open : 0;
  }
  return 0;
}

/** A group's badge rolls up its screens', so nothing hides a level down. */
export function groupBadge(state: GameState, id: GroupId): number {
  return groupById(id).screens.reduce((n, s) => n + screenBadge(state, s.id), 0);
}
