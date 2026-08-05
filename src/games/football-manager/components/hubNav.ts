import type { GameState } from '@/engine/types';
import { isLineupValid } from '@/engine/teamManagement';
import type { IconName } from './Icon';

/**
 * The hub's two-level navigation model.
 *
 * Level 1 is the Hub landing screen: four group cards, nothing else.
 * Level 2 is a group — you land on its first screen and switch between
 * siblings with the sub-tab strip.
 *
 * This replaces the old flat 14-entry rail (plus its "More" overflow sheet
 * on phones), which showed every destination at once and made the phone dock
 * need progressive disclosure. Five top-level destinations — Hub plus the
 * four groups — fit a thumb dock without an overflow menu, so both layouts
 * now render the same single `.fm-rail`.
 */

export type ScreenId =
  | 'overview' | 'fixtures' | 'table' | 'cups' | 'european'
  | 'squad' | 'tactics' | 'training'
  | 'transfers'
  | 'inbox' | 'club' | 'facilities' | 'finances' | 'board';

export type GroupId = 'matchday' | 'team' | 'market' | 'club';

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
    id: 'matchday',
    label: 'Matchday',
    icon: 'stadium',
    screens: [
      { id: 'overview', label: 'Overview', icon: 'home' },
      { id: 'fixtures', label: 'Fixtures', icon: 'fixtures' },
      { id: 'table', label: 'Table', icon: 'table' },
      { id: 'cups', label: 'Cups', icon: 'trophy' },
      { id: 'european', label: 'Europe', icon: 'european' },
    ],
  },
  {
    id: 'team',
    label: 'Team',
    icon: 'squad',
    screens: [
      { id: 'squad', label: 'Squad', icon: 'squad' },
      { id: 'tactics', label: 'Tactics', icon: 'tactics' },
      { id: 'training', label: 'Training', icon: 'training' },
    ],
  },
  {
    id: 'market',
    label: 'Market',
    icon: 'transfers',
    screens: [
      { id: 'transfers', label: 'Transfers', icon: 'transfers' },
    ],
  },
  {
    id: 'club',
    label: 'Club',
    icon: 'club',
    screens: [
      { id: 'inbox', label: 'Inbox', icon: 'inbox' },
      { id: 'club', label: 'Club', icon: 'club' },
      { id: 'facilities', label: 'Facilities', icon: 'facilities' },
      { id: 'finances', label: 'Finances', icon: 'finances' },
      { id: 'board', label: 'Board', icon: 'club' },
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

/**
 * Attention count for a single screen. Only two screens can demand
 * attention: transfers (offers waiting on us — both the old flat offers and
 * Phase-7 negotiations, which populate independently) and inbox (unread).
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
  return 0;
}

/** A group's badge rolls up its screens', so nothing hides a level down. */
export function groupBadge(state: GameState, id: GroupId): number {
  return groupById(id).screens.reduce((n, s) => n + screenBadge(state, s.id), 0);
}
