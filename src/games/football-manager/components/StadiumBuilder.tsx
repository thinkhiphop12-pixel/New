'use client';

import type { FacilitiesState, GameState, Stand, StandId } from '@/engine/types';
import { Icon } from './Icon';
import { STAND_IDS, standUpgradeCost, totalCapacity } from '@/engine/facilities';
import { formatMoney } from '@/engine/utils';

const TIER_COLOR = ['var(--border-soft)', '#4a7c59', '#3d7ab8', '#c9a13b'];
const TIER_LABEL = ['Undeveloped', 'Tier 1', 'Tier 2', 'Tier 3'];

/** Layout for the eight zones on a simple rectangular pitch outline: four
 *  named stands on each side, four corner blocks in the gaps. Pure geometry,
 *  no external assets. */
const LAYOUT: Record<StandId, { x: number; y: number; w: number; h: number }> = {
  north: { x: 60, y: 10, w: 180, h: 26 },
  south: { x: 60, y: 264, w: 180, h: 26 },
  west: { x: 10, y: 46, w: 26, h: 208 },
  east: { x: 264, y: 46, w: 26, h: 208 },
  nw: { x: 10, y: 10, w: 44, h: 30 },
  ne: { x: 246, y: 10, w: 44, h: 30 },
  sw: { x: 10, y: 260, w: 44, h: 30 },
  se: { x: 246, y: 260, w: 44, h: 30 },
};

export default function StadiumBuilder({
  state,
  onStartProject,
  selected,
  onSelect,
}: {
  state: GameState;
  onStartProject: (standId: StandId) => void;
  selected: StandId | null;
  onSelect: (standId: StandId | null) => void;
}) {
  const fs: FacilitiesState | undefined = state.facilities;
  if (!fs) return null;
  const cap = fs.groundCapacityCap;
  const used = totalCapacity(fs);
  const selectedStand: Stand | null = selected ? fs.stands[selected] : null;
  const inFlight = new Set(fs.projects.filter((p) => p.kind === 'stand' && !p.complete).map((p) => p.standId));

  return (
    <div className="fm-panel">
      <p className="fm-label" style={{ marginTop: 0 }}>Stadium</p>
      <p className="fm-club-line">
        Capacity {used.toLocaleString()} / cap {cap.toLocaleString()}. Click a stand to inspect or upgrade it.
      </p>

      <svg viewBox="0 0 300 300" style={{ width: '100%', maxWidth: 420, display: 'block', margin: '10px auto' }}>
        {/* pitch */}
        <rect x="60" y="40" width="180" height="220" fill="var(--surface-2, #1c2b22)" stroke="var(--border-soft)" strokeWidth="1" />
        <line x1="60" y1="150" x2="240" y2="150" stroke="var(--border-soft)" strokeWidth="1" />
        <circle cx="150" cy="150" r="20" fill="none" stroke="var(--border-soft)" strokeWidth="1" />

        {STAND_IDS.map((id) => {
          const box = LAYOUT[id];
          const stand = fs.stands[id];
          const isSelected = selected === id;
          const building = inFlight.has(id);
          return (
            <g
              key={id}
              onClick={() => onSelect(isSelected ? null : id)}
              style={{ cursor: 'pointer' }}
            >
              <rect
                x={box.x} y={box.y} width={box.w} height={box.h}
                fill={TIER_COLOR[stand.tier]}
                stroke={isSelected ? 'var(--gold, #c9a13b)' : 'var(--border)'}
                strokeWidth={isSelected ? 2 : 1}
                opacity={building ? 0.55 : 0.9}
              />
              {building && (
                <use
                  href="#fmi-facilities"
                  x={box.x + box.w / 2 - 6}
                  y={box.y + box.h / 2 - 6}
                  width={12}
                  height={12}
                  style={{ color: '#fff' }}
                />
              )}
            </g>
          );
        })}
      </svg>

      {/* clickable zone legend, doubles as a text-mode selector for a11y */}
      <div className="fm-filters">
        {STAND_IDS.map((id) => (
          <button
            key={id}
            className={`fm-pill${selected === id ? ' active' : ''}`}
            onClick={() => onSelect(selected === id ? null : id)}
          >
            {id.toUpperCase()}{inFlight.has(id) && <Icon name="facilities" size={12} style={{ marginLeft: 4, verticalAlign: -1 }} />}
          </button>
        ))}
      </div>

      {selectedStand && (
        <div className="fm-panel" style={{ marginTop: 10, background: 'var(--surface-2, transparent)' }}>
          <p className="fm-label" style={{ marginTop: 0 }}>
            {selectedStand.id.toUpperCase()} — {TIER_LABEL[selectedStand.tier]}
          </p>
          <p className="fm-club-line">Capacity {selectedStand.capacity.toLocaleString()}</p>
          {selectedStand.tier >= 3 ? (
            <p className="fm-hint">Fully developed.</p>
          ) : inFlight.has(selectedStand.id) ? (
            <p className="fm-hint">Project already underway here.</p>
          ) : (
            <button
              className="fm-btn fm-btn--secondary fm-btn--small"
              disabled={standUpgradeCost(selectedStand.id, selectedStand.tier) > state.budget}
              onClick={() => onStartProject(selectedStand.id)}
            >
              Start project — {formatMoney(standUpgradeCost(selectedStand.id, selectedStand.tier))}
            </button>
          )}
        </div>
      )}

      <div style={{ marginTop: 14 }}>
        <p className="fm-label" style={{ marginTop: 0 }}>Stand Breakdown</p>
        <div className="fm-stand-grid">
          {STAND_IDS.map((id) => {
            const stand = fs.stands[id];
            const building = inFlight.has(id);
            return (
              <button
                key={id}
                className="fm-stand-card"
                style={{
                  border: selected === id ? '2px solid var(--gold)' : '1px solid var(--border-soft)',
                  opacity: building ? 0.55 : 1,
                }}
                onClick={() => onSelect(selected === id ? null : id)}
              >
                <span className="fm-stand-card__name">{id.toUpperCase()}</span>
                <span className="fm-stand-card__value">{stand.capacity.toLocaleString()}</span>
                <span className="fm-hint">{TIER_LABEL[stand.tier]}</span>
                {stand.tier < 3 && !building && (
                  <button
                    className="fm-btn fm-btn--ghost fm-btn--small"
                    style={{ marginTop: 6, width: '100%' }}
                    disabled={standUpgradeCost(id, stand.tier) > state.budget}
                    onClick={(e) => { e.stopPropagation(); onStartProject(id); }}
                  >
                    Tier {stand.tier + 1} — {formatMoney(standUpgradeCost(id, stand.tier))}
                  </button>
                )}
                {building && <span className="fm-hint">Project underway</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
