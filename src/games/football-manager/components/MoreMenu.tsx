'use client';

import { useEffect, type CSSProperties } from 'react';
import type { GameState } from '@/engine/types';
import { SEASON_ROUNDS } from '@/engine/gameRules';
import ManagerAvatar from './ManagerAvatar';
import { Crest } from './Crest';
import { Icon, type IconName } from './Icon';

/**
 * The mock's More Menu: an icon-tile grid of the destinations that sit
 * outside the four nav groups.
 *
 * The spec's version is the overflow sheet for its flat 8-item dock. This
 * game keeps the two-level group nav (PLAN.md decision 2), so there is no
 * dock overflow to absorb — what it holds instead is the genuinely global
 * set the rail has never carried: game settings, the manager customizer,
 * and abandoning the career. Every one of those already existed; none had a
 * home reachable from more than a single screen.
 */

function MoreTile({
  icon,
  tint,
  label,
  sub,
  danger,
  onClick,
}: {
  icon: IconName;
  tint: string;
  label: string;
  sub: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" className={`fm-moretile${danger ? ' fm-moretile--danger' : ''}`} onClick={onClick}>
      <span className="fm-icon-tile fm-icon-tile--lg" style={{ '--tile-tint': tint } as CSSProperties}>
        <Icon name={icon} size={22} />
      </span>
      <span className="fm-moretile__label">{label}</span>
      <span className="fm-moretile__sub">{sub}</span>
    </button>
  );
}

export default function MoreMenu({
  state,
  onSettings,
  onCustomize,
  onAbandon,
  onClose,
}: {
  /** `null` outside a career (main menu, club select) — the sheet then drops
   *  its career header and the abandon tile, since neither has a subject. */
  state: GameState | null;
  onSettings: () => void;
  onCustomize: () => void;
  onAbandon: () => void;
  onClose: () => void;
}) {
  const club = state ? state.clubs.find((c) => c.id === state.userClubId) : undefined;

  // Same dismissal contract as the other sheets (StaffProfileModal): Escape
  // closes, and the backdrop click below does too.
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div className="fm-settings-overlay" onClick={onClose}>
      <div
        className="fm-settings-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fm-more-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="fm-settings-header">
          <h2 id="fm-more-title">More</h2>
          <button className="fm-settings-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>

        <div className="fm-sheet-body">
        {state && (
          <div className="fm-preview" style={{ gridTemplateColumns: 'auto 1fr', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {state.managerProfile && (
                <ManagerAvatar
                  config={state.managerProfile.avatarConfig}
                  size={38}
                  title={state.managerProfile.name}
                  style={{ borderRadius: '50%', flexShrink: 0 }}
                />
              )}
              <Crest name={club?.name} code={club?.code ?? ''} color={club?.color ?? 'var(--panel-3)'} size={32} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="fm-moretile__label" style={{ textAlign: 'left' }}>
                {state.managerProfile?.name ?? 'The Gaffer'}
              </div>
              <div className="fm-preview__venue" style={{ textAlign: 'left' }}>
                {club?.name ?? 'Unattached'} · Week {Math.min(state.week, SEASON_ROUNDS)}/{SEASON_ROUNDS} ·{' '}
                {state.seasonYear}/{(state.seasonYear + 1) % 100}
              </div>
            </div>
          </div>
        )}

        <div className="fm-moregrid">
          <MoreTile
            icon="settings"
            tint="var(--green)"
            label="Settings"
            sub="Match speed, commentary, difficulty"
            onClick={onSettings}
          />
          <MoreTile
            icon="palette"
            tint="var(--blue)"
            label="Customize Manager"
            sub="Name, appearance and style"
            onClick={onCustomize}
          />
          {state && (
            <MoreTile
              icon="warning"
              tint="var(--red)"
              label="Abandon Career"
              sub="Delete this save and return to the menu"
              danger
              onClick={onAbandon}
            />
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
