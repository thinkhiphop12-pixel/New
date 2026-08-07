'use client';

import { useState, type CSSProperties } from 'react';
import { Icon } from './Icon';
import type { Club, GameState, Player } from '@/engine/types';
import { canLoanOut, loanOut, renewContract } from '@/engine/transferMarket';
import { isOnLoan } from '@/engine/teamManagement';
import { getRolesByPosition } from '@/lib/playerRoles';
import { setPlayerRole } from '@/engine/teamManagement';
import { traitNames } from '@/engine/traits';
import { formatMoney } from '@/engine/utils';
import { CONVERTIBLE_ROLES, estimateConversionWeeks, setDevPlan } from '@/engine/development';
import type { DevPlan } from '@/engine/types';
import { attrBand } from './visuals';
import { SpiderChart } from './SpiderChart';
import { PlayerFace } from './PlayerFace';

/** Fields Phase 1 (concurrent) is adding to `Player` but that may not have
 *  landed yet. Kept as an optional local extension so this modal works
 *  today and lights up automatically once the real fields land — never
 *  edit engine/types.ts from here. */
type PlayerWithFuture = Player & {
  potential?: number;
  height?: number;
  altPos?: string[];
  gkReflexes?: number;
  gkPositioning?: number;
};

/** Shift a #rrggbb hex toward black/white; also used to derive readable
 *  avatar text colour against a club's kit colour. */
