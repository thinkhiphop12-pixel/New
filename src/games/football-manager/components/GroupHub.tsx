'use client';

import type { GameState } from '@/engine/types';
import { SEASON_ROUNDS, leagueName } from '@/engine/gameRules';
import { computeTable, nextUserFixture, userLeagueId } from '@/engine/seasonProgression';
import { getSquad, isLineupValid } from '@/engine/teamManagement';
import { formatMoney } from '@/engine/utils';
import { ReputationStars } from './visuals';
import { Crest } from './Crest';
import ManagerAvatar from './ManagerAvatar';
import { Icon } from './Icon';
import { GROUPS, groupBadge, type GroupId } from './hubNav';

/**
 * The Hub landing screen (gap: "less text, easier to navigate").
 *
 * Four cards, one per group, each carrying a single live line so the hub is
 * worth looking at rather than being a pure menu — next opponent, squad
 * state, spending power, unread post. Everything deeper lives behind the
 * card; the dashboard modules that used to crowd this space are now
 * Matchday → Overview (PortalHub).
 */
export default function GroupHub({
  state,
  onOpen,
}: {
  state: GameState;
  onOpen: (id: GroupId) => void;
}) {
  const club = state.clubs.find((c) => c.id === state.userClubId)!;
  const leagueId = userLeagueId(state);
  const table = computeTable(state, leagueId);
  const position = table.findIndex((r) => r.clubId === state.userClubId) + 1;
  // A short window of the table centred on the user's club — three rows
  // either side where possible, otherwise pinned to the top/bottom edge.
  const tableStart = Math.min(Math.max(position - 1 - 3, 0), Math.max(table.length - 7, 0));
  const tableSlice = table.slice(tableStart, tableStart + 7);

  const latestNews = [...state.inbox].sort((a, b) => b.id - a.id)[0] ?? null;

  const fixture = nextUserFixture(state);
  const opponentId = fixture ? (fixture.homeId === state.userClubId ? fixture.awayId : fixture.homeId) : null;
  const opponent = opponentId ? state.clubs.find((c) => c.id === opponentId) : null;
  const atHome = fixture ? fixture.homeId === state.userClubId : false;

  const squadSize = getSquad(state, state.userClubId).length;
  const lineupOk = isLineupValid(state, state.userClubId, state.lineup);
  const unread = state.inbox.filter((i) => !i.read).length;

  // One live line per group. `warn` turns the line amber — a state the
  // player should act on, distinct from the red badge which counts items
  // waiting in a queue.
  const lines: Record<GroupId, { text: string; warn?: boolean }> = {
    matchday: opponent
      ? { text: `vs ${opponent.name} · ${atHome ? 'Home' : 'Away'}` }
      : { text: 'No fixture this week' },
    team: {
      text: `${squadSize} players · ${lineupOk ? 'Lineup set' : 'Lineup incomplete'}`,
      warn: !lineupOk,
    },
    market: { text: `${formatMoney(state.budget)} to spend`, warn: state.budget < 0 },
    club: { text: unread > 0 ? `${unread} unread` : 'Inbox clear' },
  };

  return (
    <div className="fm-portal">
      <div className="fm-portal__header">
        <Crest name={club.name} code={club.code} color={club.color} size={48} />
        <div className="fm-portal__club-info">
          <h1 className="fm-portal__club-name">
            {club.name}
            {club.reputation != null && <ReputationStars value={club.reputation} />}
          </h1>
          <p className="fm-portal__club-meta">
            {state.seasonYear}/{(state.seasonYear + 1) % 100} · {position}
            {ord(position)} in the {leagueName(leagueId)}
          </p>
        </div>
        {state.managerProfile && (
          <ManagerAvatar
            config={state.managerProfile.avatarConfig}
            size={40}
            title={state.managerProfile.name}
            className="fm-portal__manager-avatar"
            style={{ borderRadius: '50%', border: '2px solid rgba(90, 242, 184, 0.3)', flexShrink: 0 }}
          />
        )}
        <div className="fm-portal__week-badge">
          <span className="week-num">{Math.min(state.week, SEASON_ROUNDS)}</span>
          <span className="week-lbl">
            Wk {Math.min(state.week, SEASON_ROUNDS)}/{SEASON_ROUNDS}
          </span>
        </div>
      </div>

      {latestNews && (
        <button
          type="button"
          className="fm-hubnews"
          onClick={() => onOpen('club')}
        >
          <span className="fm-hubnews__head">
            <Icon name="inbox" size={12} />
            {!latestNews.read && <span className="fm-hubnews__tag">New</span>}
            <span className="fm-hubnews__cat">{latestNews.category}</span>
          </span>
          <span className="fm-hubnews__title">{latestNews.title}</span>
        </button>
      )}

      <button type="button" className="fm-hubtable" onClick={() => onOpen('matchday')}>
        <span className="fm-hubtable__head">
          <span>{leagueName(leagueId)}</span>
          <Icon name="chevron" size={14} />
        </span>
        <table className="fm-table fm-hubtable__table">
          <tbody>
            {tableSlice.map((row, i) => {
              const c = state.clubs.find((cl) => cl.id === row.clubId)!;
              const isMe = row.clubId === state.userClubId;
              return (
                <tr key={row.clubId} className={isMe ? 'me' : ''}>
                  <td>{tableStart + i + 1}</td>
                  <td>
                    <span className="fm-table__club-inner">
                      <Crest name={c.name} code={c.code} color={c.color} size={16} />
                      <span className="fm-table__club-name">{c.name}</span>
                    </span>
                  </td>
                  <td>{row.played}</td>
                  <td className="pts">{row.pts}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </button>

      <div className="fm-groupgrid">
        {GROUPS.map((g) => {
          const count = groupBadge(state, g.id);
          const line = lines[g.id];
          return (
            <button
              key={g.id}
              className={`fm-groupcard fm-groupcard--${g.id}`}
              onClick={() => onOpen(g.id)}
            >
              <span className="fm-groupcard__icon">
                <Icon name={g.icon} size={26} />
              </span>
              <span className="fm-groupcard__body">
                <span className="fm-groupcard__name">{g.label}</span>
                <span className={`fm-groupcard__line${line.warn ? ' fm-groupcard__line--warn' : ''}`}>
                  {line.warn && <Icon name="warning" size={12} />}
                  {line.text}
                </span>
              </span>
              {count > 0 && <span className="fm-groupcard__badge">{count}</span>}
              <Icon name="chevron" size={16} className="fm-groupcard__chev" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ord(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return 'th';
  return ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
}
