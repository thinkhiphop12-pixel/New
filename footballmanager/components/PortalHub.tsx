'use client';

import { useState } from 'react';
import type { GameState } from '@/engine/types';
import { DIVISION_NAMES, SEASON_ROUNDS } from '@/engine/gameRules';
import { computeTable, nextUserFixture, userDivision } from '@/engine/seasonProgression';
import { isClubAlive, knockoutRoundDue } from '@/engine/cups';
import { isLineupValid } from '@/engine/teamManagement';
import { formatMoney } from '@/engine/utils';
import { tint } from './visuals';

type Filter = 'all' | 'new' | 'tasks' | 'unread';

export default function PortalHub({
  state,
  onChange,
  onPlayMatch,
  onAbandon,
}: {
  state: GameState;
  onChange: (next: GameState) => void;
  onPlayMatch: () => void;
  onAbandon: () => void;
}) {
  const [filter, setFilter] = useState<Filter>('all');
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const club = state.clubs.find((c) => c.id === state.userClubId)!;
  const div = userDivision(state);
  const table = computeTable(state, div);
  const position = table.findIndex((r) => r.clubId === state.userClubId) + 1;
  const fixture = nextUserFixture(state);
  const opponentId = fixture ? (fixture.homeId === state.userClubId ? fixture.awayId : fixture.homeId) : null;
  const opponent = opponentId ? state.clubs.find((c) => c.id === opponentId) : null;
  const lineupOk = isLineupValid(state, state.userClubId, state.lineup);
  const cupWeek =
    (knockoutRoundDue(state.cup, state.week) && isClubAlive(state.cup, state.userClubId)) ||
    (knockoutRoundDue(state.continental, state.week) && isClubAlive(state.continental, state.userClubId));

  // News (for "new" filter)
  const unreadNews = state.news.length > 0 ? 1 : 0;
  const newItems = unreadNews + (state.incomingOffers.length > 0 ? 1 : 0);

  // Tasks (fixture coming up, unstable formation, etc.)
  const taskItems = [];
  if (!lineupOk) taskItems.push('Fix your lineup');
  if (fixture) taskItems.push(`Play Week ${state.week}`);
  if (state.morale < 40) taskItems.push('Team morale is low');

  const toggleCard = (cardId: string) => {
    setExpandedCards({
      ...expandedCards,
      [cardId]: !expandedCards[cardId],
    });
  };

  const shouldShowCard = (cardType: string) => {
    if (filter === 'all') return true;
    if (filter === 'new' && (cardType === 'news' || cardType === 'offers')) return true;
    if (filter === 'tasks' && cardType === 'tasks') return true;
    if (filter === 'unread' && (cardType === 'news' || cardType === 'offers')) return true;
    return false;
  };

  return (
    <div className="fm-portal">
      {/* Portal Header */}
      <div className="fm-portal__header">
        <div className="fm-portal__club-badge" style={{ background: club.color }}>
          {club.code}
        </div>
        <div className="fm-portal__club-info">
          <h1 className="fm-portal__club-name">{club.name}</h1>
          <p className="fm-portal__club-meta">
            {DIVISION_NAMES[div]} · {state.seasonYear}/{(state.seasonYear + 1) % 100}
          </p>
        </div>
      </div>

      {/* Filter Buttons (Mobile-friendly) */}
      <div className="fm-portal__filters">
        <button
          className={`fm-filter-btn${filter === 'all' ? ' active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button
          className={`fm-filter-btn${filter === 'new' ? ' active' : ''}`}
          onClick={() => setFilter('new')}
        >
          New {newItems > 0 && <span className="fm-badge">{newItems}</span>}
        </button>
        <button
          className={`fm-filter-btn${filter === 'tasks' ? ' active' : ''}`}
          onClick={() => setFilter('tasks')}
        >
          Tasks {taskItems.length > 0 && <span className="fm-badge">{taskItems.length}</span>}
        </button>
        <button
          className={`fm-filter-btn${filter === 'unread' ? ' active' : ''}`}
          onClick={() => setFilter('unread')}
        >
          Unread {unreadNews > 0 && <span className="fm-badge">{unreadNews}</span>}
        </button>
      </div>

      {/* Cards Grid (Mobile: stacked, Desktop: 2-column) */}
      <div className="fm-portal__cards">
        {/* Quick Stats Card */}
        {shouldShowCard('stats') && (
          <div className="fm-card">
            <div className="fm-card__header">
              <h2 className="fm-card__title">Standing</h2>
            </div>
            <div className="fm-card__body">
              <div className="fm-card__stat-row">
                <span className="fm-card__stat-label">Position</span>
                <span className="fm-card__stat-value fm-gold">{position}</span>
              </div>
              <div className="fm-card__stat-row">
                <span className="fm-card__stat-label">Budget</span>
                <span className="fm-card__stat-value">{formatMoney(state.budget)}</span>
              </div>
              <div className="fm-card__stat-row">
                <span className="fm-card__stat-label">Morale</span>
                <span className="fm-card__stat-value">{state.morale}</span>
              </div>
              <div className="fm-card__stat-row">
                <span className="fm-card__stat-label">Board Confidence</span>
                <span className="fm-card__stat-value">{state.board.confidence}</span>
              </div>
              <div className="fm-card__stat-row">
                <span className="fm-card__stat-label">Fan Confidence</span>
                <span className="fm-card__stat-value">{state.fanConfidence}</span>
              </div>
            </div>
          </div>
        )}

        {/* Upcoming Fixture Card */}
        {shouldShowCard('fixture') && fixture && (
          <div className="fm-card" style={{ background: tint(club.color, '14'), borderColor: tint(club.color, '40') }}>
            <div className="fm-card__header">
              <h2 className="fm-card__title">Next Match</h2>
              <span className="fm-card__meta">Week {Math.min(state.week, SEASON_ROUNDS)} of {SEASON_ROUNDS}</span>
            </div>
            <div className="fm-card__body">
              <div className="fm-card__fixture">
                <div className="fm-card__team">
                  {fixture.homeId === state.userClubId ? (
                    <>
                      <span className="fm-card__team-name fm-card__team-name--home">{club.name}</span>
                      <span className="fm-card__team-label">Home</span>
                    </>
                  ) : (
                    <>
                      <span className="fm-card__team-name">{opponent?.name || 'Unknown'}</span>
                      <span className="fm-card__team-label">Away</span>
                    </>
                  )}
                </div>
                <div className="fm-card__vs">vs</div>
                <div className="fm-card__team">
                  {fixture.awayId === state.userClubId ? (
                    <>
                      <span className="fm-card__team-name fm-card__team-name--away">{club.name}</span>
                      <span className="fm-card__team-label">Away</span>
                    </>
                  ) : (
                    <>
                      <span className="fm-card__team-name">{opponent?.name || 'Unknown'}</span>
                      <span className="fm-card__team-label">Home</span>
                    </>
                  )}
                </div>
              </div>
              {cupWeek && <p className="fm-card__note">+ Cup tie midweek</p>}
              <button
                className="fm-btn fm-btn--primary fm-btn--full fm-card__action"
                onClick={onPlayMatch}
                disabled={!lineupOk}
              >
                {lineupOk ? `Play Week ${state.week}` : 'Fix your lineup (11 fit players)'}
              </button>
            </div>
          </div>
        )}

        {/* Tasks Card */}
        {shouldShowCard('tasks') && taskItems.length > 0 && (
          <div className="fm-card">
            <div className="fm-card__header">
              <h2 className="fm-card__title">Tasks</h2>
              <span className="fm-badge fm-badge--alert">{taskItems.length}</span>
            </div>
            <div className="fm-card__body">
              <ul className="fm-card__list">
                {taskItems.map((task, i) => (
                  <li key={i} className="fm-card__list-item">
                    {task}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* News Card */}
        {shouldShowCard('news') && state.news.length > 0 && (
          <div className="fm-card">
            <div className="fm-card__header">
              <h2 className="fm-card__title">News</h2>
              {unreadNews > 0 && <span className="fm-badge fm-badge--new">{unreadNews}</span>}
            </div>
            <div className="fm-card__body">
              <ul className="fm-card__news">
                {state.news.slice(0, 3).map((n, i) => (
                  <li key={i} className="fm-card__news-item">
                    {n}
                  </li>
                ))}
              </ul>
              {state.news.length > 3 && <p className="fm-card__more">+{state.news.length - 3} more</p>}
            </div>
          </div>
        )}

        {/* Transfer Offers Card */}
        {shouldShowCard('offers') && state.incomingOffers.length > 0 && (
          <div className="fm-card">
            <div className="fm-card__header">
              <h2 className="fm-card__title">Transfer Offers</h2>
              <span className="fm-badge fm-badge--new">{state.incomingOffers.length}</span>
            </div>
            <div className="fm-card__body">
              <p className="fm-card__hint">Check the Transfers tab for details.</p>
            </div>
          </div>
        )}

        {/* Board Objective Card */}
        {shouldShowCard('board') && (
          <div className="fm-card">
            <div className="fm-card__header">
              <h2 className="fm-card__title">Board Objective</h2>
            </div>
            <div className="fm-card__body">
              <p className="fm-card__objective">{state.board.objective}</p>
              <p className="fm-card__hint">Finish in top {state.board.minPosition} to satisfy the board.</p>
            </div>
          </div>
        )}
      </div>

      {/* Backroom Advice Section */}
      <div className="fm-portal__advice">
        <button
          className="fm-card fm-card--clickable"
          onClick={() => toggleCard('advice')}
        >
          <div className="fm-card__header">
            <h2 className="fm-card__title">💬 Backroom Advice</h2>
            <span className="fm-card__indicator">{expandedCards['advice'] ? '−' : '+'}</span>
          </div>
          {expandedCards['advice'] && (
            <div className="fm-card__body">
              <ul className="fm-card__advice-list">
                {state.morale < 50 && <li>⚠️ Morale is low.</li>}
                {!lineupOk && <li>⚠️ Starting XI has gaps.</li>}
                {state.budget < 500000 && <li>⚠️ Budget is low.</li>}
                {state.fanConfidence < 40 && <li>⚠️ Fans losing faith.</li>}
                {!state.morale && <li>✅ All good.</li>}
              </ul>
            </div>
          )}
        </button>
      </div>

      {/* Abandon Button */}
      <div className="fm-portal__actions">
        <button
          className="fm-btn fm-btn--danger fm-btn--small"
          onClick={() => {
            if (window.confirm('Abandon this career? Your save will be deleted.')) onAbandon();
          }}
        >
          Abandon career
        </button>
      </div>
    </div>
  );
}
