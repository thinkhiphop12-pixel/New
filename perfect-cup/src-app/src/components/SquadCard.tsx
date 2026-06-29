import type { Squad } from '../engine/types';

interface SquadCardProps {
  squad: Squad;
}

const TIER_LABEL: Record<Squad['tier'], string> = {
  legendary: 'Legendary',
  strong: 'Strong',
  medium: 'Medium',
  weak: 'Underdog',
};

export function SquadCard({ squad }: SquadCardProps) {
  return (
    <div className={`pc-squad-card pc-tier-${squad.tier}`}>
      <div className="pc-squad-card__flag">{squad.flag}</div>
      <div className="pc-squad-card__info">
        <div className="pc-squad-card__name">
          {squad.countryName} <span className="pc-squad-card__year">{squad.tournamentYear}</span>
        </div>
        <div className="pc-squad-card__meta">
          <span className={`pc-tier-badge pc-tier-${squad.tier}`}>{TIER_LABEL[squad.tier]}</span>
          <span className="pc-squad-card__strength">OVR {squad.strength}</span>
        </div>
      </div>
    </div>
  );
}
