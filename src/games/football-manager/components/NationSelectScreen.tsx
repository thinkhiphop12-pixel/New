'use client';

import type { Division } from '@/engine/types';
import { DIVISION_NAMES } from '@/engine/gameRules';

interface Nation {
  id: string;
  name: string;
  flag: string;
  divisions: Division[];
  description: string;
}

const NATIONS: Nation[] = [
  {
    id: 'england',
    name: 'England',
    flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    divisions: [1, 2, 3, 4],
    description: 'The English pyramid: Premier League, Championship, League One, League Two',
  },
  {
    id: 'spain',
    name: 'Spain',
    flag: '🇪🇸',
    divisions: [5],
    description: 'La Liga — Spain\'s top division with world-class technical talent',
  },
  {
    id: 'italy',
    name: 'Italy',
    flag: '🇮🇹',
    divisions: [6],
    description: 'Serie A — Italian elite football with tactical depth',
  },
  {
    id: 'germany',
    name: 'Germany',
    flag: '🇩🇪',
    divisions: [7],
    description: 'Bundesliga — High pressing, passionate crowds, and fierce competition',
  },
  {
    id: 'france',
    name: 'France',
    flag: '🇫🇷',
    divisions: [8],
    description: 'Ligue 1 — French football with emerging superstars and intensity',
  },
  {
    id: 'netherlands',
    name: 'Netherlands',
    flag: '🇳🇱',
    divisions: [9],
    description: 'Eredivisie — Attacking football and a famous youth conveyor belt',
  },
  {
    id: 'portugal',
    name: 'Portugal',
    flag: '🇵🇹',
    divisions: [10],
    description: 'Primeira Liga — Technical quality and Europe\'s best scouting network',
  },
];

export default function NationSelectScreen({
  onPick,
  onBack,
}: {
  onPick: (divisions: Division[]) => void;
  onBack: () => void;
}) {
  return (
    <div className="fm-screen">
      <p className="fm-label" style={{ textAlign: 'center', marginBottom: 20 }}>
        Choose your nation
      </p>
      <div className="fm-nation-grid">
        {NATIONS.map((nation) => (
          <button
            key={nation.id}
            className="fm-nation-card"
            onClick={() => onPick(nation.divisions)}
          >
            <span className="fm-nation-card__flag">{nation.flag}</span>
            <span className="fm-nation-card__name">{nation.name}</span>
            <span className="fm-nation-card__divisions">
              {nation.divisions.map((d) => DIVISION_NAMES[d]).join(', ')}
            </span>
            <p className="fm-nation-card__desc">{nation.description}</p>
          </button>
        ))}
      </div>
      <div className="fm-actions">
        <button className="fm-btn fm-btn--ghost" onClick={onBack}>
          Back
        </button>
      </div>
    </div>
  );
}
