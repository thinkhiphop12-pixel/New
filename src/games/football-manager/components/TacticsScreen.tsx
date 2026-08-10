'use client';

import { useState, type CSSProperties } from 'react';
import type {
  AttackFocus, BuildUp, DefLine, GameState, PassingStyle, PlayStyle, Pressing,
  RunStyle, Tackling, TacticStyle, Tempo, Width,
} from '@/engine/types';
import { ALL_FORMATIONS, buildCustomFormation, getFormation, getLeague, parseCustomFormationId } from '@/engine/gameRules';
import { autoPickLineup, getSquad, previewEffectiveXG } from '@/engine/teamManagement';
import { nextUserFixture, setCaptain } from '@/engine/seasonProgression';
import { traitNames } from '@/engine/traits';
import {
  coachDrillMult, needsDrilling, projectedFamiliarity, seedFamiliarityForSwitch,
  styleExec, styleFamiliarity, weeksToDrill,
} from '@/engine/familiarity';
import { MENTALITIES, MENTALITY_ORDER, normalizeMentality, type MentalityId } from '@/engine/tickEngine/tacticsData';
import {
  CORNER_ROUTINES, cornerRoutineOf, setPieceTaker, setPieceXG,
  type CornerDefense, type CornerRoutine, type SPJob,
} from '@/engine/setPieces';
import { getRole } from '@/lib/playerRoles';
import { PitchMarkings, PlayerToken } from './visuals';
import { Icon, type IconName } from './Icon';
import { pushToast } from './ToastQueue';

const ROUTINE_LABEL: Record<CornerRoutine, string> = {
  'near-post': 'Near Post',
  'far-post': 'Far Post',
  drilled: 'Drilled',
  short: 'Short',
  'edge-of-box': 'Edge of Box',
};

/** The four dead-ball jobs, with the attribute each is judged on — shown next
 *  to every name so the choice can be made without leaving the screen. */
const SP_ROLES: { job: SPJob; label: string; stat: 'pas' | 'sho'; icon: IconName }[] = [
  { job: 'penalty', label: 'Penalties', stat: 'sho', icon: 'target' },
  { job: 'corner', label: 'Corners', stat: 'pas', icon: 'corner' },
  { job: 'fkShoot', label: 'Free kicks (shoot)', stat: 'sho', icon: 'boot' },
  { job: 'fkDeliver', label: 'Free kicks (cross)', stat: 'pas', icon: 'flag' },
];

const SP_FIELD: Record<SPJob, string> = {
  penalty: 'penalties', corner: 'corners', fkShoot: 'fkShoot', fkDeliver: 'fkDeliver',
};

/** Presentation order: the two no-drill fallbacks first, then the identities
 *  that have to be worked on. */
const IDENTITY_ORDER: PlayStyle[] = [
  'balanced', 'parkbus', 'possession', 'tiki-taka', 'gegenpressing',
  'counter', 'direct', 'longball', 'catenaccio',
];

const IDENTITY_LABEL: Record<PlayStyle, string> = {
  balanced: 'Balanced',
  parkbus: 'Park the Bus',
  possession: 'Possession',
  'tiki-taka': 'Tiki-taka',
  gegenpressing: 'Gegenpressing',
  counter: 'Counter-attack',
  direct: 'Direct',
  longball: 'Long Ball',
  catenaccio: 'Catenaccio',
};

/** Equal-width option-pill row — Phase 0's `.fm-segmented` shared class,
 *  used across the Shape/Defence sub-screens for the mock's instruction rows. */
function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="fm-segmented">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          className={`fm-segmented__opt${value === o.id ? ' active' : ''}`}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** The 6 Tactics sub-screens from the design spec — Formation is the
 *  overview (pitch + squad/role list + the formation pickers this game
 *  already had); Shape/Defence/Attack/Set Pieces/Player Roles are dedicated
 *  screens reached via an in-page `.fm-subtab` row rather than new top-level
 *  nav entries (see PROGRESS.md "Phase 2" decision log). */
