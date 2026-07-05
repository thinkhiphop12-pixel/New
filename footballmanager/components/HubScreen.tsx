'use client';

import { useState } from 'react';
import type { GameState } from '@/engine/types';
import { DIVISION_NAMES, SEASON_ROUNDS } from '@/engine/gameRules';
import { computeTable, nextUserFixture, userDivision } from '@/engine/seasonProgression';
import { isClubAlive, knockoutRoundDue } from '@/engine/cups';
import { isLineupValid } from '@/engine/teamManagement';
import { formatMoney } from '@/engine/utils';
import PortalHub from './PortalHub';
import SquadScreen from './SquadScreen';
import TacticsScreen from './TacticsScreen';
import TransfersScreen from './TransfersScreen';
import TableScreen from './TableScreen';
import FixturesScreen from './FixturesScreen';
import CupScreen from './CupScreen';
import ClubScreen from './ClubScreen';

type Tab = 'hub' | 'squad' | 'tactics' | 'transfers' | 'table' | 'fixtures' | 'cups' | 'club';

export default function HubScreen({
  state,
  onChange,
  onPlayMatch,
  onAbandon,
}: {
  state: GameState;
  onChange: (next: GameState) => void;
  onPlayMatch: () => void;
  onAbandon: () => void;
}) {
  const [tab, setTab] = useState<Tab>('hub');
  const club = state.clubs.find((c) => c.id === state.userClubId)!;
  const div = userDivision(state);
  const table = computeTable(state, div);
  const position = table.findIndex((r) => r.clubId === state.userClubId) + 1;
  const fixture = nextUserFixture(state);
  const opponentId = fixture ? (fixture.homeId === state.userClubId ? fixture.awayId : fixture.homeId) : null;
  const opponent = opponentId ? state.clubs.find((c) => c.id === opponentId) : null;
  const lineupOk = isLineupValid(state, state.userClubId, state.lineup);
  const cupWeek =
    (knockoutRoundDue(state.cup, state.week) && isClubAlive(state.cup, state.userClubId)) ||
    (knockoutRoundDue(state.continental, state.week) && isClubAlive(state.continental, state.userClubId));

  return (
    <div className="fm-screen">
      <nav className="fm-tabs">
        <button className={`fm-tab${tab === 'hub' ? ' active' : ''}`} onClick={() => setTab('hub')}>
          Hub
        </button>
        <button className={`fm-tab${tab === 'squad' ? ' active' : ''}`} onClick={() => setTab('squad')}>
          Squad
        </button>
        <button className={`fm-tab${tab === 'tactics' ? ' active' : ''}`} onClick={() => setTab('tactics')}>
          Tactics
        </button>
        <button className={`fm-tab${tab === 'transfers' ? ' active' : ''}`} onClick={() => setTab('transfers')}>
          Transfers
          {state.incomingOffers.length > 0 && <span className="fm-tab__badge">{state.incomingOffers.length}</span>}
        </button>
        <button className={`fm-tab${tab === 'table' ? ' active' : ''}`} onClick={() => setTab('table')}>
          Table
        </button>
        <button className={`fm-tab${tab === 'fixtures' ? ' active' : ''}`} onClick={() => setTab('fixtures')}>
          Fixtures
        </button>
        <button className={`fm-tab${tab === 'cups' ? ' active' : ''}`} onClick={() => setTab('cups')}>
          Cups
        </button>
        <button className={`fm-tab${tab === 'club' ? ' active' : ''}`} onClick={() => setTab('club')}>
          Club
        </button>
      </nav>

      {tab === 'hub' && (
        <PortalHub state={state} onChange={onChange} onPlayMatch={onPlayMatch} onAbandon={onAbandon} />
      )}
      {tab === 'squad' && <SquadScreen state={state} onChange={onChange} />}
      {tab === 'tactics' && <TacticsScreen state={state} onChange={onChange} />}
      {tab === 'transfers' && <TransfersScreen state={state} onChange={onChange} />}
      {tab === 'table' && <TableScreen state={state} />}
      {tab === 'fixtures' && <FixturesScreen state={state} />}
      {tab === 'cups' && <CupScreen state={state} />}
      {tab === 'club' && <ClubScreen state={state} onChange={onChange} />}
    </div>
  );
}
