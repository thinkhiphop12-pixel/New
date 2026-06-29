import { useEffect, useState } from 'react';
import { canPickPlayer, canReroll, countByPosition, draftStrength, isXiComplete } from '../engine/draft';
import type { DraftState, Player, Position } from '../engine/types';
import { XI_REQUIREMENTS } from '../engine/types';
import { PlayerCard } from './PlayerCard';
import { SquadCard } from './SquadCard';

interface DraftScreenProps {
  state: DraftState;
  onSpin: () => void;
  onReroll: () => void;
  onPick: (player: Player) => void;
  onContinue: () => void;
}

const POSITIONS: Position[] = ['GK', 'DEF', 'MID', 'FWD'];

export function DraftScreen({ state, onSpin, onReroll, onPick, onContinue }: DraftScreenProps) {
  const [revealing, setRevealing] = useState(false);
  const complete = isXiComplete(state);
  const locked = state.picks.length > 0;

  function spin() {
    if (revealing) return;
    setRevealing(true);
    window.setTimeout(() => {
      onSpin();
      setRevealing(false);
    }, 550);
  }

  function reroll() {
    if (revealing || !canReroll(state)) return;
    setRevealing(true);
    window.setTimeout(() => {
      onReroll();
      setRevealing(false);
    }, 400);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== '?') return;
      if (!state.currentSquad) spin();
      else if (canReroll(state)) reroll();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentSquad, state.rerollsLeft, revealing]);

  return (
    <div className="pc-screen pc-draft">
      <div className="pc-draft__hud">
        <div className="pc-hud__item">
          <span className="pc-hud__label">Picks</span>
          <span className="pc-hud__value">{state.picks.length}/11</span>
        </div>
        <div className="pc-hud__item">
          <span className="pc-hud__label">Strength</span>
          <span className="pc-hud__value">{draftStrength(state) || '—'}</span>
        </div>
        <div className="pc-hud__item">
          <span className="pc-hud__label">Rerolls</span>
          <span className="pc-hud__value">{state.rerollsLeft}</span>
        </div>
      </div>

      <div className="pc-draft__positions">
        {POSITIONS.map((pos) => (
          <div
            key={pos}
            className={`pc-position-slot${
              countByPosition(state, pos) >= XI_REQUIREMENTS[pos] ? ' pc-position-slot--full' : ''
            }`}
          >
            <span className="pc-position-slot__label">{pos}</span>
            <span className="pc-position-slot__count">
              {countByPosition(state, pos)}/{XI_REQUIREMENTS[pos]}
            </span>
          </div>
        ))}
      </div>

      {revealing && (
        <div className="pc-draft__spinner">
          <div className="pc-spinner" />
          <p>Spinning the globe&hellip;</p>
        </div>
      )}

      {!revealing && !state.currentSquad && (
        <div className="pc-draft__call-to-spin">
          <button type="button" className="pc-btn pc-btn--primary pc-btn--large" onClick={spin}>
            Spin for a Squad
          </button>
        </div>
      )}

      {!revealing && state.currentSquad && (
        <div className="pc-draft__squad">
          <SquadCard squad={state.currentSquad} />

          {!locked && (
            <div className="pc-draft__squad-actions">
              <button
                type="button"
                className="pc-btn pc-btn--secondary"
                onClick={reroll}
                disabled={!canReroll(state)}
              >
                Reroll ({state.rerollsLeft} left)
              </button>
              <span className="pc-draft__lock-hint">Picking a player locks in this squad.</span>
            </div>
          )}

          {complete ? (
            <div className="pc-draft__complete">
              <p>Your XI is locked in.</p>
              <button
                type="button"
                className="pc-btn pc-btn--primary pc-btn--large"
                onClick={onContinue}
              >
                Simulate the Cup
              </button>
            </div>
          ) : (
            <div className="pc-player-grid">
              {state.currentSquad.players.map((player) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  picked={state.picks.some((p) => p.player.id === player.id)}
                  disabled={!canPickPlayer(state, player)}
                  onPick={onPick}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
