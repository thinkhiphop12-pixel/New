import { useState } from 'react';
import { canPickPlayer, draftStrength, isXiComplete } from '../engine/draft';
import type { DraftPick, DraftState, Player, Position } from '../engine/types';
import { PlayerCard } from './PlayerCard';

interface DraftScreenProps {
  state: DraftState;
  poolLabel: string;
  canSwapEdition: boolean;
  canSwapSquad: boolean;
  onSpin: () => void;
  onSwapEdition: () => void;
  onSwapSquad: () => void;
  onPick: (player: Player) => void;
  onContinue: () => void;
}

/** The five XI slots, in display order. */
const SLOT_POSITIONS: Position[] = ['GK', 'DEF', 'MID', 'MID', 'FWD'];

const TIER_LABEL: Record<string, string> = {
  legendary: 'Legendary',
  strong: 'Strong',
  medium: 'Medium',
  weak: 'Underdog',
};

function lineupSlots(state: DraftState): { pos: Position; pick?: DraftPick }[] {
  const used: Record<Position, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
  return SLOT_POSITIONS.map((pos) => {
    const picksOfPos = state.picks.filter((p) => p.player.position === pos);
    const pick = picksOfPos[used[pos]];
    used[pos] += 1;
    return { pos, pick };
  });
}

export function DraftScreen({
  state,
  poolLabel,
  canSwapEdition,
  canSwapSquad,
  onSpin,
  onSwapEdition,
  onSwapSquad,
  onPick,
  onContinue,
}: DraftScreenProps) {
  const [revealing, setRevealing] = useState(false);
  const complete = isXiComplete(state);
  const squad = state.currentSquad;
  const spinNumber = Math.min(state.picks.length + 1, 5);
  const slots = lineupSlots(state);

  function withSpinner(action: () => void, delay: number) {
    if (revealing) return;
    setRevealing(true);
    window.setTimeout(() => {
      action();
      setRevealing(false);
    }, delay);
  }

  return (
    <div className="pc-screen pc-draft">
      <div className="pc-draft__topbar">
        <span className="pc-wordmark">
          PERFECT <span className="pc-wordmark__accent">CUP</span>
        </span>
        <span className="pc-draft__pool">{poolLabel}</span>
      </div>

      <div className="pc-lineup-head">
        <span>YOUR XI</span>
        <span>{complete ? 'Five complete' : `Pick ${spinNumber} of 5`}</span>
      </div>

      <div className="pc-lineup">
        {slots.map(({ pos, pick }, i) => (
          <div key={i} className={`pc-slot${pick ? ' pc-slot--filled' : ''}`}>
            <span className="pc-slot__pos">{pos}</span>
            {pick ? (
              <>
                <span className="pc-slot__flag">{pick.squadLabel.split(' ')[0]}</span>
                <span className="pc-slot__name">{pick.player.name}</span>
                <span className="pc-slot__rating">{pick.player.rating}</span>
              </>
            ) : (
              <span className="pc-slot__open">Open</span>
            )}
          </div>
        ))}
      </div>

      {revealing && (
        <div className="pc-draft__spinner">
          <div className="pc-spinner" />
          <p>Spinning the globe&hellip;</p>
        </div>
      )}

      {!revealing && complete && (
        <div className="pc-draft__complete">
          <p>Your five are locked in.</p>
          <button
            type="button"
            className="pc-btn pc-btn--primary pc-btn--large"
            onClick={onContinue}
          >
            Simulate the run
          </button>
        </div>
      )}

      {!revealing && !complete && !squad && (
        <div className="pc-draft__call-to-spin">
          <button
            type="button"
            className="pc-btn pc-btn--primary pc-btn--large"
            onClick={() => {
              withSpinner(onSpin, 550);
            }}
          >
            {state.picks.length === 0 ? 'Spin for a squad' : 'Spin for the next squad'}
          </button>
          <span className="pc-draft__lock-hint">
            Reveal a random World Cup squad, then draft one player from it.
          </span>
        </div>
      )}

      {!revealing && !complete && squad && (
        <>
          <div className="pc-squad-panel">
            <div className="pc-squad-panel__head">
              <span className="pc-spin-pill">● Spin {spinNumber} of 5</span>
              <span className="pc-squad-panel__label">YOUR SQUAD</span>
            </div>
            <div className="pc-squad-panel__main">
              <span className="pc-squad-panel__flag">{squad.flag}</span>
              <div>
                <div className="pc-squad-panel__name">{squad.countryName}</div>
                <div className="pc-squad-panel__meta">
                  <span className="pc-squad-panel__year">{squad.tournamentYear}</span>
                  <span className="pc-dot">·</span>
                  <span>{TIER_LABEL[squad.tier]}</span>
                </div>
              </div>
            </div>
            <div className="pc-strength">
              <div className="pc-strength__row">
                <span>Squad strength</span>
                <span className="pc-strength__value">{squad.strength}</span>
              </div>
              <div className="pc-strength__track">
                <div
                  className="pc-strength__fill"
                  style={{ width: `${Math.round(squad.strengthPct * 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="pc-reroll-grid">
            <button
              type="button"
              className="pc-reroll"
              onClick={() => {
                withSpinner(onSwapEdition, 400);
              }}
              disabled={!canSwapEdition}
            >
              <span className="pc-reroll__label">
                ↻ Lineage reroll {canSwapEdition ? '' : '· none'}
              </span>
              <span className="pc-reroll__desc">Try another {squad.countryName} squad</span>
            </button>
            <button
              type="button"
              className="pc-reroll"
              onClick={() => {
                withSpinner(onSwapSquad, 400);
              }}
              disabled={!canSwapSquad}
            >
              <span className="pc-reroll__label">
                ⇄ Year reroll {canSwapSquad ? '' : '· none'}
              </span>
              <span className="pc-reroll__desc">Try another {squad.tournamentYear} squad</span>
            </button>
          </div>

          <div className="pc-pick-head">
            <span>PICK A PLAYER</span>
            <span className="pc-pick-head__count">{squad.players.length} in squad</span>
          </div>

          <div className="pc-player-list">
            {squad.players.map((player) => (
              <PlayerCard
                key={player.id}
                player={player}
                picked={state.picks.some((p) => p.player.id === player.id)}
                disabled={!canPickPlayer(state, player)}
                onPick={onPick}
              />
            ))}
          </div>
        </>
      )}

      {!complete && (
        <div className="pc-draft__footer-hud">
          <span>Avg strength {draftStrength(state) || '—'}</span>
        </div>
      )}
    </div>
  );
}
