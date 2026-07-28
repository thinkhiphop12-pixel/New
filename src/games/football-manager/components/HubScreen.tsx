'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
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
import { useScrollReset } from './useScrollReset';

type Tab = 'hub' | 'inbox' | 'squad' | 'tactics' | 'transfers' | 'table' | 'fixtures' | 'cups' | 'club';

type NavLeaf = { id: Tab; label: string; icon: string };

type NavItem =
  | { kind: 'tab'; id: Tab; label: string; icon: string }
  | { kind: 'group'; id: string; label: string; icon: string; items: NavLeaf[] };

/* Nine destinations don't fit as nine tap targets on a phone (and can't fit a
   56px vertical rail at all), so the two families that are really "look
   something up" screens collapse into popover menus. Seven items in every
   orientation — one nav tree, bigger targets. */
const NAV: NavItem[] = [
  { kind: 'tab', id: 'hub', label: 'Hub', icon: '🏠' },
  { kind: 'tab', id: 'inbox', label: 'Inbox', icon: '📰' },
  { kind: 'tab', id: 'squad', label: 'Squad', icon: '👥' },
  { kind: 'tab', id: 'tactics', label: 'Tactics', icon: '📐' },
  { kind: 'tab', id: 'transfers', label: 'Transfers', icon: '💰' },
  {
    kind: 'group',
    id: 'competition',
    label: 'Competition',
    icon: '📊',
    items: [
      { id: 'table', label: 'Table', icon: '📊' },
      { id: 'fixtures', label: 'Fixtures', icon: '📅' },
      { id: 'cups', label: 'Cups', icon: '🏆' },
    ],
  },
  {
    kind: 'group',
    id: 'clubgrp',
    label: 'Club',
    icon: '🏟️',
    items: [{ id: 'club', label: 'Club', icon: '🏟️' }],
  },
];

function NavGroup({
  item,
  active,
  open,
  onOpenChange,
  onPick,
}: {
  item: Extract<NavItem, { kind: 'group' }>;
  active: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (id: Tab) => void;
}) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  // Set when the menu is opened by keyboard, so focus lands on the first item.
  const focusFirst = useRef(false);
  const menuId = `fm-navmenu-${item.id}`;

  useEffect(() => {
    if (!open) return;
    if (focusFirst.current) {
      focusFirst.current = false;
      menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    }
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) onOpenChange(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open, onOpenChange]);

  const close = (refocus: boolean) => {
    onOpenChange(false);
    if (refocus) triggerRef.current?.focus();
  };

  const moveFocus = (from: HTMLElement, delta: number | 'first' | 'last') => {
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [],
    );
    if (items.length === 0) return;
    let next: number;
    if (delta === 'first') next = 0;
    else if (delta === 'last') next = items.length - 1;
    else {
      const i = items.indexOf(from as HTMLButtonElement);
      next = (i + delta + items.length) % items.length;
    }
    items[next]?.focus();
  };

  return (
    <div className="fm-navgroup" ref={wrapRef}>
      <button
        ref={triggerRef}
        type="button"
        className={`fm-tab fm-tab--group${active ? ' active' : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={item.label}
        title={item.label}
        onClick={() => onOpenChange(!open)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            focusFirst.current = true;
            onOpenChange(true);
          } else if (e.key === 'Escape' && open) {
            e.preventDefault();
            close(true);
          }
        }}
      >
        <span className="fm-tab__icon" aria-hidden="true">{item.icon}</span>
        <span className="fm-tab__label">{item.label}</span>
        <span className="fm-tab__caret" aria-hidden="true">▾</span>
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={item.label}
          className="fm-navmenu"
          ref={menuRef}
          onKeyDown={(e) => {
            const target = e.target as HTMLElement;
            if (e.key === 'Escape') {
              e.preventDefault();
              close(true);
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              moveFocus(target, 1);
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              moveFocus(target, -1);
            } else if (e.key === 'Home') {
              e.preventDefault();
              moveFocus(target, 'first');
            } else if (e.key === 'End') {
              e.preventDefault();
              moveFocus(target, 'last');
            } else if (e.key === 'Tab') {
              close(false);
            }
          }}
        >
          {item.items.map((leaf) => (
            <button
              key={leaf.id}
              type="button"
              role="menuitem"
              className="fm-navmenu__item"
              aria-label={leaf.label}
              title={leaf.label}
              onClick={() => {
                onPick(leaf.id);
                close(true);
              }}
            >
              <span className="fm-navmenu__icon" aria-hidden="true">{leaf.icon}</span>
              <span>{leaf.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HubScreen({
  state,
  onChange,
  onPlayMatch,
  onAbandon,
  onOpenSettings,
  paneRef,
}: {
  state: GameState;
  onChange: (next: GameState) => void;
  onPlayMatch: () => void;
  onAbandon: () => void;
  onOpenSettings: () => void;
  paneRef: RefObject<HTMLElement | null>;
}) {
  const [tab, setTab] = useState<Tab>('hub');
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  useScrollReset(paneRef, tab);

  // A menu left hanging over a screen the user has already navigated away
  // from is just litter — close it on every tab change.
  useEffect(() => {
    setOpenGroup(null);
  }, [tab]);

  const pick = useCallback((id: Tab) => setTab(id), []);

  return (
    <div className="fm-screen fm-screen--hub">
      <nav className="fm-tabs">
        <span className="fm-rail__brand" aria-hidden="true">B</span>

        {NAV.map((item) => {
          if (item.kind === 'group') {
            return (
              <NavGroup
                key={item.id}
                item={item}
                active={item.items.some((l) => l.id === tab)}
                open={openGroup === item.id}
                onOpenChange={(o) => setOpenGroup(o ? item.id : null)}
                onPick={pick}
              />
            );
          }
          return (
            <button
              key={item.id}
              type="button"
              className={`fm-tab${tab === item.id ? ' active' : ''}`}
              onClick={() => {
                setOpenGroup(null);
                setTab(item.id);
              }}
              aria-label={item.label}
              title={item.label}
            >
              <span className="fm-tab__icon" aria-hidden="true">{item.icon}</span>
              <span className="fm-tab__label">{item.label}</span>
              {item.id === 'transfers' && state.incomingOffers.length > 0 && (
                <span className="fm-tab__badge">{state.incomingOffers.length}</span>
              )}
              {item.id === 'inbox' && state.inbox.some((i) => !i.read) && (
                <span className="fm-tab__badge">{state.inbox.filter((i) => !i.read).length}</span>
              )}
            </button>
          );
        })}

        <span className="fm-rail__spacer" />
        <button
          type="button"
          className="fm-rail__settings"
          onClick={onOpenSettings}
          aria-label="Settings"
          title="Settings"
        >
          <span aria-hidden="true">⚙</span>
        </button>
      </nav>

      {tab === 'hub' && (
        <PortalHub state={state} onChange={onChange} onPlayMatch={onPlayMatch} onAbandon={onAbandon} />
      )}
      {tab === 'inbox' && <InboxScreen state={state} onChange={onChange} />}
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
