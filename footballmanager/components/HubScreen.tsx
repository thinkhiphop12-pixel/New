'use client';

import { useState } from 'react';
import type { GameState } from '@/engine/types';
import { SEASON_ROUNDS } from '@/engine/gameRules';
import { computeTable, nextUserFixture, userDivision } from '@/engine/seasonProgression';
import { isClubAlive, knockoutRoundDue } from '@/engine/cups';
import { isLineupValid } from '@/engine/teamManagement';
import { formatMoney } from '@/engine/utils';
import SquadScreen from './SquadScreen';
import TransfersScreen from './TransfersScreen';
import TableScreen from './TableScreen';
import FixturesScreen from './FixturesScreen';
import CupScreen from './CupScreen';
import ClubScreen from './ClubScreen';

type Tab = 'squad' | 'transfers' | 'table' | 'fixtures' | 'cups' | 'club';

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
  const [tab, setTab] = useState<Tab>('squad');
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
      <div className="fm-hub-head">
        <span className="fm-hub-head__badge" style={{ background: club.color }}>
          {club.code}
        </span>
        <div>
          <div className="fm-hub-head__club">{club.name}</div>
          <div className="fm-hub-head__sub">
            Division {div} · {state.seasonYear}/{(state.seasonYear + 1) % 100} · Week {Math.min(state.week, SEASON_ROUNDS)} of{' '}
            {SEASON_ROUNDS} · {state.manager.name}
          </div>
        </div>
        <div className="fm-hub-stats">
          <div className="fm-stat">
            <span className="fm-stat__label">Pos</span>
            <span className="fm-stat__value fm-stat__value--gold">{position}</span>
          </div>
          <div className="fm-stat">
            <span className="fm-stat__label">Budget</span>
            <span className="fm-stat__value">{formatMoney(state.budget)}</span>
          </div>
          <div className="fm-stat">
            <span className="fm-stat__label">Morale</span>
            <span className="fm-stat__value">{state.morale}</span>
          </div>
          <div className="fm-stat">
            <span className="fm-stat__label">Board</span>
            <span className="fm-stat__value">{state.board.confidence}</span>
          </div>
          <div className="fm-stat">
            <span className="fm-stat__label">Fans</span>
            <span className="fm-stat__value">{state.fanConfidence}</span>
          </div>
        </div>
      </div>

      {fixture && (
        <button className="fm-btn fm-btn--primary fm-btn--large" onClick={onPlayMatch} disabled={!lineupOk}>
          {lineupOk
            ? `Play Week ${state.week}: ${fixture.homeId === state.userClubId ? 'vs' : 'at'} ${opponent?.name ?? ''}${cupWeek ? ' (+ cup tie midweek)' : ''}`
            : 'Fix your lineup to play (11 fit players)'}
        </button>
      )}

      {state.news.length > 0 && (
        <div className="fm-panel">
          <p className="fm-label" style={{ marginTop: 0 }}>
            Club news
          </p>
          <ul className="fm-news">
            {state.news.slice(0, 5).map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
      )}

      <nav className="fm-tabs">
        <button className={`fm-tab${tab === 'squad' ? ' active' : ''}`} onClick={() => setTab('squad')}>
          Squad
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

      {tab === 'squad' && <SquadScreen state={state} onChange={onChange} />}
      {tab === 'transfers' && <TransfersScreen state={state} onChange={onChange} />}
      {tab === 'table' && <TableScreen state={state} />}
      {tab === 'fixtures' && <FixturesScreen state={state} />}
      {tab === 'cups' && <CupScreen state={state} />}
      {tab === 'club' && <ClubScreen state={state} onChange={onChange} />}

      <div className="fm-actions" style={{ marginTop: 20 }}>
        <button
          className="fm-btn fm-btn--danger fm-btn--small"
          onClick={() => {
            if (window.confirm('Abandon this career? Your save will be deleted.')) onAbandon();
          }}
        >
          Abandon career
        </button>
      </div>
    </div>
  );
}
