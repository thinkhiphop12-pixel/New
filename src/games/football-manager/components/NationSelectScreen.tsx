'use client';

import { COUNTRIES, LEAGUES, SIMULATED_LEAGUE_IDS, leagueName, pyramidOf } from '@/engine/gameRules';

const FLAGS: Record<string, string> = {
  England: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}',
  Spain: '🇪🇸', Italy: '🇮🇹', Germany: '🇩🇪', France: '🇫🇷',
  Netherlands: '🇳🇱', Portugal: '🇵🇹', Scotland: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}',
  Belgium: '🇧🇪', 'United States': '🇺🇸', Denmark: '🇩🇰',
  Argentina: '🇦🇷', Turkey: '🇹🇷', 'Saudi Arabia': '🇸🇦', China: '🇨🇳',
  'South Korea': '🇰🇷', Poland: '🇵🇱', Romania: '🇷🇴', Norway: '🇳🇴',
  Sweden: '🇸🇪', Switzerland: '🇨🇭', Austria: '🇦🇹', Australia: '🇦🇺',
  India: '🇮🇳', Ireland: '🇮🇪',
};

const BLURBS: Record<string, string> = {
  England: 'A five-tier pyramid — Premier League down to the National League',
  Spain: 'La Liga — technical talent, release clauses and El Clasico',
  Italy: 'Serie A — tactical chess and the Scudetto',
  Germany: 'Bundesliga — high pressing, huge crowds, and the Relegationsspiele',
  France: 'Ligue 1 — emerging superstars, and the barrage for the last place up',
  Netherlands: 'Eredivisie — attacking football and a famous youth conveyor belt',
  Portugal: 'Primeira Liga — technical quality and Europe\'s best scouting network',
  Scotland: 'Premiership — three rounds, then the genuine top-six split',
  Belgium: 'Pro League — a proven talent factory punching above its size',
  'United States': 'MLS — a growing league mixing homegrown talent and stars',
  Denmark: 'Superliga — well-drilled sides and a strong export pipeline',
  Argentina: 'Liga Profesional — passionate crowds and relentless attacking football',
  Turkey: 'Süper Lig — big-spending giants and fierce Istanbul derbies',
  'Saudi Arabia': 'Saudi Pro League — huge wages luring stars from Europe',
  China: 'Chinese Super League — a huge market still finding its feet',
  'South Korea': 'K League 1 — disciplined, physical, technically sharp',
  Poland: 'Ekstraklasa — a competitive mid-table scrap every season',
  Romania: 'Superliga — a talent pipeline into Western Europe',
  Norway: 'Eliteserien — a short season and a famous scouting network',
  Sweden: 'Allsvenskan — homegrown talent and a summer calendar',
  Switzerland: 'Swiss Super League — tidy football and shrewd transfer business',
  Austria: 'Austrian Bundesliga — a compact top flight punching above its weight',
  Australia: 'A-League Men — a growing league mixing local and import talent',
  India: 'Indian Super League — a young league with a fast-growing fanbase',
  Ireland: 'Premier Division — part-time grit against full-time budgets',
};

/** One card per country that has at least one league the game simulates. */
const NATIONS = COUNTRIES.map((country) => ({
  id: country.toLowerCase(),
  name: country,
  flag: FLAGS[country] ?? '—',
  leagueIds: pyramidOf(country).filter((l) => !l.phantom).map((l) => l.id),
  description: BLURBS[country] ?? `${leagueName(pyramidOf(country)[0].id)} and the tiers below it`,
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