function luminance(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex || '').trim());
  if (!m) return 0;
  const n = parseInt(m[1], 16);
  const srgb = [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

function textOn(hex: string): string {
  return luminance(hex) > 0.45 ? '#111' : '#fff';
}

/** Same 5-band ramp `attrBand` uses for attribute chips, as a raw colour
 *  rather than a class name — feeds the `.fm-ring` header treatment's
 *  `--ring-color`, so the ring reads on the same scale as the attribute
 *  bars underneath it. */
function ratingRingColor(v: number): string {
  if (v >= 85) return 'var(--chip-vhigh)';
  if (v >= 72) return 'var(--chip-high)';
  if (v >= 58) return 'var(--chip-mid)';
  if (v >= 45) return 'var(--chip-low)';
  return 'var(--chip-bad)';
}

function moraleColor(v: number): string {
  if (v >= 70) return 'var(--green)';
  if (v >= 45) return 'var(--gold)';
  return 'var(--red)';
}

const STAT_FOCUS_OPTIONS: { key: NonNullable<DevPlan['statFocus']>; label: string }[] = [
  { key: 'pac', label: 'Pace' },
  { key: 'sho', label: 'Shooting' },
  { key: 'pas', label: 'Passing' },
  { key: 'dri', label: 'Dribbling' },
  { key: 'def', label: 'Defending' },
  { key: 'phy', label: 'Physical' },
];

function initials(name: string): string {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function avgRating(p: Player): number | null {
  if (!p.seasonRatingCount) return null;
  return Math.round((p.seasonRatingSum! / p.seasonRatingCount) * 10) / 10;
}

const OUTFIELD_ATTRS: [string, keyof Player][] = [
  ['PAC', 'pac'],
  ['SHO', 'sho'],
  ['PAS', 'pas'],
  ['DRI', 'dri'],
  ['DEF', 'def'],
  ['PHY', 'phy'],
];

const GK_ATTRS: [string, keyof PlayerWithFuture][] = [
  ['REF', 'gkReflexes'],
  ['POS', 'gkPositioning'],
  ['PAS', 'pas'],
  ['PHY', 'phy'],
  ['PAC', 'pac'],
];

/** Player detail overlay — club-coloured initials avatar, position/OVR/pot
 *  badges, Ratings (attribute bars + spider chart) / Stats pill tabs.
 *  Ported from the competitor's `showPlayerModal`; degrades gracefully
 *  when `potential`/`height`/`altPos`/GK attrs aren't on the Player yet. */
export default function PlayerModal({
  state,
  player,
  club,
  onChange,
  onClose,
}: {
  state: GameState;
  player: Player;
  club?: Club;
  onChange: (next: GameState) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<'ratings' | 'stats'>('ratings');
  const p = player as PlayerWithFuture;

  const isGK = p.pos === 'GK';
  const hasGkAttrs = isGK && p.gkReflexes != null && p.gkPositioning != null;
  const attrDefs = hasGkAttrs ? GK_ATTRS : OUTFIELD_ATTRS;

  const hasPot = p.potential != null && p.potential > 0;
  const potRatio = hasPot && p.rating > 0 ? p.potential! / p.rating : 1;
  const potVal = (v: number) => Math.min(99, Math.round(v * potRatio));

  const values = attrDefs.map(([, key]) => Number(p[key as keyof PlayerWithFuture] ?? 0));
  const potentials = hasPot ? values.map((v) => potVal(v)) : undefined;
  const labels = attrDefs.map(([name]) => name);

  const potGap = hasPot ? p.potential! - p.rating : 0;
  const potColor = potGap >= 10 ? 'var(--green)' : potGap >= 5 ? 'var(--gold)' : 'var(--muted)';

  const clubColor = club?.color || '#333333';
  const clubText = textOn(clubColor);

  const posLabel = p.role || p.pos;
  const altPos = p.altPos && p.altPos.length > 0 ? p.altPos.join('·') : null;

  return (
    <div className="fm-matchx-modal" onClick={onClose}>
      <div className="fm-matchx-modal__panel fm-matchx-modal__panel--narrow" onClick={(e) => e.stopPropagation()}>
        <div className="fm-matchx-modal__head">
          <span className="fm-matchx-modal__title">Player</span>
          <button className="fm-matchx-modal__close" onClick={onClose} aria-label="Close"><Icon name="cross" size={15} /></button>
        </div>

        <div className="pm-header">
          <div
            className="fm-ring fm-ring--lg"
            style={{ '--ring-pct': p.rating, '--ring-color': ratingRingColor(p.rating) } as CSSProperties}
          >
            <div className="pm-avatar" style={{ background: clubColor, color: clubText }}>
              {initials(p.name)}
            </div>
          </div>
          <div className="pm-info">
            <h2 className="pm-name">
              {p.squadNumber !== undefined && <span className="pm-num">{p.squadNumber}</span>}
              {p.name}
            </h2>
            <p className="pm-subline">
              {p.nat} · Age {p.age}
              {p.height != null ? ` · ${p.height}cm` : ''}
            </p>
            <div className="pm-badges">
              <span className="fm-player-row__badge">{posLabel}</span>
              {altPos && <span className="pm-altpos">{altPos}</span>}
              <span className="ovr-badge">{p.rating}</span>
              {hasPot && potGap > 0 && (
                <span className="pm-pot-tag" style={{ color: potColor }}>
                  ▲{p.potential}
                </span>
              )}
              <span className="fm-trait" style={{ color: moraleColor(p.morale) }} title="Morale">
                Morale {Math.round(p.morale)}
              </span>
            </div>
          </div>
        </div>

        <div className="pm-tab-row">
          <button className={`pm-tab-btn${tab === 'ratings' ? ' active' : ''}`} onClick={() => setTab('ratings')}>
            Ratings
          </button>
          <button className={`pm-tab-btn${tab === 'stats' ? ' active' : ''}`} onClick={() => setTab('stats')}>
            Stats
          </button>
        </div>

        {tab === 'ratings' && (
          <>
            <div className="pm-attr-bar-list">
              {attrDefs.map(([name, key], i) => {
                const v = values[i];
                const pv = potentials?.[i];
                return (
                  <div className="pm-attr-row" key={name}>
                    <span className="pm-attr-label">{name}</span>
                    <div className="pm-attr-track">
                      {pv != null && <div className="pm-attr-pot-fill" style={{ width: `${pv}%` }} />}
                      <div className={`pm-attr-fill ${attrBand(v)}`} style={{ width: `${Math.min(100, v)}%` }} />
                    </div>
                    <span className="pm-attr-val">{v}</span>
                    {pv != null && pv > v && <span className="pm-pot-stat-val">{pv}</span>}
                  </div>
                );
              })}
            </div>
            <div className="pm-spider-wrap">
              <SpiderChart labels={labels} values={values} potentials={potentials} />
              {hasPot && (
                <div className="pm-spider-legend">
                  <span className="pm-legend-item">
                    <span className="pm-legend-dot current" />Current
                  </span>
                  <span className="pm-legend-item">
                    <span className="pm-legend-dot potential" />Potential
                  </span>
                </div>
              )}
            </div>
            {traitNames(p).length > 0 && (
              <div className="fm-pills" style={{ marginTop: 8 }}>
                {traitNames(p).map((t) => (
                  <span key={t} className="fm-trait">
                    {t}
                  </span>
                ))}
              </div>
            )}
            <p className="fm-label" style={{ marginTop: 10 }}>
              Tactical role
            </p>
            <div className="fm-role-grid">
              <button
                className={`fm-role-tile${!p.tacticalRole ? ' active' : ''}`}
                onClick={() => onChange(setPlayerRole(state, p.id, null))}
              >
                <span className="fm-role-tile__name">Balanced</span>
                <span className="fm-role-tile__desc">No specialism</span>
              </button>
              {getRolesByPosition(p.pos).map((role) => (
                <button
                  key={role.id}
                  className={`fm-role-tile${p.tacticalRole === role.id ? ' active' : ''}`}
                  onClick={() => onChange(setPlayerRole(state, p.id, role.id))}
                >
                  <span className="fm-role-tile__name">{role.name}</span>
                  <span className="fm-role-tile__desc">{role.description}</span>
                </button>
              ))}
            </div>

            <p className="fm-label" style={{ marginTop: 10 }}>
              Development plan
            </p>
            <div className="fm-role-grid">
              <button
                className={`fm-role-tile${!p.devPlan || p.devPlan.mode === 'balanced' ? ' active' : ''}`}
                onClick={() => onChange(setDevPlan(state, p.id, { mode: 'balanced' }))}
              >
                <span className="fm-role-tile__name">Balanced / auto</span>
                <span className="fm-role-tile__desc">Generic squad-wide training roll</span>
              </button>
              <button
                className={`fm-role-tile${p.devPlan?.mode === 'stat' ? ' active' : ''}`}
                onClick={() =>
                  onChange(setDevPlan(state, p.id, { mode: 'stat', statFocus: p.devPlan?.statFocus ?? 'pac' }))
                }
              >
                <span className="fm-role-tile__name">Stat focus</span>
                <span className="fm-role-tile__desc">Doubles growth odds for one attribute</span>
              </button>
              <button
                className={`fm-role-tile${p.devPlan?.mode === 'position' ? ' active' : ''}`}
                onClick={() =>
                  onChange(
                    setDevPlan(state, p.id, {
                      mode: 'position',
                      targetPos: p.devPlan?.targetPos ?? CONVERTIBLE_ROLES.find((r) => r !== p.role) ?? CONVERTIBLE_ROLES[0],
                    })
                  )
                }
              >
                <span className="fm-role-tile__name">Position conversion</span>
                <span className="fm-role-tile__desc">Learn a new position over several weeks</span>
              </button>
            </div>

            {p.devPlan?.mode === 'stat' && (
              <div className="fm-pills" style={{ marginTop: 8 }}>
                {STAT_FOCUS_OPTIONS.map((o) => (
                  <button
                    key={o.key}
                    className={`fm-pill${p.devPlan?.statFocus === o.key ? ' active' : ''}`}
                    onClick={() => onChange(setDevPlan(state, p.id, { mode: 'stat', statFocus: o.key }))}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            )}

            {p.devPlan?.mode === 'position' && (
              <>
                <div className="fm-pills" style={{ marginTop: 8 }}>
                  {CONVERTIBLE_ROLES.filter((r) => r !== p.role).map((r) => (
                    <button
                      key={r}
                      className={`fm-pill${p.devPlan?.targetPos === r ? ' active' : ''}`}
                      onClick={() => onChange(setDevPlan(state, p.id, { mode: 'position', targetPos: r }))}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <p className="fm-hint" style={{ textAlign: 'left', marginTop: 6 }}>
                  Est. {p.devPlan.weeksRemaining ?? estimateConversionWeeks(p, p.devPlan.targetPos ?? '')} week
                  {(p.devPlan.weeksRemaining ?? 0) === 1 ? '' : 's'} remaining.
                </p>
              </>
            )}
          </>
        )}

        {tab === 'stats' && (
          <>
            <div className="pm-stats-grid">
              <div className="pm-stat">
                <span className="pm-stat-name">Market Value</span>
                <span className="pm-stat-val text-gold">{formatMoney(p.value)}</span>
              </div>
              <div className="pm-stat">
                <span className="pm-stat-name">Wage</span>
                <span className="pm-stat-val">{formatMoney(p.wage)}/w</span>
              </div>
              <div className="pm-stat">
                <span className="pm-stat-name">Contract</span>
                <span className="pm-stat-val">{p.contractYears}y</span>
              </div>
              {hasPot && (
                <div className="pm-stat">
                  <span className="pm-stat-name">Potential</span>
                  <span className="pm-stat-val" style={{ color: potColor }}>
                    {p.potential}
                  </span>
                </div>
              )}
              {p.height != null && (
                <div className="pm-stat">
                  <span className="pm-stat-name">Height</span>
                  <span className="pm-stat-val">{p.height}cm</span>
                </div>
              )}
              {avgRating(p) !== null && (
                <div className="pm-stat">
                  <span className="pm-stat-name">Avg Rating</span>
                  <span className="pm-stat-val">{avgRating(p)}</span>
                </div>
              )}
            </div>
            <p className="fm-label" style={{ marginTop: 10 }}>
              This season
            </p>
            <div className="pm-stats-grid">
              <div className="pm-stat">
                <span className="pm-stat-name">Apps</span>
                <span className="pm-stat-val">{p.apps}</span>
              </div>
              <div className="pm-stat">
                <span className="pm-stat-name">Goals</span>
                <span className="pm-stat-val">{p.goals}</span>
              </div>
              <div className="pm-stat">
                <span className="pm-stat-name">Assists</span>
                <span className="pm-stat-val">{p.assists}</span>
              </div>
            </div>
            {p.career.length > 0 && (
              <>
                <p className="fm-label" style={{ marginTop: 10 }}>
                  Career history
                </p>
                <ul className="fm-news">
                  {[...p.career].reverse().slice(0, 6).map((c, i) => (
                    <li key={i}>
                      {c.year}/{(c.year + 1) % 100} {c.club}: {c.apps} apps, {c.goals} goals
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}

        <div className="fm-actions" style={{ justifyContent: 'flex-start', marginTop: 10 }}>
          {p.contractYears <= 1 && (
            <button
              className="fm-btn fm-btn--primary fm-btn--small"
              disabled={p.wage * 10 > state.budget}
              onClick={() => onChange(renewContract(state, p.id))}
            >
              Renew contract ({formatMoney(p.wage * 10)} bonus)
            </button>
          )}
          {!isOnLoan(p) && (
            <button
              className="fm-btn fm-btn--secondary fm-btn--small"
              disabled={!canLoanOut(state, p.id).ok}
              onClick={() => onChange(loanOut(state, p.id))}
            >
              Loan out for the season
            </button>
          )}
          <button className="fm-btn fm-btn--ghost fm-btn--small" onClick={onClose}>
            Close
          </button>
        </div>
        {p.contractYears <= 1 && (
          <span className="fm-trait" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8 }}>
            <Icon name="warning" size={12} /> Contract expiring
          </span>
        )}
      </div>
    </div>
  );
}
