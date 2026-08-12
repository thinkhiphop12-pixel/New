'use client';

import { useState } from 'react';
import type { GameState, TeamDrill } from '@/engine/types';
import { getSquad } from '@/engine/teamManagement';
import { nextUserFixture } from '@/engine/seasonProgression';
import {
  SESSION_LABELS, TEAM_DRILLS, applySessionResult, canPlaySession, drillDef, getSessions,
  projectTeamSessions, sessionQuality, setSession,
} from '@/engine/training';
import {
  WEEK_DAY_LABELS, getSchedule, projectWeeklySchedule, setScheduleDay, setWholeSchedule,
} from '@/engine/schedule';
import { assistantScheduleAdvice } from '@/engine/assistant';
import { Icon, type IconName } from './Icon';
import AssistantLine from './assistant/AssistantLine';
import TrainingSessionModal from './TrainingSessionModal';
import TrainingMiniGame from './TrainingMiniGame';

/**
 * Team training.
 *
 * The club works together twice a week and the manager picks what each of
 * those two sessions is for. That is the whole interaction, and it is the
 * half of training that applies to everybody — individual work has its own
 * screen next door.
 *
 * Each drill card states what the session does — the deltas and focus group
 * off TEAM_DRILLS — so the choice can be made without knowing the formulas,
 * and a load meter says how hard the resulting week is.
 *
 * The drill can also be *played*: "Run the drill" opens the mini-game behind
 * that category (components/TrainingMiniGame.tsx), once a week, and the score
 * scales that week's output. It is optional in both directions — an unplayed
 * week resolves at the neutral baseline, and the session still resolves in
 * the weekly tick either way. Once a week has run, "Watch last session"
 * replays what the tick recorded.
 *
 * The seven-day intensity strip underneath used to be its own screen
 * (Weekly Schedule) that no tab pointed at. It is the same engine
 * (engine/schedule.ts) — how hard the week is, as opposed to what it's
 * spent on — so it belongs here, compressed to one row.
 */

const DRILL_ICON: Record<TeamDrill, IconName> = {
  attacking: 'attack',
  defending: 'defense',
  possession: 'balanced',
  'set-pieces': 'corner',
  fitness: 'fitness',
  'match-prep': 'target',
};

const STAT_LABEL: Record<string, string> = {
  pac: 'Pace', sho: 'Shooting', pas: 'Passing', dri: 'Dribbling', def: 'Defending', phy: 'Physical',
};

function signed(n: number, digits = 1): string {
  // A minus sign, not a hyphen — these sit in a row of numbers and the
  // hyphen reads as a dash at this size.
  return n >= 0 ? `+${n.toFixed(digits)}` : `−${Math.abs(n).toFixed(digits)}`;
}

/** One signed effect chip on a drill card. */
function Fx({ label, value }: { label: string; value: number }) {
  return (
    <i className={`fm-fx ${value >= 0 ? 'fm-fx--up' : 'fm-fx--down'}`}>
      {label} {signed(value)}
    </i>
  );
}

function toneOf(n: number): string {
  return n > 0.05 ? 'var(--green)' : n < -0.05 ? 'var(--red)' : 'var(--muted)';
}

/** The arrow that goes with `toneOf`. Every coloured number on this screen
 *  carries one, so nothing on it depends on telling green from red — which
 *  matters for colour-blind players and for anyone reading it quickly. */
function arrowOf(n: number): IconName {
  return n > 0.05 ? 'arrow-up' : n < -0.05 ? 'arrow-down' : 'dash';
}

/** A condition percentage in words. `74%` doesn't say whether that's a
 *  problem; "Fresh" does. */
function conditionWord(pct: number, good: number, ok: number): string {
  return pct >= good ? 'Good' : pct >= ok ? 'Okay' : 'Poor';
}

