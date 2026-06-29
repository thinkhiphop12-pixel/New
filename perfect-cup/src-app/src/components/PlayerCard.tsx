import type { Player } from '../engine/types';

interface PlayerCardProps {
  player: Player;
  disabled: boolean;
  picked: boolean;
  onPick: (player: Player) => void;
}

const POSITION_LABEL: Record<Player['position'], string> = {
  GK: 'GK',
  DEF: 'DEF',
  MID: 'MID',
  FWD: 'FWD',
};

export function PlayerCard({ player, disabled, picked, onPick }: PlayerCardProps) {
  return (
    <button
      type="button"
      className={`pc-player-card pc-pos-${player.position.toLowerCase()}${picked ? ' pc-player-card--picked' : ''}`}
      disabled={disabled || picked}
      onClick={() => onPick(player)}
    >
      <span className="pc-player-card__pos">{POSITION_LABEL[player.position]}</span>
      <span className="pc-player-card__name">{player.name}</span>
      <span className="pc-player-card__rating">{player.rating}</span>
    </button>
  );
}
