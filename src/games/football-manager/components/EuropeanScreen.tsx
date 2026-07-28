'use client';

import type { GameState } from '@/engine/types';
import { StatTile } from './visuals';

export default function EuropeanScreen({ state }: { state: GameState }) {
  const european = state.continental;
  const userClub = state.clubs.find((c) => c.id === state.userClubId);
  const isParticipating = european.participants.some((p) => p === state.userClubId);

  const upcomingFixtures = european.fixtures
    .filter((f) => (f.homeId === state.userClubId || f.awayId === state.userClubId) && !f.played)
    .slice(0, 5);

  const results = european.fixtures
    .filter((f) => (f.homeId === state.userClubId || f.awayId === state.userClubId) && f.played)
    .slice(0, 5);

  const userStats = {
    played: results.length,
    wins: results.filter((f) => (f.homeId === state.userClubId && f.homeGoals > f.awayGoals) || (f.awayId === state.userClubId && f.awayGoals > f.homeGoals)).length,
    draws: results.filter((f) => f.homeGoals === f.awayGoals).length,
  };
  const userStats_losses = userStats.played - userStats.wins - userStats.draws;

  return (
    <>
      {!isParticipating ? (
        <div className="fm-panel">
          <p className="fm-label" style={{ marginTop: 0 }}>
            European Competitions
          </p>
          <p className="fm-club-line" style={{ textAlign: 'left' }}>
            {userClub?.name} is not currently participating in European competitions.
          </p>
          <p className="fm-hint" style={{ textAlign: 'left' }}>
            Finish high enough in the league to qualify for European competition next season.
          </p>
        </div>
      ) : (
        <>
          <div className="fm-panel">
            <p className="fm-label" style={{ marginTop: 0 }}>
              {userClub?.name} — European Campaign
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginTop: '12px' }}>
              <StatTile icon="⚽" value={userStats.played} label="Matches" />
              <StatTile icon="✓" value={userStats.wins} label="Wins" />
              <StatTile icon="=" value={userStats.draws} label="Draws" />
              <StatTile icon="✗" value={userStats_losses} label="Losses" />
            </div>
          </div>

          {upcomingFixtures.length > 0 && (
            <div className="fm-panel">
              <p className="fm-label" style={{ marginTop: 0 }}>
                Upcoming European Fixtures
              </p>
              <ul className="fm-fixture-list">
                {upcomingFixtures.map((f, i) => {
                  const home = state.clubs.find((c) => c.id === f.homeId);
                  const away = state.clubs.find((c) => c.id === f.awayId);
                  const isHome = f.homeId === state.userClubId;

                  return (
                    <li key={i} className="fm-fixture next">
                      <div className="fm-fixture__round">R{f.round}</div>
                      <div className={`fm-fixture__${isHome ? 'home' : 'away'}`}>
                        <span>{isHome ? home?.code : away?.code}</span>
                      </div>
                      <div className="fm-fixture__score">vs</div>
                      <div className={`fm-fixture__${isHome ? 'away' : 'home'}`}>
                        <span>{isHome ? away?.code : home?.code}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {results.length > 0 && (
            <div className="fm-panel">
              <p className="fm-label" style={{ marginTop: 0 }}>
                Recent European Results
              </p>
              <ul className="fm-fixture-list">
                {results.map((f, i) => {
                  const home = state.clubs.find((c) => c.id === f.homeId);
                  const away = state.clubs.find((c) => c.id === f.awayId);
                  const isHome = f.homeId === state.userClubId;
                  const isWin = (isHome && f.homeGoals > f.awayGoals) || (!isHome && f.awayGoals > f.homeGoals);
                  const isDraw = f.homeGoals === f.awayGoals;

                  return (
                    <li key={i} className={`fm-fixture${isWin ? ' win' : isDraw ? ' draw' : ' loss'}`}>
                      <div className="fm-fixture__round">R{f.round}</div>
                      <div className={`fm-fixture__${isHome ? 'home' : 'away'}`}>
                        <span>{isHome ? home?.name : away?.name}</span>
                      </div>
                      <div className="fm-fixture__score">
                        {isHome ? f.homeGoals : f.awayGoals} − {isHome ? f.awayGoals : f.homeGoals}
                      </div>
                      <div className={`fm-fixture__${isHome ? 'away' : 'home'}`}>
                        <span>{isHome ? away?.name : home?.name}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div className="fm-panel">
            <p className="fm-label" style={{ marginTop: 0 }}>
              Competition Info
            </p>
            <ul className="fm-news">
              <li>European competitions run parallel to your domestic league</li>
              <li>Progression to knockout stages based on group performance</li>
              <li>European fixture congestion may affect league fixtures</li>
              <li>Prize money awarded for progression and winning</li>
            </ul>
          </div>
        </>
      )}
    </>
  );
}
