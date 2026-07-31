'use client';

import { COUNTRIES, LEAGUES, SIMULATED_LEAGUE_IDS, leagueName, pyramidOf } from '@/engine/gameRules';

const FLAGS: Record<string, string> = {
  England: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}',
  Spain: '🇪🇸', Italy: '🇮🇹', Germany: '🇩🇪', France: '🇫🇷',
  Netherlands: '🇳🇱', Portugal: '🇵🇹', Scotland: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}',
};

/** One card per country that has at least one league the game simulates. */
const NATIONS = COUNTRIES.map((country) => ({
  id: country.toLowerCase(),
  name: country,
  flag: FLAGS[country] ?? '—',
  leagueIds: pyramidOf(country).filter((l) => !l.phantom).map((l) => l.id),
})).filter((n) => n.leagueIds.length > 0);

void LEAGUES;
void SIMULATED_LEAGUE_IDS;

export default function NationSelectScreen({
  onPick,
  onBack,
}: {
  onPick: (leagueIds: string[]) => void;
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
            onClick={() => onPick(nation.leagueIds)}
          >
            <span className="fm-nation-card__flag">{nation.flag}</span>
            <span className="fm-nation-card__name">{nation.name}</span>
            <span className="fm-nation-card__divisions">
              {nation.leagueIds.map((id) => leagueName(id)).join(', ')}
            </span>
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
