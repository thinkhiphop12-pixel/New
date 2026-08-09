'use client';

import type { GameState } from '@/engine/types';
import { computeTable, leagueFixtures, nextUserFixture, userLeagueId } from '@/engine/seasonProgression';
import { leagueName } from '@/engine/gameRules';
import { isClubAlive, knockoutRoundDue, roundName, clubRunName } from '@/engine/cups';
import {
  continentalRoundDue, continentalRoundName, continentalRunName, isContinentalClubAlive,
} from '@/engine/europeanCup';
import { daysUntilMatchDay, relativeDays } from '@/engine/calendar';
import { Crest } from './Crest';
import { Pulse, Todos, JumpGrid, HubCard, MiniRow, Empty, toneFor, type TodoItem } from './SectionHub';
import type { ScreenId } from './hubNav';

/**
 * Season → Overview.
 *
 * This group used to open onto the exact same component as the Hub button
 * (both rendered `Dashboard`), so two of the five rail entries showed
 * identical content — the single biggest reason the rail read as confusing.
 * Hub stays the whole-club command centre; this is the results/competitions
 * equivalent of Team/Market/Club's own overview screens: where do we stand,
 * how have we been playing, what's coming up.
 */
export default function SeasonHubScreen({
  state,
  onRoute,
}: {
  state: GameState;
  onRoute: (id: ScreenId) => void;
}) {
  const leagueId = userLeagueId(state);
  const table = computeTable(state, leagueId);
  const position = table.findIndex((r) => r.clubId === state.userClubId) + 1;
  const myRow = position > 0 ? table[position - 1] : null;
  const onTrack = position > 0 && position <= state.board.minPosition;

  const fixtures = leagueFixtures(state, leagueId).filter(
    (f) => f.homeId === state.userClubId || f.awayId === state.userClubId
  );
  const results = fixtures.filter((f) => f.played).slice().reverse();
  const recent = results.slice(0, 5);
  const outcomeOf = (f: (typeof results)[number]) => {
    const isHome = f.homeId === state.userClubId;
    const gf = isHome ? f.homeGoals : f.awayGoals;
    const ga = isHome ? f.awayGoals : f.homeGoals;
    return gf > ga ? 'W' : gf < ga ? 'L' : 'D';
  };
  const form = recent.map(outcomeOf);
  const wins = form.filter((r) => r === 'W').length;

  const fixture = nextUserFixture(state);
  const opponent = fixture
    ? state.clubs.find((c) => c.id === (fixture.homeId === state.userClubId ? fixture.awayId : fixture.homeId))
    : null;

  const cupAlive = isClubAlive(state.cup, state.userClubId);
  const cupTieWeek = knockoutRoundDue(state.cup, state.week) && cupAlive;
  const cupStatus = clubRunName(state.cup, state.userClubId) ?? (cupAlive ? roundName(state.cup, state.cup.round) : 'Not in this season');

  const euroAlive = isContinentalClubAlive(state.continental, state.userClubId);
  const euroTieWeek = continentalRoundDue(state.continental, state.week) && euroAlive;
  const euroStatus = continentalRunName(state.continental, state.userClubId)
    ?? (euroAlive ? continentalRoundName(state.continental, state.continental.round) : 'Not qualified');

  const todos: TodoItem[] = [];
  if (cupTieWeek) todos.push({ icon: 'trophy', label: `${cupStatus} this week`, tone: 'gold', cta: 'View', onGo: () => onRoute('cups') });
  if (euroTieWeek) todos.push({ icon: 'european', label: `${euroStatus} this week`, tone: 'gold', cta: 'View', onGo: () => onRoute('european') });
  if (position > 0 && !onTrack) todos.push({ icon: 'target', label: `${position}${ordinal(position)} — below the board's target`, tone: 'red', cta: 'Table', onGo: () => onRoute('table') });

  return (
    <>
      <Pulse
        items={[
          { icon: 'table', label: 'League position', value: position > 0 ? `${position}${ordinal(position)}` : '—', tone: position > 0 ? (onTrack ? 'green' : 'red') : 'plain' },
          { icon: 'stat', label: 'Points', value: String(myRow?.pts ?? 0) },
          { icon: 'flame', label: 'Last 5', value: form.length ? form.join('') : '—', tone: form.length ? toneFor(wins, 2, 3) : 'plain' },
          { icon: 'calendar', label: 'Next match', value: fixture ? relativeDays(daysUntilMatchDay(state)) : '—' },
        ]}
      />

      <Todos items={todos} />

      <JumpGrid
        items={[
          { icon: 'calendar', label: 'Calendar', value: fixture ? relativeDays(daysUntilMatchDay(state)) : 'Season over', onGo: () => onRoute('calendar') },
          { icon: 'fixtures', label: 'Fixtures', value: `${results.length} played`, onGo: () => onRoute('fixtures') },
          { icon: 'table', label: 'Table', value: leagueName(leagueId), onGo: () => onRoute('table') },
          { icon: 'trophy', label: 'Cups', value: cupStatus, badge: cupTieWeek ? 1 : 0, onGo: () => onRoute('cups') },
          { icon: 'european', label: 'Europe', value: euroStatus, badge: euroTieWeek ? 1 : 0, onGo: () => onRoute('european') },
        ]}
      />

      <div className="fm-hubcards">
        <HubCard title="Recent form" icon="flame" onGo={() => onRoute('fixtures')}>
          {recent.length === 0 ? (
            <Empty text="No results yet this season." />
          ) : (
            recent.map((f) => {
              const oc = outcomeOf(f);
              const oppId = f.homeId === state.userClubId ? f.awayId : f.homeId;
              const opp = state.clubs.find((c) => c.id === oppId);
              const isHome = f.homeId === state.userClubId;
              return (
                <MiniRow
                  key={f.round}
                  left={
                    <span className="fm-minirow__player">
                      {opp && <Crest name={opp.name} code={opp.code} color={opp.color} size={18} />}
                      {opp?.name ?? '—'}
                    </span>
                  }
                  sub={`${isHome ? 'H' : 'A'} · Wk ${f.round}`}
                  right={`${oc} ${f.homeGoals}-${f.awayGoals}`}
                  tone={oc === 'W' ? 'green' : oc === 'L' ? 'red' : 'gold'}
                />
              );
            })
          )}
        </HubCard>

        <HubCard title="Up next" icon="calendar" onGo={() => onRoute('calendar')}>
          {fixture && opponent ? (
            <MiniRow
              left={
                <span className="fm-minirow__player">
                  <Crest name={opponent.name} code={opponent.code} color={opponent.color} size={18} />
                  {opponent.name}
                </span>
              }
              sub={fixture.homeId === state.userClubId ? 'Home' : 'Away'}
              right={relativeDays(daysUntilMatchDay(state))}
            />
          ) : (
            <Empty text="No fixture scheduled." />
          )}
        </HubCard>
      </div>
    </>
  );
}

function ordinal(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return 'th';
  return ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
}
