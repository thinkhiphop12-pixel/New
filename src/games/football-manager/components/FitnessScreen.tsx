'use client';

import type { GameState } from '@/engine/types';
import { getSquad } from '@/engine/teamManagement';
import { Icon } from './Icon';

/**
 * Fitness — how fresh the squad is, on its own screen.
 *
 * This was the bottom third of Team Training, under a heading called
 * "Condition", showing the five least-fit players and nothing else. Two
 * problems with that. It shared a screen with the thing that *causes* it,
 * so the plan and its consequence scrolled past each other rather than
 * being comparable; and five rows out of a twenty-odd-man squad is not an
 * answer to "who can play on Saturday".
 *
 * So it's a destination now: every fit player, worst first, plus the
 * treatment room as its own list with the weeks left on each layoff. Same
 * numbers the engine already keeps — no new state.
 *
 * Everything is a word before it is a number. "Knackered · 41%" reads
 * correctly to somebody who has never seen a football game before, and the
 * bar behind it means nothing needs colour alone to be understood.
 */

/** A fitness percentage in plain words. Four bands, because "Poor" covers
 *  both a man who needs a light week and one who cannot start. */
function fitnessWord(pct: number): string {
  if (pct >= 85) return 'Fresh';
  if (pct >= 70) return 'Fine';
  if (pct >= 50) return 'Tiring';
  return 'Knackered';
}

function fitnessColour(pct: number): string {
  return pct >= 70 ? 'var(--green)' : pct >= 50 ? 'var(--gold)' : 'var(--red)';
}

function sharpnessWord(pct: number): string {
  if (pct >= 70) return 'Match sharp';
  if (pct >= 50) return 'Getting there';
  return 'Rusty';
}

function sharpnessColour(pct: number): string {
  return pct >= 70 ? 'var(--green)' : pct >= 50 ? 'var(--gold)' : 'var(--red)';
}

export default function FitnessScreen({ state }: { state: GameState }) {
  const squad = getSquad(state, state.userClubId);
  const available = squad.filter((p) => p.injuryWeeks === 0);
  const injured = squad
    .filter((p) => p.injuryWeeks > 0)
    .sort((a, b) => a.injuryWeeks - b.injuryWeeks);

  const avgFitness = available.length
    ? Math.round(available.reduce((s, p) => s + p.fitness, 0) / available.length)
    : 0;
  const avgSharpness = available.length
    ? Math.round(available.reduce((s, p) => s + p.sharpness, 0) / available.length)
    : 0;
  // The number that actually changes a team sheet: who shouldn't start.
  const tired = available.filter((p) => p.fitness < 70).length;

  const rows = [...available].sort((a, b) => a.fitness - b.fitness);

  return (
    <>

      {/* --- The three numbers, each with what it means ------------------ */}
      <div className="fm-mod">
        <div className="fm-mod__head">
          <h2 className="fm-mod__title">How fresh are we?</h2>
        </div>
        <div className="fm-condgrid">
          <div className="fm-condgrid__cell">
            <span className="fm-condgrid__val" style={{ color: fitnessColour(avgFitness) }}>{avgFitness}%</span>
            <span className="fm-condgrid__lbl">Fitness — {fitnessWord(avgFitness)}</span>
          </div>
          <div className="fm-condgrid__cell">
            <span className="fm-condgrid__val" style={{ color: sharpnessColour(avgSharpness) }}>{avgSharpness}%</span>
            <span className="fm-condgrid__lbl">Sharpness — {sharpnessWord(avgSharpness)}</span>
          </div>
          <div className="fm-condgrid__cell">
            <span className="fm-condgrid__val" style={{ color: injured.length > 2 ? 'var(--red)' : 'var(--text)' }}>{injured.length}</span>
            <span className="fm-condgrid__lbl">{injured.length === 0 ? 'Nobody injured' : `Injured — ${injured.length > 2 ? 'a problem' : 'manageable'}`}</span>
          </div>
        </div>
        <p className="fm-mod__note">
          <b>Fitness</b> is how much is left in the legs — a tired player runs less and picks
          up more knocks. <b>Sharpness</b> is match rhythm; it only comes from playing and
          from drills. Rest brings fitness back, matches bring sharpness back.
        </p>
        {tired > 0 && (
          <p className="fm-mod__note">
            <Icon name="warning" size={12} /> {tired} {tired === 1 ? 'player is' : 'players are'} under 70%.
            Rest them, or ease the week off in Training.
          </p>
        )}
      </div>

      {/* --- Everybody who can play, least fit first --------------------- */}
      <div className="fm-mod">
        <div className="fm-mod__head">
          <h2 className="fm-mod__title">Squad fitness</h2>
          <span className="fm-mod__hint">Tiredest first</span>
        </div>
        {rows.length === 0 ? (
          <p className="fm-empty">Nobody available — the whole squad is in the treatment room.</p>
        ) : (
          rows.map((p) => (
            <div key={p.id} className="fm-meter-row">
              <div className="fm-meter-row__head">
                <span>{p.name}</span>
                <span className="fm-meter-row__value" style={{ color: fitnessColour(p.fitness) }}>
                  {fitnessWord(p.fitness)} · {Math.round(p.fitness)}%
                </span>
              </div>
              <div className="fm-meter-row__track">
                <div
                  className="fm-meter-row__fill"
                  style={{ width: `${Math.round(p.fitness)}%`, background: fitnessColour(p.fitness) }}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* --- The treatment room ------------------------------------------ */}
      <div className="fm-mod">
        <div className="fm-mod__head">
          <h2 className="fm-mod__title">Treatment room</h2>
          <span className="fm-mod__hint">{injured.length} out</span>
        </div>
        {injured.length === 0 ? (
          <p className="fm-empty">Everyone is fit. Enjoy it while it lasts.</p>
        ) : (
          injured.map((p) => (
            <div key={p.id} className="fm-meter-row">
              <div className="fm-meter-row__head">
                <span>{p.name}</span>
                <span className="fm-meter-row__value" style={{ color: 'var(--red)' }}>
                  <Icon name="injury" size={11} /> {p.injuryWeeks} {p.injuryWeeks === 1 ? 'week' : 'weeks'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
