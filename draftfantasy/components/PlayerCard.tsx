import type { Player } from '../engine/types';

interface PlayerCardProps {
  player: Player;
  disabled: boolean;
  picked: boolean;
  onPick: (player: Player) => void;
}

export function PlayerCard({ player, disabled, picked, onPick }: PlayerCardProps) {
  const elite = player.rating >= 88;
  return (
    <button
      type="button"
      className={`pc-player-row pc-pos-${player.position.toLowerCase()}${
        picked ? ' pc-player-row--picked' : ''
      }`}
      disabled={disabled || picked}
      onClick={() => onPick(player)}
    >
      <span className="pc-player-row__badge">{player.position}</span>
      <span className="pc-player-row__info">
        <span className="pc-player-row__name">{player.name}</span>
        <span className="pc-player-row__sub">
          {picked ? 'In your XI' : disabled ? 'Slot full' : 'Available'}
        </span>
      </span>
      <span className={`pc-player-row__rating${elite ? ' pc-player-row__rating--elite' : ''}`}>
        {player.rating}
      </span>
    </button>
  );
}
