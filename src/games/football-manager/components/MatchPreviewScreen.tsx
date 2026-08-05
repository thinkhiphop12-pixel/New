'use client';

import type { GameState, Fixture } from '@/engine/types';
import { Icon } from './Icon';

export default function MatchPreviewScreen({
  state,
  fixture,
  onContinue,
}: {
  state: GameState;
  fixture: Fixture | null;
  onContinue: () => void;
}) {
  if (!fixture) {
    return (
      <div className="fm-screen">
        <p className="fm-hint">No upcoming match</p>
      </div>
    );
  }

  const homeClub = state.clubs.find((c) => c.id === fixture.homeId);
  const awayClub = state.clubs.find((c) => c.id === fixture.awayId);

  // Get players for user's club
  const userClubPlayers = Object.values(state.players).filter(
    (p) => p.clubId === state.userClubId
  );

  const topScorer = userClubPlayers
    .filter((p) => p.pos !== 'GK')
    .sort((a, b) => b.goals - a.goals)[0];

  const injuries = userClubPlayers.filter((p) => p.injuryWeeks > 0);

  return (
    <div className="fm-match-preview">
      {/* Crest vs Crest Banner */}
      <div className="fm-match-preview__banner">
        <div className="fm-match-preview__team">
          <div
            className="fm-match-preview__crest"
            style={{ background: homeClub?.color || '#666' }}
          >
            {homeClub?.code || 'HOME'}
          </div>
          <div className="fm-match-preview__name">{homeClub?.name}</div>
        </div>

        <div className="fm-match-preview__vs">VS</div>

        <div className="fm-match-preview__team">
          <div
            className="fm-match-preview__crest"
            style={{ background: awayClub?.color || '#666' }}
          >
            {awayClub?.code || 'AWAY'}
          </div>
          <div className="fm-match-preview__name">{awayClub?.name}</div>
        </div>
      </div>

      {/* Form Strips - placeholder */}
      <div className="fm-match-preview__form">
        <div className="fm-match-preview__form-strip">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="fm-match-preview__form-dot"
              style={{ background: '#666' }}
            />
          ))}
        </div>
        <div className="fm-match-preview__form-strip">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="fm-match-preview__form-dot"
              style={{ background: '#666' }}
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
      {injuries.length > 0 && (
        <div className="fm-match-preview__availability">
          <div className="fm-match-preview__status">
            <div className="fm-match-preview__status-icon">
              <Icon name="injury" size={20} />
            </div>
            <div className="fm-match-preview__status-name">Injuries</div>
            <div className="fm-match-preview__status-count">{injuries.length}</div>
          </div>
        </div>
      )}

      {/* CTA Button */}
      <div className="fm-match-preview__footer">
        <button className="fm-btn fm-btn--primary" onClick={onContinue}>
          Continue →
        </button>
      </div>
    </div>
  );
}