const TACTICS_SUB_TABS = [
  { id: 'formation', label: 'Formation' },
  { id: 'shape', label: 'Shape' },
  { id: 'defence', label: 'Defence' },
  { id: 'attack', label: 'Attack' },
  { id: 'setpieces', label: 'Set Pieces' },
  { id: 'roles', label: 'Player Roles' },
] as const;
type TacticsSubTab = (typeof TACTICS_SUB_TABS)[number]['id'];

export default function TacticsScreen({
  state,
  onChange,
}: {
  state: GameState;
  onChange: (next: GameState) => void;
}) {
  const [subTab, setSubTab] = useState<TacticsSubTab>('formation');
  const [previewShape, setPreviewShape] = useState<'ip' | 'oop'>('ip');

  // Custom formation builder (gap 24): seed the steppers from the current IP
  // formation's line split when it's already a custom one, else a sensible
  // 4-3-3 default.
  const currentIPParsed = parseCustomFormationId(state.dualFormation?.inPossessionId || state.formationId);
  const [customLines, setCustomLines] = useState<[number, number, number]>(currentIPParsed ?? [4, 3, 3]);

  const update = (patch: Partial<GameState>) => onChange({ ...state, ...patch });

  // Get current formations (legacy or dual)
  const currentIPFormation = state.dualFormation?.inPossessionId || state.formationId;
  const currentOOPFormation = state.dualFormation?.outOfPossessionId || state.formationId;

  const setIPFormation = (id: string) => {
    const f = getFormation(id);
    // Only update lineup if we're switching from legacy to dual mode
    const newLineup = state.dualFormation ? state.lineup : autoPickLineup(state, state.userClubId, f);
    update({
      dualFormation: {
        inPossessionId: id,
        outOfPossessionId: state.dualFormation?.outOfPossessionId || id,
      },
      lineup: newLineup,
      formationId: id, // legacy
    });
    pushToast(`In-possession formation set to ${getFormation(id).name}`, 'success');
  };

  const setOOPFormation = (id: string) => {
    update({
      dualFormation: {
        inPossessionId: state.dualFormation?.inPossessionId || state.formationId,
        outOfPossessionId: id,
      },
    });
    pushToast(`Out-of-possession formation set to ${getFormation(id).name}`, 'success');
  };

  /* --- Team identity ---------------------------------------------------- */
  const userClub = state.clubs.find((c) => c.id === state.userClubId)!;
  const currentStyle: PlayStyle = state.playStyle ?? userClub.playStyle ?? 'balanced';
  const level = getLeague(userClub.leagueId)?.level ?? 3;
  const coachMult = coachDrillMult(state);
  const xi = state.lineup
    .map((id) => (id == null ? null : state.players[id]))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  /* --- Set pieces ------------------------------------------------------- */
  const cornerTaker = setPieceTaker(xi, state.tactics, 'corner');
  const spThreat = setPieceXG(xi, state.tactics);

  const setSetPiece = (patch: Partial<NonNullable<typeof state.tactics.setPieces>>) => {
    update({ tactics: { ...state.tactics, setPieces: { ...state.tactics.setPieces, ...patch } } });
  };

  const setIdentity = (style: PlayStyle) => {
    if (style === currentStyle) return;
    // Carry familiarity across on the switch itself, so the number the card
    // quoted is the number the club actually lands on.
    //
    // tacFam has to be cloned, not spread: seedFamiliarityForSwitch mutates it,
    // and a shallow { ...club } would still share the same styles object with
    // the previous state — editing history rather than producing a new state.
    const clubs = state.clubs.map((c) =>
      c.id === state.userClubId
        ? {
            ...c,
            playStyle: style,
            tacFam: c.tacFam
              ? { ...c.tacFam, styles: { ...c.tacFam.styles }, formations: { ...c.tacFam.formations } }
              : c.tacFam,
          }
        : c,
    );
    const club = clubs.find((c) => c.id === state.userClubId)!;
    seedFamiliarityForSwitch(club, style);
    update({ playStyle: style, clubs });
    pushToast(`Team identity set to ${IDENTITY_LABEL[style]}`, 'success');
  };

  const setMentality = (mentality: MentalityId) => {
    update({ tactics: { ...state.tactics, mentality } });
    pushToast(`Mentality set to ${MENTALITIES[mentality].label}`, 'success');
  };

  const setStyle = (style: TacticStyle) => {
    update({ tactics: { ...state.tactics, style } });
    pushToast(`Tactic style set to ${style[0].toUpperCase()}${style.slice(1)}`, 'success');
  };

  const setPressing = (pressing: Pressing) => {
    update({ tactics: { ...state.tactics, pressing } });
  };

  const setTempo = (tempo: Tempo) => {
    update({ tactics: { ...state.tactics, tempo } });
  };

  const setWidth = (width: Width) => {
    update({ tactics: { ...state.tactics, width } });
  };

  /* The six instructions below are all read by `engine/tickEngine/xgModel.ts`
     (see its `t()` reducer and steps 3–3c) but had no UI at all until now —
     the player could not reach levers that were already moving their xG. */

  const setDefLine = (defLine: DefLine) => {
    update({ tactics: { ...state.tactics, defLine } });
  };

  const setTackling = (tackling: Tackling) => {
    update({ tactics: { ...state.tactics, tackling } });
  };

  const setFocus = (focus: AttackFocus) => {
    update({ tactics: { ...state.tactics, focus } });
  };

  const setBuildUp = (buildUp: BuildUp) => {
    update({ tactics: { ...state.tactics, buildUp } });
  };

  const setPassingStyle = (passingStyle: PassingStyle) => {
    update({ tactics: { ...state.tactics, passingStyle } });
  };

  const setRuns = (runs: RunStyle) => {
    update({ tactics: { ...state.tactics, runs } });
  };

  const previewFormation = getFormation(previewShape === 'ip' ? currentIPFormation : currentOOPFormation);

  // Defensive-line height on the Defence sub-screen's pitch, driven by the
  // real `defLine` instruction the xG chain reads (`LINE_ATK`, and the
  // through-ball/in-behind matchups that key off a high line).
  const defLine = state.tactics.defLine ?? 'normal';
  const defenceLineTop = defLine === 'high' ? 25 : defLine === 'deep' ? 75 : 50;

  const captain = state.captainId != null ? state.players[state.captainId] : null;
  // Leaders first, then by rating — the two things that actually decide who
  // gets the armband, so the top of the list is the obvious answer.
  const captainCandidates = getSquad(state, state.userClubId).sort((a, b) => {
    const la = traitNames(a).includes('Leader') ? 1 : 0;
    const lb = traitNames(b).includes('Leader') ? 1 : 0;
    return lb - la || b.rating - a.rating;
  });

  return (
    <div className="fm-panel fm-tactics">
      <div className="fm-subnav__tabs" role="tablist" aria-label="Tactics sections" style={{ marginBottom: 12 }} data-tour="tactics-tabs">
        {TACTICS_SUB_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={subTab === t.id}
            className={`fm-subtab${subTab === t.id ? ' active' : ''}`}
            onClick={() => setSubTab(t.id)}
          >
            <span className="fm-subtab__label">{t.label}</span>
          </button>
        ))}
      </div>

      {subTab === 'formation' && (
        <div role="tabpanel">
          <>
            {/* Gap 12 (Userbrain): "I picked Ultra Attacking but it still
                showed Balanced" — Ultra Attacking is a Mentality (below), and
                Balanced is the separate team Identity (Style tab). Both are
                real, both apply, but only one was visible from here. Show
                both together so a mentality change is never mistaken for a
                no-op on the identity label. */}
            <div className="fm-hint" style={{ textAlign: 'left', margin: '0 0 8px' }}>
              Identity: <b style={{ color: 'var(--text)' }}>{IDENTITY_LABEL[currentStyle]}</b>
              {' · '}
              Mentality: <b style={{ color: 'var(--text)' }}>{MENTALITIES[normalizeMentality(state.tactics.mentality)].label}</b>
            </div>
            <div className="fm-pills" style={{ marginBottom: 8 }}>
            <button className={`fm-pill${previewShape === 'ip' ? ' active' : ''}`} onClick={() => setPreviewShape('ip')}>
              In possession
            </button>
            <button className={`fm-pill${previewShape === 'oop' ? ' active' : ''}`} onClick={() => setPreviewShape('oop')}>
              Out of possession
            </button>
          </div>

          <div className="fm-split" style={{ '--split-ratio': '1.4fr 1fr' } as CSSProperties}>
            <div className="fm-pitch" style={{ marginBottom: 0 }}>
              <PitchMarkings />
              {previewFormation.slots.map((slot, i) => (
                <div key={i} className="fm-slot fm-slot--live filled" style={{ left: `${slot.x}%`, bottom: `${slot.y}%` }}>
                  <PlayerToken label={slot.label} pos={slot.pos} />
                </div>
              ))}
            </div>

            <div className="fm-mod">
              <div className="fm-mod__head"><h2 className="fm-mod__title">Squad · Role</h2></div>
              <div className="fm-player-list">
                {xi.length === 0 && <p className="fm-hint">Pick your XI on the Squad screen first.</p>}
                {xi.map((p) => (
                  <div key={p.id} className={`fm-player-row fm-pos-${p.pos}`}>
                    <span className="fm-player-row__badge">{p.pos}</span>
                    <span className="fm-player-row__name">
                      {p.name}
                      <span className="fm-player-row__sub">{p.role}</span>
                    </span>
                    <span />
                    <span className="fm-player-row__tag">
                      {p.tacticalRole ? getRole(p.tacticalRole)?.name ?? 'Balanced' : 'Balanced'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {(() => {
            // Gap 32: previewEffectiveXG against the actual next opponent, using
            // the same calcMatchXG chain a real match resolves with, so a
            // tactical tweak's effect is visible before it's ever played out.
            const fixture = nextUserFixture(state);
            if (!fixture) return null;
            const opponentId = fixture.homeId === state.userClubId ? fixture.awayId : fixture.homeId;
            const opponent = state.clubs.find((c) => c.id === opponentId);
            const xg = previewEffectiveXG(state, opponentId);
            return (
              <div className="fm-panel fm-panel--elevated" style={{ margin: '14px 0', padding: 10 }}>
                <p className="fm-label fm-label--sm" style={{ marginTop: 0 }}>
                  Projected xG vs {opponent?.name ?? 'next opponent'}
                </p>
                <div className="fm-xg-preview">
                  <span className="fm-xg-preview__you">You {xg.userXG.toFixed(2)}</span>
                  <span className="fm-xg-preview__sep">–</span>
                  <span className="fm-xg-preview__them">{xg.oppXG.toFixed(2)} Them</span>
                </div>
              </div>
            );
          })()}

          <div className="fm-tactics__section">
            <div className="fm-tactics__content">
              <div className="fm-tactics__formation-group" data-tour="tactics-formation">
                <label className="fm-label fm-label--sm">In Possession</label>
                <div className="fm-formation-grid">
                  {ALL_FORMATIONS.map((f) => (
                    <button
                      key={f.id}
                      className={`fm-formation-tile${currentIPFormation === f.id ? ' active' : ''}`}
                      onClick={() => setIPFormation(f.id)}
                    >
                      {f.id}
                    </button>
                  ))}
                </div>
              </div>

              <div className="fm-tactics__formation-group">
                <label className="fm-label fm-label--sm">Out of Possession</label>
                <div className="fm-formation-grid">
                  {ALL_FORMATIONS.map((f) => (
                    <button
                      key={f.id}
                      className={`fm-formation-tile${currentOOPFormation === f.id ? ' active' : ''}`}
                      onClick={() => setOOPFormation(f.id)}
                    >
                      {f.id}
                    </button>
                  ))}
                </div>
                <p className="fm-hint">Used only while defending.</p>
              </div>

              <div className="fm-tactics__formation-group">
                <label className="fm-label fm-label--sm">Custom Formation</label>
                <p className="fm-hint">
                  Build any def-mid-fwd split (must total 10 outfield players) and set it as your
                  in-possession shape.
                </p>
                <div className="fm-custom-formation">
                  {(['DEF', 'MID', 'FWD'] as const).map((label, i) => (
                    <div key={label} className="fm-custom-formation__stepper">
                      <span className="fm-custom-formation__label">{label}</span>
                      <button
                        className="fm-btn fm-btn--ghost fm-btn--sm"
                        onClick={() => setCustomLines((lines) => {
                          const next = [...lines] as [number, number, number];
                          next[i] = Math.max(1, next[i] - 1);
                          return next;
                        })}
                      >
                        −
                      </button>
                      <span className="fm-custom-formation__count">{customLines[i]}</span>
                      <button
                        className="fm-btn fm-btn--ghost fm-btn--sm"
                        onClick={() => setCustomLines((lines) => {
                          const next = [...lines] as [number, number, number];
                          next[i] = Math.min(8, next[i] + 1);
                          return next;
                        })}
                      >
                        +
                      </button>
                    </div>
                  ))}
                </div>
                {(() => {
                  const total = customLines.reduce((a, b) => a + b, 0);
                  const valid = total === 10;
                  return (
                    <>
                      <p className="fm-hint">
                        {customLines.join('-')} — {total} outfield players
                        {valid ? '' : ` (needs 10, not ${total})`}
                      </p>
                      <button
                        className="fm-btn fm-btn--primary"
                        disabled={!valid}
                        onClick={() => setIPFormation(buildCustomFormation(...customLines).id)}
                      >
                        Set as In-Possession Shape
                      </button>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
          </>
        </div>
      )}

      {subTab === 'shape' && (
        <div role="tabpanel">
          <div className="fm-tactics__content">
          <p className="fm-label fm-label--sm" style={{ marginTop: 0 }}>Mentality</p>
          <div className="fm-mentality-row">
            {MENTALITY_ORDER.map((m) => (
              <button
                key={m}
                className={`fm-mentality-card${normalizeMentality(state.tactics.mentality) === m ? ' active' : ''}`}
                onClick={() => setMentality(m)}
              >
                {MENTALITIES[m].short}
              </button>
            ))}
          </div>
          <p className="fm-hint">Sets the default match mentality — you can change it live from the touchline.</p>

          <p className="fm-label fm-label--sm" style={{ marginTop: 16 }}>Approach</p>
          <Segmented
            options={(['defensive', 'balanced', 'attacking'] as TacticStyle[]).map((s) => ({ id: s, label: s[0].toUpperCase() + s.slice(1) }))}
            value={state.tactics.style}
            onChange={setStyle}
          />

          <p className="fm-label fm-label--sm" style={{ marginTop: 16 }}>Passing Tempo</p>
          <Segmented
            options={(['slow', 'normal', 'fast'] as Tempo[]).map((t) => ({ id: t, label: t[0].toUpperCase() + t.slice(1) }))}
            value={state.tactics.tempo}
            onChange={setTempo}
          />

          <p className="fm-label fm-label--sm" style={{ marginTop: 16 }}>Width</p>
          <Segmented
            options={(['narrow', 'standard', 'wide'] as Width[]).map((w) => ({ id: w, label: w[0].toUpperCase() + w.slice(1) }))}
            value={state.tactics.width}
            onChange={setWidth}
          />
          </div>
        </div>
      )}

      {subTab === 'defence' && (
        <div role="tabpanel">
          <div className="fm-split" style={{ '--split-ratio': '1fr 1.4fr' } as CSSProperties}>
          <div className="fm-pitch" style={{ height: 220, marginBottom: 0 }}>
            <PitchMarkings />
            <div
              style={{
                position: 'absolute', left: '8%', right: '8%', top: `${defenceLineTop}%`,
                height: 3, background: 'var(--gold)', borderRadius: 2,
              }}
            />
            <span
              style={{
                position: 'absolute', left: 8, top: `${defenceLineTop + 2}%`,
                fontSize: 9, fontWeight: 800, color: 'var(--gold)', letterSpacing: 0.5,
              }}
            >
              DEFENSIVE LINE
            </span>
          </div>

          <div className="fm-mod">
            <div className="fm-mod__head"><h2 className="fm-mod__title">Team Instructions</h2></div>
            <p className="fm-label fm-label--sm" style={{ marginTop: 0 }}>Pressing</p>
            <Segmented
              options={(['low', 'mid', 'high'] as Pressing[]).map((p) => ({
                id: p, label: p === 'low' ? 'Low block' : p === 'mid' ? 'Standard' : 'High press',
              }))}
              value={state.tactics.pressing}
              onChange={setPressing}
            />
            <p className="fm-hint">
              How hard you hunt the ball back. Pressing high only pays off if the XI has the
              engine for it — the chain gates its boost on your pressing fit.
            </p>

            <p className="fm-label fm-label--sm" style={{ marginTop: 16 }}>Defensive Line</p>
            <Segmented
              options={(['deep', 'normal', 'high'] as DefLine[]).map((d) => ({
                id: d, label: d === 'deep' ? 'Deep' : d === 'normal' ? 'Standard' : 'High',
              }))}
              value={defLine}
              onChange={setDefLine}
            />
            <p className="fm-hint">
              A high line squeezes the pitch and lifts your own attack, but hands the opponent
              more from through-balls and runners in behind. Separate from pressing.
            </p>

            <p className="fm-label fm-label--sm" style={{ marginTop: 16 }}>Tackling</p>
            <Segmented
              options={(['cautious', 'normal', 'aggressive'] as Tackling[]).map((t) => ({
                id: t, label: t[0].toUpperCase() + t.slice(1),
              }))}
              value={state.tactics.tackling ?? 'normal'}
              onChange={setTackling}
            />
            <p className="fm-hint">
              Aggressive challenges win the ball back more often and add to your attacking
              output — at roughly half again the fouls, and the cards that come with them.
            </p>

            <p className="fm-label fm-label--sm" style={{ marginTop: 16 }}>Defending Corners</p>
            <Segmented
              options={(['zonal', 'mixed', 'man'] as CornerDefense[]).map((d) => ({ id: d, label: d[0].toUpperCase() + d.slice(1) }))}
              value={state.tactics.setPieces?.cornerDefense ?? 'mixed'}
              onChange={(d) => setSetPiece({ cornerDefense: d })}
            />
            <p className="fm-hint">
              Zonal concedes least from the delivery itself; man-marking concedes most but leaves
              you better placed for the second ball.
            </p>
          </div>
          </div>
        </div>
      )}

      {subTab === 'attack' && (
        <div role="tabpanel">
          <div className="fm-tactics__content">
          <p className="fm-label fm-label--sm" style={{ marginTop: 0 }}>Attacking Focus</p>
          <Segmented
            options={(['flanks', 'mixed', 'middle'] as AttackFocus[]).map((f) => ({
              id: f, label: f === 'flanks' ? 'Flanks' : f === 'mixed' ? 'Mixed' : 'Middle',
            }))}
            value={state.tactics.focus ?? 'mixed'}
            onChange={setFocus}
          />
          <p className="fm-hint">
            Which channel you attack through, scored against the opponent&apos;s width rather than
            as a flat bonus — going down the flanks pays best against a narrow side.
          </p>

          <p className="fm-label fm-label--sm" style={{ marginTop: 16 }}>Build-up</p>
          <Segmented
            options={(['play-out', 'balanced', 'long'] as BuildUp[]).map((bu) => ({
              id: bu, label: bu === 'play-out' ? 'Play out' : bu === 'balanced' ? 'Balanced' : 'Direct',
            }))}
            value={state.tactics.buildUp ?? 'balanced'}
            onChange={setBuildUp}
          />
          <p className="fm-hint">
            Playing out from the back against a high press is the highest-risk, highest-reward
            option in the chain — it is gated on the passing ability of the XI asked to do it.
          </p>

          <p className="fm-label fm-label--sm" style={{ marginTop: 16 }}>Passing</p>
          <Segmented
            options={(['short', 'mixed', 'through-balls'] as PassingStyle[]).map((ps) => ({
              id: ps, label: ps === 'short' ? 'Short' : ps === 'mixed' ? 'Mixed' : 'Through balls',
            }))}
            value={state.tactics.passingStyle ?? 'mixed'}
            onChange={setPassingStyle}
          />
          <p className="fm-hint">
            Through balls scale with your passers and cut open a high line; short passing is the
            safe, slightly lower-output choice.
          </p>

          <p className="fm-label fm-label--sm" style={{ marginTop: 16 }}>Forward Runs</p>
          <Segmented
            options={(['into-feet', 'balanced', 'in-behind'] as RunStyle[]).map((r) => ({
              id: r, label: r === 'into-feet' ? 'Into feet' : r === 'balanced' ? 'Balanced' : 'In behind',
            }))}
            value={state.tactics.runs ?? 'balanced'}
            onChange={setRuns}
          />
          <p className="fm-hint">
            Running in behind needs pace up front and feasts on a high line, and shifts your
            chances toward one-on-ones; into feet trades those for shots around the box.
          </p>

          <p className="fm-label fm-label--sm" style={{ marginTop: 20 }}>Team Identity</p>
          <p className="fm-hint" style={{ marginTop: 0 }}>
            The named style your squad is drilled in. It sits above the instructions above —
            those are per-match levers, this is what the club practises week to week.
          </p>
          <div className="fm-identity-grid">
            {IDENTITY_ORDER.map((id) => {
              const active = currentStyle === id;
              const fam = active
                ? styleFamiliarity(userClub, id)
                : projectedFamiliarity(userClub, id);
              const weeks = weeksToDrill(userClub, id, 80, coachMult);
              // How well the squad could execute it if fully drilled — the
              // ability half of the gate, shown separately so a player can
              // tell "wrong squad" apart from "needs more time".
              const fit = Math.round(
                styleExec(userClub, xi, id, level, undefined, { rawSkill: true }) * 100,
              );
              return (
                <button
                  key={id}
                  className={`fm-identity-card${active ? ' active' : ''}`}
                  onClick={() => setIdentity(id)}
                >
                  <span className="fm-identity-card__name">{IDENTITY_LABEL[id]}</span>
                  <span className="fm-identity-card__bar" aria-hidden>
                    <span
                      className="fm-identity-card__fill"
                      style={{ width: `${Math.round(fam)}%` }}
                    />
                  </span>
                  <span className="fm-identity-card__meta">
                    {active
                      ? `${Math.round(fam)}% drilled`
                      : weeks === 0
                        ? 'ready now'
                        : `${Math.round(fam)}% · ${weeks}w to drill`}
                  </span>
                  <span
                    className={`fm-identity-card__fit${fit >= 75 ? ' good' : fit >= 55 ? ' ok' : ' poor'}`}
                  >
                    squad fit {fit}%
                  </span>
                </button>
              );
            })}
          </div>
          <p className="fm-hint">
            {needsDrilling(currentStyle)
              ? `Your side is ${Math.round(styleFamiliarity(userClub, currentStyle))}% drilled in ${IDENTITY_LABEL[currentStyle]}. Familiarity builds each week and decays on styles you stop using — switching to a related style carries most of the work across.`
              : 'Balanced and Park the Bus need no drilling. Any other identity has to be worked on before it pays off.'}
          </p>
          </div>
        </div>
      )}

      {subTab === 'setpieces' && (
        <div role="tabpanel">
          <div className="fm-split" style={{ '--split-ratio': '1fr 1.4fr' } as CSSProperties}>
          <div className="fm-pitch" style={{ height: 280, marginBottom: 0 }}>
            <PitchMarkings />
            {[
              { label: 'CK', top: 16, left: 6, name: cornerTaker?.name },
              { label: 'FK', top: 46, left: 50, name: setPieceTaker(xi, state.tactics, 'fkShoot')?.name },
              { label: 'PK', top: 82, left: 50, name: setPieceTaker(xi, state.tactics, 'penalty')?.name },
            ].map((m) => (
              <div
                key={m.label}
                className="fm-slot fm-slot--live filled"
                style={{ top: `${m.top}%`, left: `${m.left}%`, transform: 'translate(-50%,-50%)' }}
              >
                <span className="fm-slot__chip">{m.label}</span>
                <span className="fm-slot__name">{m.name ?? '—'}</span>
              </div>
            ))}
          </div>

          <div className="fm-mod">
            <div className="fm-mod__head"><h2 className="fm-mod__title">Set Pieces</h2></div>
            <div className="fm-sp-label">Corner routine</div>
            <div className="fm-pills">
              {(Object.keys(CORNER_ROUTINES) as CornerRoutine[]).map((r) => (
                <button
                  key={r}
                  className={`fm-pill${cornerRoutineOf(state.tactics) === r ? ' active' : ''}`}
                  onClick={() => setSetPiece({ cornerRoutine: r })}
                >
                  {ROUTINE_LABEL[r]}
                </button>
              ))}
            </div>
            <p className="fm-hint">
              Currently worth <strong>{spThreat.toFixed(2)}×</strong> on a corner — delivery from{' '}
              {cornerTaker?.name ?? 'nobody'} against the aerial threat of the men you send up.
              Short routines ignore height; far-post leans on it entirely.
            </p>

            <div className="fm-sp-label">Takers</div>
            <div className="fm-sp-takers">
              {SP_ROLES.map(({ job, label, stat }) => {
                const current = setPieceTaker(xi, state.tactics, job);
                return (
                  <label key={job} className="fm-sp-taker">
                    <span className="fm-sp-taker__role">{label}</span>
                    <select
                      className="fm-sp-taker__select"
                      value={current?.id ?? ''}
                      onChange={(e) => setSetPiece({ [SP_FIELD[job]]: Number(e.target.value) })}
                    >
                      {[...xi]
                        .sort((a, b) => b[stat] - a[stat])
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p[stat]})
                          </option>
                        ))}
                    </select>
                  </label>
                );
              })}
            </div>
            <p className="fm-hint">
              Defaults pick the best man on the pitch for each job. Anyone you name here takes it
              instead, as long as he is in the XI.
            </p>
          </div>
          </div>
        </div>
      )}

      {subTab === 'roles' && (
        <div role="tabpanel">
          <div className="fm-rolecard-grid">
          <div className="fm-rolecard">
            <div className="fm-icon-tile fm-icon-tile--lg" style={{ '--tile-tint': 'var(--gold)' } as CSSProperties}>
              <Icon name="star" size={22} />
            </div>
            <div>
              <div className="fm-rolecard__label">Captain</div>
              {/* The armband used to be appointed on the Identity screen,
                  which no longer exists. It is a team-sheet decision, so it
                  belongs on the team sheet — and it is now editable here
                  rather than a read-only line pointing somewhere else. */}
              <select
                className="fm-sp-taker__select"
                aria-label="Club captain"
                value={state.captainId ?? ''}
                onChange={(e) => onChange(setCaptain(state, e.target.value === '' ? null : Number(e.target.value)))}
              >
                <option value="">Not appointed</option>
                {captainCandidates.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}{traitNames(p).includes('Leader') ? ' ★' : ''} · {p.pos}
                  </option>
                ))}
              </select>
              <div className="fm-rolecard__sub">
                {captain ? `${captain.pos} · wears the armband` : 'A Leader (★) steadies the dressing room'}
              </div>
            </div>
          </div>
          {SP_ROLES.map(({ job, label, stat, icon }) => {
            const taker = setPieceTaker(xi, state.tactics, job);
            return (
              <div key={job} className="fm-rolecard">
                <div className="fm-icon-tile fm-icon-tile--lg" style={{ '--tile-tint': 'var(--green)' } as CSSProperties}>
                  <Icon name={icon} size={22} />
                </div>
                <div>
                  <div className="fm-rolecard__label">{label}</div>
                  <div className="fm-rolecard__name">{taker?.name ?? 'Nobody'}</div>
                  <div className="fm-rolecard__sub">{taker ? `${taker.pos} · ${taker[stat]} ${stat.toUpperCase()}` : 'Set on the Set Pieces tab'}</div>
                </div>
              </div>
            );
          })}
          <p className="fm-hint" style={{ gridColumn: '1 / -1' }}>
            Dead-ball takers are set on the Set Pieces tab above — those four cards are a read-only
            summary of it.
          </p>
          </div>
        </div>
      )}
    </div>
  );
}
