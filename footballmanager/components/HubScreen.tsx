'use client';

import { useState } from 'react';
import type { GameState } from '@/engine/types';
import PortalHub from './PortalHub';
import SquadScreen from './SquadScreen';
import TacticsScreen from './TacticsScreen';
import TransfersScreen from './TransfersScreen';
import TableScreen from './TableScreen';
import FixturesScreen from './FixturesScreen';
import CupScreen from './CupScreen';
import ClubScreen from './ClubScreen';

type Tab = 'hub' | 'squad' | 'tactics' | 'transfers' | 'table' | 'fixtures' | 'cups' | 'club';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'hub', label: 'Hub', icon: '🏠' },
  { id: 'squad', label: 'Squad', icon: '👥' },
  { id: 'tactics', label: 'Tactics', icon: '📐' },
  { id: 'transfers', label: 'Transfers', icon: '💰' },
  { id: 'table', label: 'Table', icon: '📊' },
  { id: 'fixtures', label: 'Fixtures', icon: '📅' },
  { id: 'cups', label: 'Cups', icon: '🏆' },
  { id: 'club', label: 'Club', icon: '🏟️' },
];

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

  return (
    <div className="fm-screen">
      <nav className="fm-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`fm-tab${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span style={{ marginRight: 4 }}>{t.icon}</span>
            {t.label}
            {t.id === 'transfers' && state.incomingOffers.length > 0 && (
              <span className="fm-tab__badge">{state.incomingOffers.length}</span>
            )}
          </button>
        ))}
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
