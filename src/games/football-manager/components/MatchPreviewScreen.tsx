'use client';

import type { GameState, Match } from '@/engine/types';
import { Icon } from './Icon';

export default function MatchPreviewScreen({
  state,
  match,
  onContinue,
}: {
  state: GameState;
  match: Match | null;
  onContinue: () => void;
}) {
  if (!match) {
    return (
      <div className="fm-screen">
        <p className="fm-hint">No upcoming match</p>
      </div>
    );
  }

  const homeClub = state.clubs.find((c) => c.id === match.homeId);
  const awayClub = state.clubs.find((c) => c.id === match.awayId);

  // Form dots (last 5 results: W=green, D=blue, L=red)
  const formHome = match.homeId === state.clubId ? state.recentResults.slice(-5) : [];
  const formAway = match.awayId === state.clubId ? state.recentResults.slice(-5) : [];

  const topScorer = state.players
    .filter((p) => p.clubId === state.clubId && p.pos !== 'GK')
    .sort((a, b) => b.goals - a.goals)[0];

  const injuries = state.players.filter((p) => p.clubId === state.clubId && p.injuryWeeks > 0);
  const suspensions = state.players.filter((p) => p.clubId === state.clubId && p.suspended);

  return (
    <div className="fm-match-preview">
      {/* Crest vs Crest Banner */}
      <div className="fm-match-preview__banner">
        <div className="fm-match-preview__team">
          <div
            className="fm-match-preview__crest"
            style={{ background: homeClub?.color || '#666' }}
          >
            {homeClub?.name.slice(0, 3).toUpperCase()}
          </div>
          <div className="fm-match-preview__name">{homeClub?.name}</div>
        </div>

        <div className="fm-match-preview__vs">VS</div>

        <div className="fm-match-preview__team">
          <div
            className="fm-match-preview__crest"
            style={{ background: awayClub?.color || '#666' }}
          >
            {awayClub?.name.slice(0, 3).toUpperCase()}
          </div>
          <div className="fm-match-preview__name">{awayClub?.name}</div>
        </div>
      </div>

      {/* Form Strips */}
      <div className="fm-match-preview__form">
        <div className="fm-match-preview__form-strip">
          {formHome.map((result, i) => (
            <div
              key={i}
              className="fm-match-preview__form-dot"
              style={{
                background:
                  result === 'W'
                    ? '#7ccb3f'
                    : result === 'D'
                      ? '#4c7fd6'
                      : '#c24b4b',
              }}
            />
          ))}
        </div>
        <div className="fm-match-preview__form-strip">
          {formAway.map((result, i) => (
            <div
              key={i}
              className="fm-match-preview__form-dot"
              style={{
                background:
                  result === 'W'
                    ? '#7ccb3f'
                    : result === 'D'
                      ? '#4c7fd6'
                      : '#c24b4b',
              }}
            />
          ))}
        </div>
      </div>

      {/* Top Scorer Card */}
      {topScorer && (
        <div className="fm-match-preview__card">
          <div className="fm-match-preview__card-label">Top Scorer</div>
          <div className="fm-match-preview__card-content">
            <div className="fm-match-preview__avatar" />
            <div className="fm-match-preview__card-text">
              {topScorer.name} — {topScorer.goals} goals
            </div>
          </div>
        </div>
      )}

      {/* Availability */}
      <div className="fm-match-preview__availability">
        {injuries.length > 0 && (
          <div className="fm-match-preview__status">
            <div className="fm-match-preview__status-icon">
              <Icon name="injury" size={20} />
            </div>
            <div className="fm-match-preview__status-name">Injuries</div>
            <div className="fm-match-preview__status-count">{injuries.length}</div>
          </div>
        )}
        {suspensions.length > 0 && (
          <div className="fm-match-preview__status">
            <div className="fm-match-preview__status-icon">
              <Icon name="suspended" size={20} />
            </div>
            <div className="fm-match-preview__status-name">Suspended</div>
            <div className="fm-match-preview__status-count">{suspensions.length}</div>
          </div>
        )}
      </div>

      {/* CTA Button */}
      <div className="fm-match-preview__footer">
        <button className="fm-btn fm-btn--primary" onClick={onContinue}>
          Continue →
        </button>
      </div>
    </div>
  );
}
