'use client';

import { useCallback, useEffect, useState } from 'react';
import type { GameState } from '@/engine/types';
import { useEscapeKey } from '@/lib/useEscapeKey';
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

export type Tab = 'hub' | 'inbox' | 'squad' | 'tactics' | 'transfers' | 'table' | 'fixtures' | 'cups' | 'club' | 'scout' | 'facilities' | 'finances' | 'european' | 'training';

/** Rail sections. Fourteen flat destinations gave no sense of where anything
 *  lived; these group them by what the player is trying to do. Presentation
 *  only — every `Tab` and its screen is unchanged. */
type Group = 'Matchday' | 'Team' | 'Market' | 'Club';
const GROUP_ORDER: Group[] = ['Matchday', 'Team', 'Market', 'Club'];

const TABS: { id: Tab; label: string; icon: IconName; group: Group }[] = [
  { id: 'hub', label: 'Hub', icon: 'home', group: 'Matchday' },
  { id: 'fixtures', label: 'Fixtures', icon: 'fixtures', group: 'Matchday' },
  { id: 'table', label: 'Table', icon: 'table', group: 'Matchday' },
  { id: 'cups', label: 'Cups', icon: 'trophy', group: 'Matchday' },
  { id: 'european', label: 'Europe', icon: 'european', group: 'Matchday' },
  { id: 'squad', label: 'Squad', icon: 'squad', group: 'Team' },
  { id: 'tactics', label: 'Tactics', icon: 'tactics', group: 'Team' },
  { id: 'training', label: 'Training', icon: 'training', group: 'Team' },
  { id: 'transfers', label: 'Transfers', icon: 'transfers', group: 'Market' },
  { id: 'scout', label: 'Scout', icon: 'scout', group: 'Market' },
  { id: 'inbox', label: 'Inbox', icon: 'inbox', group: 'Club' },
  { id: 'club', label: 'Club', icon: 'club', group: 'Club' },
  { id: 'facilities', label: 'Facilities', icon: 'facilities', group: 'Club' },
  { id: 'finances', label: 'Finances', icon: 'finances', group: 'Club' },
];

// Pocket (<900px): only these five sit in the fixed bottom dock. The rest
// are reachable via "More", which opens the full rail as an overlay list —
// same 14 destinations either way, just progressively disclosed on a phone.
const POCKET_PRIMARY: Tab[] = ['hub', 'squad', 'tactics', 'table', 'transfers'];

export default function HubScreen({
  state,
  onChange,
  onAbandon,
  tab,
  onTabChange,
}: {
  state: GameState;
  onChange: (next: GameState) => void;
  onAbandon: () => void;
  tab: Tab;
  onTabChange: (next: Tab) => void;
}) {
  const [moreOpen, setMoreOpen] = useState(false);

  // Same in-place-swap scroll issue as the top-level view switch: reset to
  // the top of the (new, usually shorter) screen whenever the hub sub-tab
  // changes, so the tab bar doesn't start out scrolled off-screen.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab]);

  const closeMore = useCallback(() => setMoreOpen(false), []);
  useEscapeKey(moreOpen, closeMore);

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
    onTabChange(id);
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
  // Inbox is the main casualty of the pocket split: it carries an unread
  // badge but lives behind "More", so the count used to be invisible until
  // the menu was opened. Surface it as a dot on the More button instead.
  const hiddenBadgeCount = overflowTabs.reduce((sum, t) => sum + badgeFor(t.id), 0);
  const activeTab = TABS.find((t) => t.id === tab);

  return (
    <div className="fm-hub-shell">
      {/* Touchline rail (≥900px): every destination, always visible, grouped
          by section. Pocket dock (<900px, via CSS): the five primary
          destinations plus a "More" button revealing the rest as an overlay. */}
      <nav className="fm-rail" aria-label="Game sections">
        {GROUP_ORDER.map((group) => (
          <div key={group} className="fm-rail__group">
            <span className="fm-rail__group-label" aria-hidden="true">{group}</span>
            {TABS.filter((t) => t.group === group).map(railItem)}
          </div>
        ))}
      </nav>
      <nav className="fm-rail fm-rail--pocket" aria-label="Game sections">
        {primaryTabs.map(railItem)}
        <button
          className={`fm-rail__item${moreOpen ? ' active' : ''}`}
          onClick={() => setMoreOpen((v) => !v)}
          aria-expanded={moreOpen}
          aria-label={hiddenBadgeCount > 0 ? `More sections, ${hiddenBadgeCount} unread` : 'More sections'}
          title="More"
        >
          <Icon name="more" size={19} className="fm-rail__icon" />
          <span className="fm-rail__label">More</span>
          {hiddenBadgeCount > 0 && <span className="fm-rail__badge">{hiddenBadgeCount}</span>}
        </button>
      </nav>
      {moreOpen && (
        <>
          {/* Without this the overlay could only be dismissed by re-tapping
              "More" — tapping the page behind it did nothing. */}
          <div className="fm-rail__more-backdrop" onClick={closeMore} aria-hidden="true" />
          <div className="fm-rail__more" role="menu" aria-label="More sections">
            {GROUP_ORDER.map((group) => {
              const items = overflowTabs.filter((t) => t.group === group);
              if (items.length === 0) return null;
              return (
                <div key={group} className="fm-rail__more-group">
                  <span className="fm-rail__more-label">{group}</span>
                  {items.map((t) => (
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
              );
            })}
          </div>
        </>
      )}

      <div className="fm-hub-shell__main">
        {/* On a phone the rail is a row of 19px icons, so without this there
            was nothing on screen naming which of the 14 sections is open.
            The Hub screen has its own club header, so it doesn't need one. */}
        {tab !== 'hub' && activeTab && <h2 className="fm-screen-title">{activeTab.label}</h2>}
        {tab === 'hub' && (
          <PortalHub state={state} onChange={onChange} onAbandon={onAbandon} onNavigate={pick} />
        )}
        {tab === 'inbox' && <InboxScreen state={state} onChange={onChange} />}
        {tab === 'squad' && <SquadScreen state={state} onChange={onChange} onNavigate={pick} />}
        {tab === 'tactics' && <TacticsScreen state={state} onChange={onChange} />}
        {tab === 'transfers' && <TransfersScreen state={state} onChange={onChange} onNavigate={pick} />}
        {tab === 'scout' && <ScoutScreen state={state} onChange={onChange} />}
        {tab === 'table' && <TableScreen state={state} />}
        {tab === 'fixtures' && <FixturesScreen state={state} />}
        {tab === 'cups' && <CupScreen state={state} />}
        {tab === 'training' && <TrainingScreen state={state} onChange={onChange} />}
        {tab === 'facilities' && <FacilitiesScreen state={state} onChange={onChange} onNavigate={pick} />}
        {tab === 'finances' && <FinancesScreen state={state} onChange={onChange} />}
        {tab === 'european' && <EuropeanScreen state={state} />}
        {tab === 'club' && <ClubScreen state={state} onChange={onChange} onNavigate={pick} />}
      </div>
    </div>
  );
}
