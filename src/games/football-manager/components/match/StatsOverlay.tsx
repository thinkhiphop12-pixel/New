'use client';

import type { Club } from '@/engine/types';
import type { SideStats } from '@/engine/tickEngine/types';

const REFEREES = [
  'Martin Atkinson', 'Mike Dean', 'Anthony Taylor', 'Michael Oliver', 'Craig Pawson',
  'Stuart Attwell', 'Paul Tierney', 'Andre Marriner', 'Kevin Friend', 'David Coote',
];
const REF_STYLES = ['Firm', 'Lenient', 'Card-happy', 'Balanced'];

function Bar({ home, away, label, homeVal, awayVal, homeColor, awayColor }: {
  home: number;
  away: number;
  label: string;
  homeVal: string | number;
  awayVal: string | number;
  homeColor: string;
  awayColor: string;
}) {
  const total = home + away || 1;
  return (
    <div className="fm-mstats__row">
      <span className="fm-mstats__val">{homeVal}</span>
      <div className="fm-mstats__mid">
        <span className="fm-mstats__label">{label}</span>
        <div className="fm-mstats__bar">
          <div style={{ width: `${(100 * home) / total}%`, background: homeColor }} />
          <div style={{ width: `${(100 * away) / total}%`, background: awayColor }} />
        </div>
      </div>
      <span className="fm-mstats__val">{awayVal}</span>
    </div>
  );
}

/**
 * FM-style paused match panel: fixture info up top, headline stats below and
 * a live win-probability bar along the bottom.
 */
export default function StatsOverlay({
  homeClub,
  awayClub,
  stats,
  score,
  momentum,
  week,
  seasonYear,
  competition,
  teamRatings,
  cards,
  corners,
}: {
  homeClub: Club | undefined;
  awayClub: Club | undefined;
  stats: { home: SideStats; away: SideStats };
  score: { home: number; away: number };
  momentum: number;
  week: number;
  seasonYear: number;
  competition: string;
  teamRatings: { home: number; away: number };
  cards: { home: number; away: number };
  corners: { home: number; away: number };
}) {
  const seed = (homeClub?.id ?? 1) * 31 + (awayClub?.id ?? 2) * 7 + week;
  const referee = REFEREES[seed % REFEREES.length];
  const refStyle = REF_STYLES[seed % REF_STYLES.length];
  const attendance = 14000 + ((seed * 2654435761) % 38000 | 0);

  const homeColor = homeClub?.color ?? '#ffffff';
  const awayColor = awayClub?.color ?? '#8c2440';

  // Simple live win chance from score, xG and momentum.
  const edge =
    (score.home - score.away) * 1.1 +
    (stats.home.xg - stats.away.xg) * 0.3 +
    momentum * 0.5 +
    0.18; // home advantage
  const homeWin = Math.round((1 / (1 + Math.exp(-edge))) * 100);

  const ccc = {
    home: Math.max(0, Math.round(stats.home.xg / 0.35)),
    away: Math.max(0, Math.round(stats.away.xg / 0.35)),
  };

  return (
    <div className="fm-mstats">
      <div className="fm-mstats__info">
        <div className="fm-mstats__when">
          <span>Matchday</span>
          <strong>Week {week}</strong>
          <span>{seasonYear}</span>
        </div>
        <div className="fm-mstats__comp">
          <span className="fm-mstats__comp-badge" style={{ background: homeColor }} />
          <div>
            <strong>{competition}</strong>
            <span>
              {homeClub?.name} Stadium (Att: {attendance.toLocaleString()})
            </span>
          </div>
        </div>
        <div className="fm-mstats__ref">
          <span>Referee:</span>
          <strong>{referee}</strong>
          <span>({refStyle})</span>
        </div>
      </div>

      <div className="fm-mstats__grid">
        <div className="fm-mstats__col">
          <Bar label="Possession" home={stats.home.possession} away={stats.away.possession}
            homeVal={`${stats.home.possession}%`} awayVal={`${stats.away.possession}%`}
            homeColor={homeColor} awayColor={awayColor} />
          <Bar label="Clear cut chances" home={ccc.home} away={ccc.away}
            homeVal={ccc.home} awayVal={ccc.away} homeColor={homeColor} awayColor={awayColor} />
          <Bar label="Team Rating" home={teamRatings.home} away={teamRatings.away}
            homeVal={teamRatings.home.toFixed(1)} awayVal={teamRatings.away.toFixed(1)}
            homeColor={homeColor} awayColor={awayColor} />
        </div>
        <div className="fm-mstats__col">
          <Bar label="Shots" home={stats.home.shots} away={stats.away.shots}
            homeVal={stats.home.shots} awayVal={stats.away.shots} homeColor={homeColor} awayColor={awayColor} />
          <Bar label="Shots on target" home={stats.home.onTarget} away={stats.away.onTarget}
            homeVal={stats.home.onTarget} awayVal={stats.away.onTarget} homeColor={homeColor} awayColor={awayColor} />
          <div className="fm-mstats__row fm-mstats__row--split">
            <span className="fm-mstats__val">{cards.home}</span>
            <span className="fm-mstats__flag" title="Cards">🟨</span>
            <span className="fm-mstats__val">{cards.away}</span>
            <span className="fm-mstats__val">{corners.home}</span>
            <span className="fm-mstats__flag" title="Corners">🚩</span>
            <span className="fm-mstats__val">{corners.away}</span>
          </div>
        </div>
      </div>

      <div className="fm-mstats__winbar">
        <div className="fm-mstats__winbar-home" style={{ width: `${homeWin}%` }}>
          <span>{homeWin}%</span>
        </div>
        <div className="fm-mstats__winbar-away" style={{ width: `${100 - homeWin}%`, background: awayColor }}>
          <span>{100 - homeWin}%</span>
        </div>
      </div>
    </div>
  );
}
