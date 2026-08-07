'use client';

import type { GameState } from '@/engine/types';
import { availableSquad, getSquad, isLineupValid, squadAvgRating, clubWageBill, wageCeiling } from '@/engine/teamManagement';
import { formatMoney } from '@/engine/utils';
import { PlayerFace } from './PlayerFace';
import { Pulse, Todos, JumpGrid, HubCard, MiniRow, Empty, toneFor, type TodoItem } from './SectionHub';
import type { ScreenId } from './hubNav';

/**
 * Team → Overview: the state of the squad in numbers, the two or three
 * things wrong with it, and a way into the screen that fixes each.
 *
 * The group used to open on SquadScreen — a 280-line roster table with no
 * indication of what, if anything, needed doing. Nothing here duplicates
 * that table; this answers "is my team ready" and hands off.
 */
export default function TeamHubScreen({
  state,
  onRoute,
}: {
  state: GameState;
  onRoute: (id: ScreenId) => void;
}) {
  const squad = getSquad(state, state.userClubId);
  const available = availableSquad(state, state.userClubId);
  const avg = squadAvgRating(state, state.userClubId);
  const lineupOk = isLineupValid(state, state.userClubId, state.lineup);

  const injured = squad.filter((p) => p.injuryWeeks > 0);
  const tired = available.filter((p) => p.fitness < 70);
  const unhappy = squad.filter((p) => p.unhappy || p.wantsMove);
  const expiring = squad.filter((p) => p.contractYears <= 0);

  const avgFitness = available.length
    ? Math.round(available.reduce((n, p) => n + p.fitness, 0) / available.length)
    : 0;
  const avgSharpness = available.length
    ? Math.round(available.reduce((n, p) => n + p.sharpness, 0) / available.length)
    : 0;

  const bill = clubWageBill(state, state.userClubId);
  const ceiling = wageCeiling(state);

  // Ranked by how much it hurts to ignore. The lineup gate is first because
  // it blocks the only button that advances the game.
  const todos: TodoItem[] = [];
  if (!lineupOk) todos.push({ icon: 'tactics', label: 'Your lineup is incomplete', tone: 'red', cta: 'Pick', onGo: () => onRoute('tactics') });
  if (injured.length > 0) todos.push({ icon: 'injury', label: `${injured.length} player${injured.length > 1 ? 's' : ''} injured`, tone: 'gold', cta: 'View', onGo: () => onRoute('squad') });
  if (avgFitness < 70) todos.push({ icon: 'fitness', label: 'Squad is running on empty', tone: 'red', cta: 'Rest', onGo: () => onRoute('schedule') });
  else if (avgSharpness < 55) todos.push({ icon: 'training', label: 'Match sharpness is dropping', tone: 'gold', cta: 'Train', onGo: () => onRoute('training') });
  if (unhappy.length > 0) todos.push({ icon: 'person', label: `${unhappy.length} unhappy in the dressing room`, tone: 'gold', cta: 'View', onGo: () => onRoute('squad') });
  if (expiring.length > 0) todos.push({ icon: 'document', label: `${expiring.length} contract${expiring.length > 1 ? 's' : ''} running out`, tone: 'red', cta: 'View', onGo: () => onRoute('squad') });

  // Form is the honest "who is playing well" signal the squad table buries.
  const inForm = [...available].sort((a, b) => b.form - a.form).slice(0, 4);

  return (
    <>
      <Pulse
        items={[
          { icon: 'stat', label: 'Squad rating', value: String(avg), tone: toneFor(avg, 60, 72), meter: avg / 100 },
          { icon: 'fitness', label: 'Fitness', value: `${avgFitness}%`, tone: toneFor(avgFitness, 70, 85), meter: avgFitness / 100 },
          { icon: 'flame', label: 'Sharpness', value: `${avgSharpness}%`, tone: toneFor(avgSharpness, 55, 75), meter: avgSharpness / 100 },
          { icon: 'goal', label: 'Morale', value: `${state.morale}`, tone: toneFor(state.morale, 40, 60), meter: state.morale / 100 },
        ]}
      />

      <Todos items={todos} />

      <JumpGrid
        items={[
          { icon: 'squad', label: 'Squad', value: `${squad.length} players · avg ${avg}`, badge: injured.length, onGo: () => onRoute('squad') },
          { icon: 'tactics', label: 'Tactics', value: lineupOk ? 'XI selected' : 'XI incomplete', badge: lineupOk ? 0 : 1, onGo: () => onRoute('tactics') },
          { icon: 'training', label: 'Training', value: `Focus: ${state.training}`, onGo: () => onRoute('training') },
          { icon: 'fitness', label: 'Schedule', value: `${(state.weeklySchedule ?? []).filter((d) => d === 'recovery').length || 2} rest days`, onGo: () => onRoute('schedule') },
        ]}
      />

      <div className="fm-hubcards">
        <HubCard title="In form" icon="trend" onGo={() => onRoute('squad')}>
          {inForm.length === 0 ? (
            <Empty text="No available players." />
          ) : (
            inForm.map((p) => (
              <MiniRow
                key={p.id}
                left={
                  <span className="fm-minirow__player">
                    <PlayerFace playerId={p.id} size={22} />
                    {p.name}
                  </span>
                }
                sub={`${p.role} · ${p.age}y`}
                right={p.rating}
                tone={p.form >= 1.05 ? 'green' : 'plain'}
              />
            ))
          )}
        </HubCard>

        <HubCard title="Wage bill" icon="finances" onGo={() => onRoute('squad')}>
          <MiniRow left="Weekly wages" right={formatMoney(bill)} tone={bill > ceiling ? 'red' : 'plain'} />
          <MiniRow left="Board ceiling" right={formatMoney(ceiling)} tone="plain" />
          <MiniRow
            left="Headroom"
            right={formatMoney(Math.max(0, ceiling - bill))}
            tone={ceiling - bill <= 0 ? 'red' : 'green'}
          />
        </HubCard>
      </div>
    </>
  );
}
