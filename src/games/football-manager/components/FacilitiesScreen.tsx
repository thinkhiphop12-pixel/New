'use client';

import { useEffect } from 'react';
import type { GameState } from '@/engine/types';
import { ACADEMY_REPUTATION_CAP, newFacilities, startFacilityProject } from '@/engine/facilities';
import {
  FACILITY_LABEL, approvalFor, consumeApproval, cooldownWeeksLeft, facilityCost,
  requestFacilitySanction, type FacilityKey,
} from '@/engine/boardRequests';
import { formatMoney } from '@/engine/utils';
import { Icon, type IconName } from './Icon';
import { Pulse, toneFor } from './SectionHub';

/**
 * Facilities.
 *
 * Same problem the Staff screen had, in a different shape: four stacked
 * panels of explanatory prose, each ending in a `Start project` button that
 * spent millions of the club's money with nobody asked and nothing to weigh
 * up. The Academy panel alone ran to three clauses about reputation, intake
 * chance and a "legacy intake upgrade" sitting next to the real one.
 *
 * Investment is now a board decision (engine/boardRequests.ts). Each
 * facility is a card carrying its level as pips, what the next step buys in
 * a few words, and one action — ask, or build what's already been signed
 * off. The legacy academy-level upgrade is gone from the UI; academy
 * reputation is the single dial that matters and it is the one shown.
 */

type FacilityDef = {
  key: FacilityKey;
  icon: IconName;
  /** What the *next* level actually changes. Short. */
  effect: string;
  level: (fs: NonNullable<GameState['facilities']>) => number;
  max: number;
};

const FACILITIES: FacilityDef[] = [
  { key: 'training', icon: 'training', effect: 'Players develop faster', level: (fs) => fs.trainingLevel, max: 5 },
  { key: 'medical', icon: 'injury', effect: 'Shorter injury layoffs', level: (fs) => fs.medicalLevel, max: 5 },
  { key: 'academy', icon: 'sprout', effect: 'Better intake, sharper scouting reports', level: (fs) => Math.round(fs.academyReputation / 20), max: 5 },
];

/** Level as a row of pips rather than "Level 1/5 — faster player
 *  development." Reads in a glance and takes one line. */
function Pips({ filled, total }: { filled: number; total: number }) {
  return (
    <span className="fm-pips" aria-label={`Level ${filled} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`fm-pips__pip${i < filled ? ' is-on' : ''}`} />
      ))}
    </span>
  );
}

export default function FacilitiesScreen({
  state,
  onChange,
}: {
  state: GameState;
  onChange: (next: GameState) => void;
}) {
  const fs = state.facilities ?? newFacilities(state);
  useEffect(() => {
    if (!state.facilities) onChange({ ...state, facilities: fs });
  }, [state, fs, onChange]);

  const running = fs.projects.filter((p) => !p.complete);
  const avgLevel = (fs.trainingLevel + fs.medicalLevel + fs.academyReputation / 20) / 3;

  const build = (key: FacilityKey) => {
    const base: GameState = { ...state, facilities: fs };
    const started = startFacilityProject(base, key);
    // `startFacilityProject` hands the state straight back if it refuses
    // (already maxed, already building, can't cover the cost). Returning the
    // same object is the only signal it gives, so the sanction is only spent
    // when the work is genuinely under way.
    if (started === base) return;
    onChange(consumeApproval(started, 'facility', key));
  };

  return (
    <>
      <Pulse
        items={[
          { icon: 'facilities', label: 'Overall', value: `${avgLevel.toFixed(1)}/5`, tone: toneFor(avgLevel, 2, 3.5), meter: avgLevel / 5 },
          { icon: 'training', label: 'Building', value: running.length ? `${running.length} project${running.length > 1 ? 's' : ''}` : 'Nothing', tone: running.length ? 'gold' : 'plain' },
          { icon: 'finances', label: 'Balance', value: formatMoney(state.budget), tone: state.budget < 0 ? 'red' : 'green' },
        ]}
      />

      {running.length > 0 && (
        <div className="fm-panel">
          <p className="fm-label" style={{ marginTop: 0 }}>Under construction</p>
          {running.map((p) => (
            <div key={p.id} className="fm-buildrow">
              <span className="fm-buildrow__label">{p.label}</span>
              <div className="fm-bar">
                <div className="fm-bar__fill good" style={{ width: `${(p.weeksElapsed / p.durationWeeks) * 100}%` }} />
              </div>
              <span className="fm-buildrow__weeks">
                {Math.max(0, p.durationWeeks - p.weeksElapsed)}w left
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="fm-facgrid">
        {FACILITIES.map((f) => {
          const level = f.level(fs);
          const cost = facilityCost(state, f.key);
          const approval = approvalFor(state, 'facility', f.key);
          const blocked = cooldownWeeksLeft(state, 'facility', f.key);
          const inProgress = running.some((p) => p.kind === f.key);
          const maxed = cost == null;

          return (
            <div key={f.key} className="fm-faccard">
              <span className="fm-faccard__icon"><Icon name={f.icon} size={20} /></span>
              <div className="fm-faccard__head">
                <span className="fm-faccard__name">{FACILITY_LABEL[f.key]}</span>
                <Pips filled={level} total={f.max} />
              </div>
              <p className="fm-faccard__effect">
                {f.key === 'academy'
                  ? `Reputation ${fs.academyReputation}/${ACADEMY_REPUTATION_CAP} — ${f.effect.toLowerCase()}`
                  : f.effect}
              </p>

              {maxed ? (
                <p className="fm-faccard__note"><Icon name="check" size={12} /> Best in the division.</p>
              ) : inProgress ? (
                <p className="fm-faccard__note">Work already underway.</p>
              ) : approval ? (
                <>
                  <p className="fm-faccard__quote">&ldquo;{approval.reason}&rdquo;</p>
                  <button
                    type="button"
                    className="fm-btn fm-btn--primary fm-btn--small"
                    disabled={cost > state.budget}
                    onClick={() => build(f.key)}
                  >
                    Break ground — {formatMoney(cost)}
                  </button>
                </>
              ) : blocked > 0 ? (
                <>
                  <p className="fm-faccard__quote fm-faccard__quote--cold">
                    Turned down. They&rsquo;ll listen again in {blocked} week{blocked === 1 ? '' : 's'}.
                  </p>
                  <button type="button" className="fm-btn fm-btn--ghost fm-btn--small" disabled>Refused</button>
                </>
              ) : (
                <>
                  <p className="fm-faccard__note">Next step costs {formatMoney(cost)}.</p>
                  <button
                    type="button"
                    className="fm-btn fm-btn--secondary fm-btn--small"
                    onClick={() => onChange(requestFacilitySanction(state, f.key))}
                  >
                    <Icon name="target" size={12} /> Ask the board
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>

      <p className="fm-hint">
        The board pays for building work, so they decide when it happens. Win games, keep the club in the
        black, and don&rsquo;t ask for three things at once.
      </p>
    </>
  );
}
