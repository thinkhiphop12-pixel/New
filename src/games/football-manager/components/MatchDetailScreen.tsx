'use client';

import type { GameState, MatchReport } from '@/engine/types';
import { Icon } from './Icon';

export default function MatchDetailScreen({
  state,
  report,
}: {
  state: GameState;
  report: MatchReport | null;
}) {
  if (!report) {
    return (
      <div className="fm-screen">
        <p className="fm-hint">No match detail</p>
      </div>
    );
  }

  const homeClub = state.clubs.find((c) => c.id === report.homeId);
  const awayClub = state.clubs.find((c) => c.id === report.awayId);

  // Use actual events from the match report
  const events = report.events.map((e) => ({
    min: String(e.minute),
    type: e.type,
    team: e.clubId === report.homeId ? 'home' : 'away',
    player: e.text,
    icon: e.type === 'goal' ? 'goal' : e.type === 'card' ? 'card' : 'info',
  }));

  return (
    <div className="fm-match-detail">
      {/* Big Scoreline Banner */}
      <div className="fm-match-detail__banner">
        <div
          className="fm-match-detail__crest"
          style={{ background: homeClub?.color || '#666' }}
        />
        <div className="fm-match-detail__score">{report.homeGoals} – {report.awayGoals}</div>
        <div
          className="fm-match-detail__crest"
          style={{ background: awayClub?.color || '#666' }}
        />
      </div>

      <div className="fm-match-detail__status">Full Time</div>

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
                    : e.type === 'card'
                      ? '#e8a93b'
                      : e.type === 'injury'
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
