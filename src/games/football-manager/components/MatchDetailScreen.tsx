'use client';

import type { GameState, Match } from '@/engine/types';
import { Icon } from './Icon';

export default function MatchDetailScreen({
  state,
  match,
}: {
  state: GameState;
  match: Match | null;
}) {
  if (!match) {
    return (
      <div className="fm-screen">
        <p className="fm-hint">No match detail</p>
      </div>
    );
  }

  const homeClub = state.clubs.find((c) => c.id === match.homeId);
  const awayClub = state.clubs.find((c) => c.id === match.awayId);

  // Simulate match events (placeholder)
  const events = [
    { min: '12', type: 'goal', team: 'home', player: 'A. McLeish', icon: 'goal' },
    { min: '34', type: 'yellow', team: 'away', player: 'B. Smith', icon: 'card' },
    { min: '67', type: 'goal', team: 'away', player: 'C. Jones', icon: 'goal' },
    { min: '78', type: 'sub', team: 'home', player: 'D. Wilson on for E. Brown', icon: 'sub' },
    { min: '89', type: 'goal', team: 'home', player: 'F. Davis', icon: 'goal' },
  ];

  return (
    <div className="fm-match-detail">
      {/* Big Scoreline Banner */}
      <div className="fm-match-detail__banner">
        <div
          className="fm-match-detail__crest"
          style={{ background: homeClub?.color || '#666' }}
        />
        <div className="fm-match-detail__score">{match.homeGoals} – {match.awayGoals}</div>
        <div
          className="fm-match-detail__crest"
          style={{ background: awayClub?.color || '#666' }}
        />
      </div>

      <div className="fm-match-detail__status">Full Time · {match.competition}</div>

      {/* Timeline */}
      <div className="fm-match-detail__timeline">
        {events.map((e, i) => (
          <div key={i} className="fm-match-detail__event">
            <div className="fm-match-detail__event-minute">{e.min}'</div>
            <div
              className="fm-match-detail__event-icon"
              style={{
                background:
                  e.type === 'goal'
                    ? '#7ccb3f'
                    : e.type === 'yellow'
                      ? '#e8a93b'
                      : e.type === 'red'
                        ? '#c24b4b'
                        : '#4c7fd6',
              }}
            >
              <Icon name={e.icon as any} size={16} />
            </div>
            <div className="fm-match-detail__event-text">
              {e.team === 'home' ? homeClub?.name : awayClub?.name}: {e.player}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
