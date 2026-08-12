'use client';

import { useEffect } from 'react';
import { Icon } from './Icon';
import { formatMoney } from '@/engine/utils';
import type { GameState, Coach } from '@/engine/types';
import { fireCoach } from '@/engine/facilities';
import { QualityRating, qualityGrade } from './visuals';

export default function StaffProfileModal({
  state,
  coach,
  onClose,
  onChange,
}: {
  state: GameState;
  coach: Coach;
  onClose: () => void;
  onChange: (next: GameState) => void;
}) {
  const fs = state.facilities!;

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div className="fm-modal-backdrop" onClick={onClose}>
      <div
        className="fm-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="staff-profile-title"
        style={{ maxWidth: 420, padding: 20 }}
      >
        <div className="fm-modal__header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
            <span
              className="fm-staff-row__rating"
              style={{
                width: 32,
                height: 32,
                fontSize: 12,
                background: `conic-gradient(var(--green) ${qualityGrade(coach.quality).stars * 20}%, var(--panel-2) 0)`,
                color: 'var(--text)',
              }}
            >
              {qualityGrade(coach.quality).stars}
            </span>
            <div>
              <h2 id="staff-profile-title" style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{coach.name}</h2>
              <p className="fm-hint" style={{ margin: 2, textTransform: 'capitalize' }}>{coach.role.replace(/_/g, ' ')}</p>
            </div>
          </div>
          <button
            className="fm-btn fm-btn--ghost fm-btn--small"
            onClick={onClose}
            aria-label="Close profile"
            style={{ marginLeft: 'auto' }}
          >
            ✕
          </button>
        </div>
        <div className="fm-stat-strip">
          <div className="fm-stat-dot">
            <span className="fm-hint">Role</span>
            <span>{coach.role.replace(/_/g, ' ')}</span>
          </div>
          <div className="fm-stat-dot">
            <span className="fm-hint">How good</span>
            <QualityRating quality={coach.quality} />
          </div>
          <div className="fm-stat-dot">
            <span className="fm-hint">Wage</span>
            <span>{formatMoney(coach.wage)}/wk</span>
          </div>
        </div>
        <div className="fm-stat-strip">
          <button className="fm-btn fm-btn--secondary fm-btn--small" onClick={() => onClose()}>
            Negotiate contract
          </button>
          <button
            className="fm-btn fm-btn--ghost fm-btn--small"
            onClick={() => { onChange(fireCoach({ ...state, facilities: fs }, coach.id)); onClose(); }}
            style={{ marginLeft: 'auto' }}
          >
            Release coach
          </button>
        </div>
      </div>
    </div>
  );
}