export default function TrainingScreen({
  state,
  onChange,
}: {
  state: GameState;
  onChange: (next: GameState) => void;
}) {
  /** Which of the two weekly sessions the drill grid is currently setting. */
  const [editing, setEditing] = useState<0 | 1>(0);
  /** Whether the last session's replay is open. */
  const [watching, setWatching] = useState(false);
  /** Whether the drill mini-game is open. */
  const [playing, setPlaying] = useState(false);

  const sessions = getSessions(state);
  const squad = getSquad(state, state.userClubId);
  // Whatever the last weekly tick recorded. Absent until a week has actually
  // been played, which is why the Watch button only appears once there is
  // something real to replay.
  const lastReport = state.lastTrainingReport ?? null;
  const canPlay = canPlaySession(state);
  const playedQuality = state.sessionQuality;
  const days = getSchedule(state);
  const advice = assistantScheduleAdvice(state);
  const intensity = projectWeeklySchedule(state);
  const drills = projectTeamSessions(state);

  const avgFitness = squad.length ? Math.round(squad.reduce((s, p) => s + p.fitness, 0) / squad.length) : 0;
  const avgSharpness = squad.length ? Math.round(squad.reduce((s, p) => s + p.sharpness, 0) / squad.length) : 0;
  const injured = squad.filter((p) => p.injuryWeeks > 0).length;
  const hasMatch = nextUserFixture(state) !== null;

  // What a full week of the current plan does, both halves combined.
  const weekSharpness = intensity.sharpnessDelta + drills.sharpness;
  const weekFitness = intensity.fitnessDelta + drills.fitness;

  // How hard the week is: the two drills' own load, scaled by how many of the
  // seven days are training days rather than recovery. Five on / two off is
  // the neutral week, so that scales to 1.
  const trainingDays = days.filter((d) => d === 'training').length;
  const drillLoad = (drillDef(sessions[0]).load + drillDef(sessions[1]).load) / 2;
  const weekLoad = Math.max(0, Math.min(100, Math.round(drillLoad * (trainingDays / 5))));
  const loadTone = weekLoad > 78 ? 'var(--red)' : weekLoad > 62 ? 'var(--gold)' : 'var(--green)';
  const loadVerdict = weekLoad > 78 ? 'Too hard' : weekLoad > 62 ? 'Demanding' : 'Comfortable';
  const loadLine = weekLoad > 78
    ? `“That's a lot, boss. Injury risk is running at ${(intensity.overtrainRisk * 100).toFixed(1)}% a session — somebody will break.”`
    : weekLoad > 62
      ? '“Hard week, but they’ll cope. I’d keep an eye on the over-30s.”'
      : advice.quote;

  return (
    <>
      <AssistantLine state={state} route="training" />

      {/* --- The two sessions ------------------------------------------- */}
      {/* Each drill states what it does rather than only what it is called;
          every number on these cards already existed in TEAM_DRILLS and was
          simply never rendered, which is why twelve identical grey buttons
          was all the screen amounted to.
          One grid, not two: with that copy on the cards, showing the same six
          twice — once per session — filled a screen and a half with identical
          text. Pick which session you're setting, then pick its drill; both
          current choices stay on the selector either way. */}
      <div className="fm-mod">
        <div className="fm-mod__head">
          <h2 className="fm-mod__title">Team training</h2>
          <span className="fm-actiondock__spacer" />
          {lastReport && (
            <button
              type="button"
              className="fm-btn fm-btn--secondary fm-btn--small"
              onClick={() => setWatching(true)}
            >
              <Icon name="play" size={13} /> Watch last session
            </button>
          )}
          {/* Optional. An unplayed week resolves at the neutral baseline, so
              this is worth doing rather than something you owe the game. */}
          {canPlay ? (
            <button
              type="button"
              className="fm-btn fm-btn--primary fm-btn--small"
              onClick={() => setPlaying(true)}
            >
              <Icon name="play" size={13} /> Run the drill
            </button>
          ) : (
            <span className="fm-hint" style={{ margin: 0 }}>
              Session run · scored <b style={{ color: 'var(--green)' }}>{playedQuality ?? sessionQuality(state)}</b>
            </span>
          )}
        </div>

        <div className="fm-segmented fm-sessionpick" role="tablist" aria-label="Which session to set">
          {([0, 1] as const).map((slot) => (
            <button
              key={slot}
              role="tab"
              aria-selected={editing === slot}
              className={`fm-segmented__opt${editing === slot ? ' active' : ''}`}
              onClick={() => setEditing(slot)}
            >
              {SESSION_LABELS[slot]}
              <span className="fm-sessionpick__now">{drillDef(sessions[slot]).label}</span>
            </button>
          ))}
        </div>

        <div className="fm-drillgrid">
          {TEAM_DRILLS.map((d) => (
            <button
              key={d.id}
              type="button"
              className={`fm-drillcard${sessions[editing] === d.id ? ' active' : ''}`}
              aria-pressed={sessions[editing] === d.id}
              onClick={() => onChange(setSession(state, editing, d.id))}
            >
              <span className="fm-drillcard__head">
                <Icon name={DRILL_ICON[d.id]} size={16} />
                <span className="fm-drillcard__name">{d.label}</span>
              </span>
              <span className="fm-drillcard__does">{d.blurb}</span>
              <span className="fm-drillcard__fx">
                <Fx label="Sharpness" value={d.sharpness} />
                <Fx label="Fitness" value={d.fitness} />
                {d.chemistry !== 0 && <Fx label="Chemistry" value={d.chemistry} />}
                {d.stats.length > 0 && (
                  <i className="fm-fx fm-fx--flat">Trains {d.stats.map((k) => STAT_LABEL[k]).join(', ')}</i>
                )}
                <i className="fm-fx fm-fx--flat">
                  {d.focusPositions.length === 4 ? 'Whole squad' : `Best for ${d.focusPositions.join('/')}`}
                </i>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* --- How hard the week is ---------------------------------------
          One module, not two: the load meter and the day strip are the same
          question (how hard is this week) read two ways, and the meter is
          computed from the strip, so they belong together. */}
      <div className="fm-mod">
        <div className="fm-mod__head">
          <h2 className="fm-mod__title">Week load</h2>
          <span className="fm-actiondock__spacer" />
          {/* Word first, icon second, number last — the number is the least
              useful of the three and used to be doing all the work. */}
          <span className="fm-loadverdict" style={{ color: loadTone }}>
            <Icon name={weekLoad > 78 ? 'warning' : weekLoad > 62 ? 'flame' : 'check'} size={13} />
            {loadVerdict}
          </span>
        </div>
        <div className="fm-loadtrack">
          <i className="fm-loadtrack__fill" style={{ width: `${weekLoad}%`, background: loadTone }} />
        </div>
        <p className="fm-hint" style={{ textAlign: 'left', margin: '0 0 12px' }}>{loadLine}</p>

        <p className="fm-label" style={{ margin: '0 0 6px' }}>
          Training days — {days.filter((d) => d === 'training').length} on, {days.filter((d) => d === 'recovery').length} off
        </p>
        <div className="fm-dayrow">
          {WEEK_DAY_LABELS.map((label, i) => {
            const training = days[i] === 'training';
            const matchDay = i === 5 && hasMatch;
            return (
              <button
                key={label}
                type="button"
                className={`fm-day${training ? ' is-training' : ''}${matchDay ? ' is-match' : ''}`}
                onClick={() => onChange(setScheduleDay(state, i, training ? 'recovery' : 'training'))}
                title={matchDay ? 'Match day' : training ? 'Training — tap for recovery' : 'Recovery — tap for training'}
              >
                <span className="fm-day__label">{label}</span>
                <Icon name={matchDay ? 'fixtures' : training ? 'training' : 'person'} size={15} />
              </button>
            );
          })}
        </div>

        <div className="fm-projrow">
          <span>
            Sharpness{' '}
            <b style={{ color: toneOf(weekSharpness) }}>
              <Icon name={arrowOf(weekSharpness)} size={11} /> {signed(weekSharpness)}
            </b>
            /wk
          </span>
          <span>
            Fitness{' '}
            <b style={{ color: toneOf(weekFitness) }}>
              <Icon name={arrowOf(weekFitness)} size={11} /> {signed(weekFitness)}
            </b>
            /wk
          </span>
          <span>
            Injury risk{' '}
            <b style={{ color: intensity.overtrainRisk > 0 ? 'var(--red)' : 'var(--green)' }}>
              <Icon name={intensity.overtrainRisk > 0 ? 'warning' : 'check'} size={11} />{' '}
              {intensity.overtrainRisk > 0 ? 'Raised' : 'Normal'}
            </b>
          </span>
        </div>

        {/* The assistant's read on the week is already the load line above,
            so this keeps only its actionable half — the preset he'd apply. */}
        {advice.suggestion && (
          <div className="fm-advice">
            <span className="fm-advice__icon"><Icon name="mic" size={14} /></span>
            <p className="fm-advice__quote">
              &ldquo;A {advice.suggestion.label.toLowerCase()} week would suit this squad better.&rdquo;
            </p>
            <button
              type="button"
              className="fm-btn fm-btn--secondary fm-btn--small"
              onClick={() => onChange(setWholeSchedule(state, advice.suggestion!.days))}
            >
              Use {advice.suggestion.label}
            </button>
          </div>
        )}
      </div>

      {/* --- Where the squad is ----------------------------------------- */}
      <div className="fm-mod">
        <div className="fm-mod__head"><h2 className="fm-mod__title">Condition</h2></div>
        <div className="fm-condgrid">
          {/* Each tile says the number, then what the number means. The word
              is the part that survives being glanced at. */}
          <div className="fm-condgrid__cell">
            <span className="fm-condgrid__val" style={{ color: avgFitness >= 75 ? 'var(--green)' : avgFitness >= 55 ? 'var(--gold)' : 'var(--red)' }}>{avgFitness}%</span>
            <span className="fm-condgrid__lbl">Fitness — {conditionWord(avgFitness, 75, 55)}</span>
          </div>
          <div className="fm-condgrid__cell">
            <span className="fm-condgrid__val" style={{ color: avgSharpness >= 70 ? 'var(--green)' : avgSharpness >= 50 ? 'var(--gold)' : 'var(--red)' }}>{avgSharpness}%</span>
            <span className="fm-condgrid__lbl">Sharpness — {conditionWord(avgSharpness, 70, 50)}</span>
          </div>
          <div className="fm-condgrid__cell">
            <span className="fm-condgrid__val" style={{ color: injured > 2 ? 'var(--red)' : 'var(--text)' }}>{injured}</span>
            <span className="fm-condgrid__lbl">{injured === 0 ? 'Nobody injured' : `Injured — ${injured > 2 ? 'a problem' : 'manageable'}`}</span>
          </div>
        </div>
        {[...squad]
          .filter((p) => p.injuryWeeks === 0)
          .sort((a, b) => a.fitness - b.fitness)
          .slice(0, 5)
          .map((p) => (
            <div key={p.id} className="fm-meter-row">
              <div className="fm-meter-row__head">
                <span>{p.name}</span>
                <span className="fm-meter-row__value" style={{ color: p.fitness >= 75 ? 'var(--green)' : p.fitness >= 50 ? 'var(--gold)' : 'var(--red)' }}>
                  {conditionWord(p.fitness, 75, 50)} · {Math.round(p.fitness)}%
                </span>
              </div>
              <div className="fm-meter-row__track">
                <div
                  className="fm-meter-row__fill"
                  style={{ width: `${Math.round(p.fitness)}%`, background: p.fitness >= 75 ? 'var(--green)' : p.fitness >= 50 ? 'var(--gold)' : 'var(--red)' }}
                />
              </div>
            </div>
          ))}
      </div>

      {watching && lastReport && (
        <TrainingSessionModal report={lastReport} onClose={() => setWatching(false)} />
      )}

      {playing && (
        <TrainingMiniGame
          drill={sessions[editing]}
          onFinish={(score) => {
            onChange(applySessionResult(state, score));
            setPlaying(false);
          }}
          onClose={() => setPlaying(false)}
        />
      )}
    </>
  );
}
