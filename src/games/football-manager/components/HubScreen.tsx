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
import { Icon, type IconName } from './Icon';

type Tab = 'hub' | 'inbox' | 'squad' | 'tactics' | 'transfers' | 'table' | 'fixtures' | 'cups' | 'club' | 'scout' | 'facilities' | 'finances' | 'european' | 'training';

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'hub', label: 'Hub', icon: 'home' },
  { id: 'inbox', label: 'Inbox', icon: 'inbox' },
  { id: 'squad', label: 'Squad', icon: 'squad' },
  { id: 'tactics', label: 'Tactics', icon: 'tactics' },
  { id: 'transfers', label: 'Transfers', icon: 'transfers' },
  { id: 'scout', label: 'Scout', icon: 'scout' },
  { id: 'table', label: 'Table', icon: 'table' },
  { id: 'fixtures', label: 'Fixtures', icon: 'fixtures' },
  { id: 'cups', label: 'Cups', icon: 'trophy' },
  { id: 'training', label: 'Training', icon: 'training' },
  { id: 'facilities', label: 'Facilities', icon: 'facilities' },
  { id: 'finances', label: 'Finances', icon: 'finances' },
  { id: 'european', label: 'European', icon: 'european' },
  { id: 'club', label: 'Club', icon: 'club' },
];

// Pocket (<900px): only these five sit in the fixed bottom dock. The rest
// are reachable via "More", which opens the full rail as an overlay list —
// same 14 destinations either way, just progressively disclosed on a phone.
const POCKET_PRIMARY: Tab[] = ['hub', 'squad', 'tactics', 'table', 'transfers'];

export default function HubScreen({
  state,
  onChange,
  onAbandon,
}: {
  state: GameState;
  onChange: (next: GameState) => void;
  onAbandon: () => void;
}) {
  const [tab, setTab] = useState<Tab>('hub');
  const [moreOpen, setMoreOpen] = useState(false);

  // Same in-place-swap scroll issue as the top-level view switch: reset to
  // the top of the (new, usually shorter) screen whenever the hub sub-tab
  // changes, so the tab bar doesn't start out scrolled off-screen.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab]);

  const badgeFor = (id: Tab): number => {
    if (id === 'transfers') {
      // Old flat offers plus new negotiation-based incoming bids — both
      // still populate independently (see TransfersScreen).
      return state.incomingOffers.length
        + (state.negotiations ?? []).filter((n) => n.type === 'incoming' && n.awaiting === 'user').length;
    }
    if (id === 'inbox') return state.inbox.filter((i) => !i.read).length;
    return 0;
  };

  const pick = (id: Tab) => {
    setTab(id);
    setMoreOpen(false);
  };

  const railItem = (t: (typeof TABS)[number]) => {
    const count = badgeFor(t.id);
    return (
      <button
        key={t.id}
        className={`fm-rail__item${tab === t.id ? ' active' : ''}`}
        onClick={() => pick(t.id)}
        aria-label={t.label}
        aria-current={tab === t.id ? 'page' : undefined}
        title={t.label}
      >
        <Icon name={t.icon} size={19} className="fm-rail__icon" />
        <span className="fm-rail__label">{t.label}</span>
        {count > 0 && <span className="fm-rail__badge">{count}</span>}
      </button>
    );
  };

  const primaryTabs = TABS.filter((t) => POCKET_PRIMARY.includes(t.id));
  const overflowTabs = TABS.filter((t) => !POCKET_PRIMARY.includes(t.id));

  return (
    <div className="fm-hub-shell">
      {/* Touchline rail (≥900px): every destination, always visible.
          Pocket dock (<900px, via CSS): the five primary destinations plus
          a "More" button revealing the rest as an overlay list. */}
      <nav className="fm-rail" aria-label="Game sections">
        {TABS.map(railItem)}
      </nav>
      <nav className="fm-rail fm-rail--pocket" aria-label="Game sections">
        {primaryTabs.map(railItem)}
        <button
          className={`fm-rail__item${moreOpen ? ' active' : ''}`}
          onClick={() => setMoreOpen((v) => !v)}
          aria-expanded={moreOpen}
          aria-label="More sections"
          title="More"
        >
          <Icon name="more" size={19} className="fm-rail__icon" />
          <span className="fm-rail__label">More</span>
        </button>
      </nav>
      {moreOpen && (
        <div className="fm-rail__more" role="menu" aria-label="More sections">
          {overflowTabs.map((t) => (
            <button
              key={t.id}
              className={`fm-rail__more-item${tab === t.id ? ' active' : ''}`}
              onClick={() => pick(t.id)}
              role="menuitem"
            >
              <Icon name={t.icon} size={16} /> {t.label}
              {badgeFor(t.id) > 0 && <span className="fm-rail__badge fm-rail__badge--inline">{badgeFor(t.id)}</span>}
            </button>
          ))}
        </div>
      )}

      <div className="fm-hub-shell__main">
        {tab === 'hub' && (
          <PortalHub state={state} onChange={onChange} onAbandon={onAbandon} />
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
    </div>
  );
}
