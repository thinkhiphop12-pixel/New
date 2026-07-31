'use client';

import { useEffect, useState } from 'react';
import type { GameState } from '@/engine/types';
import PortalHub from './PortalHub';
import InboxScreen from './InboxScreen';
import SquadScreen from './SquadScreen';
import TacticsScreen from './TacticsScreen';
import TransfersScreen from './TransfersScreen';
import TableScreen from './TableScreen';
import FixturesScreen from './FixturesScreen';
import CupScreen from './CupScreen';
import ClubScreen from './ClubScreen';
import ScoutScreen from './ScoutScreen';
import FacilitiesScreen from './FacilitiesScreen';
import FinancesScreen from './FinancesScreen';
import EuropeanScreen from './EuropeanScreen';
import TrainingScreen from './TrainingScreen';

type Tab = 'hub' | 'inbox' | 'squad' | 'tactics' | 'transfers' | 'table' | 'fixtures' | 'cups' | 'club' | 'scout' | 'facilities' | 'finances' | 'european' | 'training';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'hub', label: 'Hub', icon: '🏠' },
  { id: 'inbox', label: 'Inbox', icon: '📰' },
  { id: 'squad', label: 'Squad', icon: '👥' },
  { id: 'tactics', label: 'Tactics', icon: '📐' },
  { id: 'transfers', label: 'Transfers', icon: '💰' },
  { id: 'scout', label: 'Scout', icon: '🔍' },
  { id: 'table', label: 'Table', icon: '📊' },
  { id: 'fixtures', label: 'Fixtures', icon: '📅' },
  { id: 'cups', label: 'Cups', icon: '🏆' },
  { id: 'training', label: 'Training', icon: '🏋️' },
  { id: 'facilities', label: 'Facilities', icon: '🏗️' },
  { id: 'finances', label: 'Finances', icon: '💵' },
  { id: 'european', label: 'European', icon: '🌍' },
  { id: 'club', label: 'Club', icon: '🏢' },
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

  // Same in-place-swap scroll issue as the top-level view switch: reset to
  // the top of the (new, usually shorter) screen whenever the hub sub-tab
  // changes, so the tab bar doesn't start out scrolled off-screen.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab]);

  return (
    <div className="fm-screen">
      <nav className="fm-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`fm-tab${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
            aria-label={t.label}
            title={t.label}
          >
            <span className="fm-tab__icon" aria-hidden="true">{t.icon}</span>
            <span className="fm-tab__label">{t.label}</span>
            {t.id === 'transfers' && (() => {
              // Old flat offers plus new negotiation-based incoming bids —
              // both still populate independently (see TransfersScreen).
              const count = state.incomingOffers.length
                + (state.negotiations ?? []).filter((n) => n.type === 'incoming' && n.awaiting === 'user').length;
              return count > 0 ? <span className="fm-tab__badge">{count}</span> : null;
            })()}
            {t.id === 'inbox' && state.inbox.some((i) => !i.read) && (
              <span className="fm-tab__badge">{state.inbox.filter((i) => !i.read).length}</span>
            )}
          </button>
        ))}
      </nav>

      {tab === 'hub' && (
        <PortalHub state={state} onChange={onChange} onPlayMatch={onPlayMatch} onAbandon={onAbandon} />
      )}
      {tab === 'inbox' && <InboxScreen state={state} onChange={onChange} />}
      {tab === 'squad' && <SquadScreen state={state} onChange={onChange} />}
      {tab === 'tactics' && <TacticsScreen state={state} onChange={onChange} />}
      {tab === 'transfers' && <TransfersScreen state={state} onChange={onChange} />}
      {tab === 'scout' && <ScoutScreen state={state} onChange={onChange} />}
      {tab === 'table' && <TableScreen state={state} />}
      {tab === 'fixtures' && <FixturesScreen state={state} />}
      {tab === 'cups' && <CupScreen state={state} />}
      {tab === 'training' && <TrainingScreen state={state} onChange={onChange} />}
      {tab === 'facilities' && <FacilitiesScreen state={state} onChange={onChange} />}
      {tab === 'finances' && <FinancesScreen state={state} onChange={onChange} />}
      {tab === 'european' && <EuropeanScreen state={state} />}
      {tab === 'club' && <ClubScreen state={state} onChange={onChange} />}
    </div>
  );
}
