'use client';

import type { Club } from '@/engine/types';
import type { SideStats } from '@/engine/tickEngine/types';
import { Icon } from '../Icon';

const REFEREES = [
  'Martin Atkinson', 'Mike Dean', 'Anthony Taylor', 'Michael Oliver', 'Craig Pawson',
  'Stuart Attwell', 'Paul Tierney', 'Andre Marriner', 'Kevin Friend', 'David Coote',
];
const REF_STYLES = ['Firm', 'Lenient', 'Card-happy', 'Balanced'];

/**
 * Diverging momentum area graph over the course of the match — home spells
 * rise above the midline, away spells dip below, each in their side's colour.
 * Ported from the reference's `drawMomentumGraph`. Replaces what used to be
 * a single live momentum bar with the actual shape of the match.
 */
function MomentumGraph({
  series, homeColor, awayColor,
}: {
  series: { minute: number; value: number }[];
  homeColor: string;
  awayColor: string;
}) {
  if (series.length < 2) return null;
  const width = 100;
  const mid = 16;
  const amp = 14; // vertical scale either side of the midline
  const maxMinute = series[series.length - 1].minute || 1;
  const x = (m: number) => (m / maxMinute) * width;
  let dh = `M 0 ${mid}`;
  let da = `M 0 ${mid}`;
  for (const pt of series) {
    const xv = x(pt.minute).toFixed(1);
    dh += ` L ${xv} ${(mid - Math.max(0, pt.value) * amp).toFixed(1)}`;
    da += ` L ${xv} ${(mid + Math.max(0, -pt.value) * amp).toFixed(1)}`;
  }
  const lastX = x(series[series.length - 1].minute).toFixed(1);
  dh += ` L ${lastX} ${mid} Z`;
  da += ` L ${lastX} ${mid} Z`;
  return (
    <div style={{ margin: '4px 0 10px' }}>
      <span style={{ fontSize: 11, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Momentum</span>
      <svg viewBox={`0 0 ${width} 32`} preserveAspectRatio="none" style={{ width: '100%', height: 32, display: 'block' }}>
        <line x1="0" y1={mid} x2={width} y2={mid} stroke="rgba(255,255,255,0.18)" strokeWidth="0.5" />
        <path d={dh} fill={homeColor} opacity="0.75" />
        <path d={da} fill={awayColor} opacity="0.75" />
      </svg>
    </div>
  );
}

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
  momentumSeries,
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
  momentumSeries?: { minute: number; value: number }[];
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
            <span className="fm-mstats__flag" title="Cards"><Icon name="card" size={13} style={{ color: 'var(--gold)' }} /></span>
            <span className="fm-mstats__val">{cards.away}</span>
            <span className="fm-mstats__val">{corners.home}</span>
            <span className="fm-mstats__flag" title="Corners"><Icon name="corner" size={13} /></span>
            <span className="fm-mstats__val">{corners.away}</span>
          </div>
        </div>
      </div>

      {momentumSeries && momentumSeries.length > 1 && (
        <MomentumGraph series={momentumSeries} homeColor={homeColor} awayColor={awayColor} />
      )}

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
