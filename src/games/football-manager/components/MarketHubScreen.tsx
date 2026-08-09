'use client';

import type { GameState } from '@/engine/types';
import { clubWageBill, wageCeiling } from '@/engine/teamManagement';
import { getPlayerReports, getScouts } from '@/engine/scouting';
import { formatMoney } from '@/engine/utils';
import { PlayerFace } from './PlayerFace';
import { Pulse, Todos, JumpGrid, HubCard, MiniRow, Empty, toneFor, type TodoItem } from './SectionHub';
import type { ScreenId } from './hubNav';

/**
 * Market → Overview.
 *
 * This group opened directly onto TransfersScreen — 850 lines, the largest
 * screen in the game, and the first thing a new manager saw when they
 * pressed "Market". What a player actually needs first is three numbers
 * (what can I spend, who wants my players, who have I been watching), which
 * is all this is.
 */
export default function MarketHubScreen({
  state,
  onRoute,
}: {
  state: GameState;
  onRoute: (id: ScreenId) => void;
}) {
  const negotiations = state.negotiations ?? [];
  const incoming = state.incomingOffers.length + negotiations.filter((n) => n.type === 'incoming' && n.awaiting === 'user').length;
  const outstanding = negotiations.filter((n) => n.type === 'outgoing' && n.awaiting === 'user').length;

  const shortlist = (state.scouting?.shortlist ?? []).map((id) => state.players[id]).filter(Boolean);
  const scouts = getScouts(state);
  const leads = getPlayerReports(state);
  const vacancies = state.vacancies ?? [];

  const bill = clubWageBill(state, state.userClubId);
  const ceiling = wageCeiling(state);
  const headroom = ceiling - bill;
  const embargo = state.finances?.transferEmbargo ?? false;

  const listed = Object.values(state.players).filter((p) => p.clubId === state.userClubId && p.transferListed);

  const todos: TodoItem[] = [];
  if (embargo) todos.push({ icon: 'block', label: 'Under a transfer embargo', tone: 'red', cta: 'Why', onGo: () => onRoute('jobs') });
  if (incoming > 0) todos.push({ icon: 'money-in', label: `${incoming} offer${incoming > 1 ? 's' : ''} waiting on your answer`, tone: 'gold', cta: 'Reply', onGo: () => onRoute('transfers') });
  if (outstanding > 0) todos.push({ icon: 'transfers', label: `${outstanding} of your bids need a decision`, tone: 'gold', cta: 'Open', onGo: () => onRoute('transfers') });
  if (scouts.length === 0) todos.push({ icon: 'binoculars', label: 'No scouts on the payroll', tone: 'gold', cta: 'Hire', onGo: () => onRoute('scouting') });
  if (headroom <= 0) todos.push({ icon: 'warning', label: 'No room under the wage ceiling', tone: 'red', cta: 'View', onGo: () => onRoute('transfers') });

  return (
    <>
      <Pulse
        items={[
          { icon: 'finances', label: 'Transfer budget', value: formatMoney(state.budget), tone: state.budget > 0 ? 'green' : 'red' },
          { icon: 'money-out', label: 'Wage room', value: formatMoney(Math.max(0, headroom)), tone: toneFor(headroom, 1, bill * 0.05) },
          { icon: 'money-in', label: 'Offers in', value: String(incoming), tone: incoming > 0 ? 'gold' : 'plain' },
          { icon: 'star', label: 'Shortlisted', value: String(shortlist.length) },
        ]}
      />

      <Todos items={todos} />

      <JumpGrid
        items={[
          { icon: 'transfers', label: 'Transfers', value: `${formatMoney(state.budget)} to spend`, badge: incoming, onGo: () => onRoute('transfers') },
          { icon: 'binoculars', label: 'Scouting', value: scouts.length ? `${scouts.length} scout${scouts.length > 1 ? 's' : ''} · ${leads.length} leads` : 'No scouts yet', onGo: () => onRoute('scouting') },
          { icon: 'document', label: 'Jobs', value: vacancies.length ? `${vacancies.length} vacancies` : 'None open', onGo: () => onRoute('jobs') },
        ]}
      />

      <div className="fm-hubcards">
        <HubCard title="Shortlist" icon="star" onGo={() => onRoute('transfers')}>
          {shortlist.length === 0 ? (
            <Empty text="Nobody watched yet — scouts file leads straight to here." />
          ) : (
            shortlist.slice(0, 5).map((p) => (
              <MiniRow
                key={p.id}
                left={
                  <span className="fm-minirow__player">
                    <PlayerFace playerId={p.id} size={22} />
                    {p.name}
                  </span>
                }
                sub={`${p.role} · ${p.age}y`}
                right={formatMoney(p.value)}
              />
            ))
          )}
        </HubCard>

        <HubCard title="Latest leads" icon="binoculars" onGo={() => onRoute('scouting')}>
          {leads.length === 0 ? (
            <Empty text="Hire a scout and give him a region." />
          ) : (
            leads.slice(0, 5).map((r) => {
              const p = state.players[r.playerId];
              return (
                <MiniRow
                  key={r.id}
                  left={p?.name ?? 'Unknown player'}
                  sub={r.region}
                  right={p ? p.rating : '—'}
                  tone="green"
                />
              );
            })
          )}
        </HubCard>

        <HubCard title="On the way out" icon="money-in" onGo={() => onRoute('transfers')}>
          {listed.length === 0 ? (
            <Empty text="Nobody listed for sale." />
          ) : (
            listed.slice(0, 5).map((p) => (
              <MiniRow key={p.id} left={p.name} sub={`${p.role} · ${p.age}y`} right={formatMoney(p.listingPrice ?? p.value)} tone="gold" />
            ))
          )}
        </HubCard>
      </div>
    </>
  );
}
