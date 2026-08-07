'use client';

import type { GameState } from '@/engine/types';
import { SEASON_ROUNDS, leagueName } from '@/engine/gameRules';
import { computeTable, leagueFixtures, userLeagueId } from '@/engine/seasonProgression';
import { isClubAlive, knockoutRoundDue, roundName } from '@/engine/cups';
import { continentalRoundDue, continentalRoundName, isContinentalClubAlive } from '@/engine/europeanCup';
import { ReputationStars } from './visuals';
import { Crest } from './Crest';
import ManagerAvatar from './ManagerAvatar';
import { Icon, type IconName } from './Icon';
import type { GroupId } from './hubNav';

type CalRow = { week: number; label: string; sub: string; icon: IconName; soon?: boolean };

/**
 * A short look-ahead schedule for the Hub's Calendar card (mock: "Calendar
 * 2025") — the mock's mock data is a day-by-day training calendar, which
 * this game doesn't model (weeks, not days, are the sim's smallest unit).
 * The honest equivalent is the next handful of *weeks* carrying a fixture,
 * built from real league/cup/continental schedule data rather than
 * fabricated daily events.
 */
function buildCalendar(state: GameState, leagueId: string): CalRow[] {
  const rows: CalRow[] = [];
  const fixtures = leagueFixtures(state, leagueId);
  const cup = state.cup;
  const euro = state.continental;
  for (let w = state.week; w < state.week + 12 && rows.length < 6; w++) {
    const lf = fixtures.find(
      (f) => f.round === w && (f.homeId === state.userClubId || f.awayId === state.userClubId)
    );
    if (lf) {
      const oppId = lf.homeId === state.userClubId ? lf.awayId : lf.homeId;
      const opp = state.clubs.find((c) => c.id === oppId);
      const atHome = lf.homeId === state.userClubId;
      rows.push({
        week: w,
        label: `Week ${w}`,
        sub: `${atHome ? 'vs' : '@'} ${opp?.name ?? '—'}`,
        icon: 'fixtures',
        soon: w === state.week,
      });
    }
    if (knockoutRoundDue(cup, w) && isClubAlive(cup, state.userClubId)) {
      rows.push({ week: w, label: `Week ${w}`, sub: roundName(cup, cup.round), icon: 'trophy', soon: w === state.week });
    }
    if (continentalRoundDue(euro, w) && isContinentalClubAlive(euro, state.userClubId)) {
      rows.push({
        week: w,
        label: `Week ${w}`,
        sub: continentalRoundName(euro, euro.round),
        icon: 'european',
        soon: w === state.week,
      });
    }
  }
  return rows.slice(0, 6);
}

/**
 * The Hub landing screen (gap: "less text, easier to navigate").
 *
 * The club header, the latest piece of post, a window on the league table
 * and the weeks ahead. It used to end in a grid of four group cards
 * duplicating the rail beside it — the rail is the navigation, so the cards
 * are gone and this screen is only the glance. Everything deeper lives
 * behind the rail; the dashboard modules that used to crowd this space are
 * now Matchday → Overview (PortalHub).
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
  const calendar = buildCalendar(state, leagueId);



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

      <div className="fm-hub-top">
        <div className="fm-hub-top__main">
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

          <div className="fm-hubtable">
            <button type="button" className="fm-hubtable__head" onClick={() => onOpen('matchday')} style={{ background: 'transparent', border: 'none', padding: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', cursor: 'pointer', font: 'inherit', color: 'inherit' }}>
              <span>{leagueName(leagueId)}</span>
              <Icon name="chevron" size={14} />
            </button>
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
          </div>
        </div>

        <div className="fm-hubcal">
          <button type="button" onClick={() => onOpen('matchday')} style={{ background: 'transparent', border: 'none', padding: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', cursor: 'pointer', font: 'inherit', color: 'inherit' }}>
            <span>Coming up</span>
            <Icon name="chevron" size={14} />
          </button>
          {calendar.length > 0 ? (
            <ul className="fm-hubcal__list">
              {calendar.map((row, i) => (
                <li key={i} className={`fm-hubcal__row${row.soon ? ' fm-hubcal__row--soon' : ''}`}>
                  <span className="fm-hubcal__text">
                    <span className="fm-hubcal__label">{row.label}</span>
                    <span className="fm-hubcal__sub">{row.sub}</span>
                  </span>
                  <span className="fm-icon-tile fm-icon-tile--sm">
                    <Icon name={row.icon} size={15} />
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="fm-hint" style={{ margin: 0 }}>No fixtures scheduled.</p>
          )}
        </div>
      </div>

    </div>
  );
}

function ord(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return 'th';
  return ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
}
