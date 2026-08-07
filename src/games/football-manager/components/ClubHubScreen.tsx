'use client';

import type { GameState } from '@/engine/types';
import { newFacilities, totalCapacity } from '@/engine/facilities';
import { financesView } from '@/engine/finances';
import { getYouthSquad } from '@/engine/youthAcademy';
import { staffWageBill } from '@/engine/seasonProgression';
import { formatMoney } from '@/engine/utils';
import { Icon } from './Icon';
import { Pulse, Todos, JumpGrid, HubCard, MiniRow, Empty, toneFor, type TodoItem } from './SectionHub';
import type { ScreenId } from './hubNav';

/**
 * Club → Overview.
 *
 * Club is the group with the most tabs, and it used to open on the Inbox
 * with a seven-entry strip above it and no map of what any of them held.
 * This screen is that map: board mood, cash, ground, academy and post, each
 * as one number that links to the tab behind it. The strip is still there
 * for anyone who knows where they're going.
 */
export default function ClubHubScreen({
  state,
  onRoute,
}: {
  state: GameState;
  onRoute: (id: ScreenId) => void;
}) {
  const club = state.clubs.find((c) => c.id === state.userClubId)!;
  const fs = state.facilities ?? newFacilities(state);
  const fin = financesView(state);

  const unread = state.inbox.filter((i) => !i.read).length;
  const latest = [...state.inbox].sort((a, b) => b.id - a.id).slice(0, 4);
  const youth = getYouthSquad(state, state.userClubId);
  const bestProspect = [...youth].sort((a, b) => b.potential - a.potential)[0];
  const running = fs.projects.filter((p) => !p.complete);
  const coachCount = fs.coaches.length;
  const capacity = totalCapacity(fs);
  const staffBill = staffWageBill(state);

  const confidence = state.board.confidence;

  const todos: TodoItem[] = [];
  if (confidence < 30) todos.push({ icon: 'target', label: 'The board is losing patience', tone: 'red', cta: 'View', onGo: () => onRoute('board') });
  if (state.budget < 0) todos.push({ icon: 'finances', label: 'The club is in the red', tone: 'red', cta: 'Fix', onGo: () => onRoute('finances') });
  if (fin.needsRenewal.length > 0) todos.push({ icon: 'money-in', label: `${fin.needsRenewal.length} sponsor deal${fin.needsRenewal.length > 1 ? 's' : ''} to re-sell`, tone: 'gold', cta: 'Sell', onGo: () => onRoute('finances') });
  if (unread > 0) todos.push({ icon: 'inbox', label: `${unread} unread message${unread > 1 ? 's' : ''}`, tone: 'gold', cta: 'Read', onGo: () => onRoute('inbox') });
  if (coachCount === 0) todos.push({ icon: 'staff', label: 'No coaches on the backroom staff', tone: 'gold', cta: 'Hire', onGo: () => onRoute('staff') });

  return (
    <>
      <Pulse
        items={[
          { icon: 'target', label: 'Board', value: `${confidence}`, tone: toneFor(confidence, 30, 60), meter: confidence / 100 },
          { icon: 'person', label: 'Fans', value: `${state.fanConfidence}`, tone: toneFor(state.fanConfidence, 35, 60), meter: state.fanConfidence / 100 },
          { icon: 'finances', label: 'Balance', value: formatMoney(state.budget), tone: state.budget < 0 ? 'red' : 'green' },
          { icon: 'inbox', label: 'Unread', value: String(unread), tone: unread > 0 ? 'gold' : 'plain' },
        ]}
      />

      <Todos items={todos} />

      <JumpGrid
        items={[
          { icon: 'inbox', label: 'Inbox', value: unread ? `${unread} unread` : 'All read', badge: unread, onGo: () => onRoute('inbox') },
          { icon: 'flag', label: 'Identity', value: club.name, onGo: () => onRoute('club') },
          { icon: 'facilities', label: 'Facilities', value: running.length ? `${running.length} building` : `${capacity.toLocaleString()} seats`, onGo: () => onRoute('facilities') },
          { icon: 'staff', label: 'Staff', value: coachCount ? `${coachCount} coaches · ${formatMoney(staffBill)}/wk` : 'None hired', onGo: () => onRoute('staff') },
          { icon: 'sprout', label: 'Academy', value: youth.length ? `${youth.length} prospects` : 'Empty', onGo: () => onRoute('academy') },
          { icon: 'finances', label: 'Finances', value: formatMoney(state.budget), onGo: () => onRoute('finances') },
          { icon: 'target', label: 'Board', value: `${confidence}% confidence`, onGo: () => onRoute('board') },
        ]}
      />

      <div className="fm-hubcards">
        <HubCard title="Latest post" icon="inbox" onGo={() => onRoute('inbox')}>
          {latest.length === 0 ? (
            <Empty text="Nothing in the inbox yet." />
          ) : (
            latest.map((m) => (
              <MiniRow
                key={m.id}
                left={m.title}
                sub={m.category}
                right={m.read ? '' : <span className="fm-minirow__dot" aria-label="unread" />}
              />
            ))
          )}
        </HubCard>

        <HubCard title="The ground" icon="stadium" onGo={() => onRoute('facilities')}>
          <MiniRow left="Capacity" right={capacity.toLocaleString()} />
          <MiniRow left="Training" right={`${fs.trainingLevel}/5`} tone={toneFor(fs.trainingLevel, 2, 4)} />
          <MiniRow left="Medical" right={`${fs.medicalLevel}/5`} tone={toneFor(fs.medicalLevel, 2, 4)} />
          {running.length > 0 && (
            <MiniRow
              left={running[0].label}
              sub={`${running[0].weeksElapsed}/${running[0].durationWeeks} weeks`}
              right={<Icon name="training" size={13} />}
              tone="gold"
            />
          )}
        </HubCard>

        <HubCard title="Academy" icon="sprout" onGo={() => onRoute('academy')}>
          {bestProspect ? (
            <>
              <MiniRow left={bestProspect.name} sub={`${bestProspect.role} · ${bestProspect.age}y`} right={`PA ${bestProspect.potential}`} tone="green" />
              <MiniRow left="Prospects" right={String(youth.length)} />
              <MiniRow left="Reputation" right={`${fs.academyReputation}/100`} tone={toneFor(fs.academyReputation, 25, 60)} />
            </>
          ) : (
            <Empty text="The next intake arrives at season end." />
          )}
        </HubCard>
      </div>
    </>
  );
}
