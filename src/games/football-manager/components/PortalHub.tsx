'use client';

import { useState } from 'react';
import type { GameState } from '@/engine/types';
import { SEASON_ROUNDS, leagueName } from '@/engine/gameRules';
import { computeTable, nextUserFixture, userLeagueId } from '@/engine/seasonProgression';
import { isClubAlive, knockoutRoundDue } from '@/engine/cups';
import { continentalRoundDue, isContinentalClubAlive } from '@/engine/europeanCup';
import { isLineupValid } from '@/engine/teamManagement';
import { formatMoney } from '@/engine/utils';
import { ReputationStars, tint } from './visuals';
import { Crest } from './Crest';
import PressConferenceModal from './PressConferenceModal';
import ManagerAvatar from './ManagerAvatar';
import { Icon } from './Icon';
import type { Tab } from './HubScreen';

type Filter = 'all' | 'new' | 'tasks';

export default function PortalHub({
  state,
  onChange,
  onAbandon,
  onNavigate,
}: {
  state: GameState;
  onChange: (next: GameState) => void;
  onAbandon: () => void;
  onNavigate: (tab: Tab) => void;
}) {
  const [filter, setFilter] = useState<Filter>('all');
  const [showPress, setShowPress] = useState(false);

  const club = state.clubs.find((c) => c.id === state.userClubId)!;
  const leagueId = userLeagueId(state);
  const table = computeTable(state, leagueId);
  const position = table.findIndex((r) => r.clubId === state.userClubId) + 1;
  const fixture = nextUserFixture(state);
  const opponentId = fixture ? (fixture.homeId === state.userClubId ? fixture.awayId : fixture.homeId) : null;
  const opponent = opponentId ? state.clubs.find((c) => c.id === opponentId) : null;
  const lineupOk = isLineupValid(state, state.userClubId, state.lineup);
  const cupWeek =
    (knockoutRoundDue(state.cup, state.week) && isClubAlive(state.cup, state.userClubId)) ||
    (continentalRoundDue(state.continental, state.week) && isContinentalClubAlive(state.continental, state.userClubId));

  const unreadInbox = state.inbox.filter((i) => !i.read).length;
  const pendingBids = (state.negotiations ?? []).filter((n) => n.type === 'incoming' && n.awaiting === 'user').length;
  const offerCount = state.incomingOffers.length + pendingBids;
  const newCount = (state.news.length > 0 ? 1 : 0) + (offerCount > 0 ? 1 : 0) + (unreadInbox > 0 ? 1 : 0);

  // Each task is a destination, not a note — the list read like a to-do list
  // but couldn't be acted on. "Play Week N" is deliberately absent: the action
  // dock already carries that CTA on every tab.
  const tasks: { label: string; tab: Tab }[] = [];
  if (!lineupOk) tasks.push({ label: 'Fix your lineup', tab: 'squad' });
  if (state.morale < 40) tasks.push({ label: 'Morale is low', tab: 'training' });
  if (state.budget < 0) tasks.push({ label: 'Club in the red', tab: 'finances' });

  const show = (type: string) => {
    if (filter === 'all') return true;
    if (filter === 'new' && (type === 'news' || type === 'offers')) return true;
    if (filter === 'tasks' && type === 'tasks') return true;
    return false;
  };

  const moraleTone = state.morale >= 60 ? 'var(--green)' : state.morale >= 40 ? 'var(--gold)' : 'var(--red)';
  const boardTone = state.board.confidence >= 60 ? 'var(--green)' : state.board.confidence >= 30 ? 'var(--gold)' : 'var(--red)';

  return (
    <div className="fm-portal">
      {/* Club header with badge + week */}
      <div className="fm-portal__header">
        <Crest name={club.name} code={club.code} color={club.color} size={48} />
        <div className="fm-portal__club-info">
          <h1 className="fm-portal__club-name">
            {club.name}
            {club.reputation != null && <ReputationStars value={club.reputation} />}
          </h1>
          <p className="fm-portal__club-meta">
            {state.seasonYear}/{(state.seasonYear + 1) % 100} · {position}{ord(position)} in the {leagueName(leagueId)}
          </p>
        </div>
        {state.managerProfile && (
          <ManagerAvatar
            config={state.managerProfile.avatarConfig}
            size={40}
            title={state.managerProfile.name}
            className="fm-portal__manager-avatar"
            style={{ borderRadius: '50%', border: '2px solid rgba(90, 242, 184, 0.3)', flexShrink: 0 }}
          />
        )}
        <div className="fm-portal__week-badge">
          <span className="week-num">{Math.min(state.week, SEASON_ROUNDS)}</span>
          <span className="week-lbl">Wk {Math.min(state.week, SEASON_ROUNDS)}/{SEASON_ROUNDS}</span>
        </div>
      </div>

      {/* Filter buttons */}
      <div className="fm-portal__filters">
        <button className={`fm-filter-btn${filter === 'all' ? ' active' : ''}`} onClick={() => setFilter('all')}>
          All
        </button>
        <button className={`fm-filter-btn${filter === 'new' ? ' active' : ''}`} onClick={() => setFilter('new')}>
          New {newCount > 0 && <span className="fm-badge fm-badge--new">{newCount}</span>}
        </button>
        <button className={`fm-filter-btn${filter === 'tasks' ? ' active' : ''}`} onClick={() => setFilter('tasks')}>
          Tasks {tasks.length > 0 && <span className="fm-badge fm-badge--alert">{tasks.length}</span>}
        </button>
      </div>

      {/* Touchline module grid — the next match is the hero module (the
          reason the player opened the hub); everything else is a 3-up card
          row. The Play Week / Fix-lineup action itself lives in the
          persistent action dock (FootballManagerGame.tsx) so it's reachable
          from every tab, not just this one. */}
      <div className="fm-hub-grid">
        {fixture && (
          <div
            className="fm-mod fm-hub-grid__hero"
            style={{ background: tint(club.color, '0a'), borderColor: tint(club.color, '30') }}
          >
            <div className="fm-mod__head">
              <h2 className="fm-mod__title">Next match</h2>
            </div>
            <div className="fm-card__fixture" style={{ marginBottom: 8 }}>
              <div className="fm-card__team">
                {(() => {
                  const t = fixture.homeId === state.userClubId ? club : opponent;
                  return <Crest name={t?.name} code={t?.code ?? ''} color={t?.color ?? 'var(--panel-3)'} size={28} />;
                })()}
                <span className="fm-card__team-name fm-card__team-name--home" style={{ fontSize: 13 }}>
                  {fixture.homeId === state.userClubId ? club.name : opponent?.name}
                </span>
                <span className="fm-card__team-label">HOME</span>
              </div>
              <div className="fm-card__vs">VS</div>
              <div className="fm-card__team">
                {(() => {
                  const t = fixture.awayId === state.userClubId ? club : opponent;
                  return <Crest name={t?.name} code={t?.code ?? ''} color={t?.color ?? 'var(--panel-3)'} size={28} />;
                })()}
                <span className="fm-card__team-name fm-card__team-name--away" style={{ fontSize: 13 }}>
                  {fixture.awayId === state.userClubId ? club.name : opponent?.name}
                </span>
                <span className="fm-card__team-label">AWAY</span>
              </div>
            </div>
            {cupWeek && <p className="fm-card__note">+ Cup tie midweek</p>}
            {!lineupOk && (
              <button
                className="fm-card__note fm-card__note--action"
                style={{ color: 'var(--red)' }}
                onClick={() => onNavigate('squad')}
              >
                <Icon name="warning" size={13} /> Lineup needs 11 fit players
                <Icon name="chevron" size={13} />
              </button>
            )}
            {opponent && (
              <div className="fm-actions" style={{ marginBottom: 0, justifyContent: 'flex-start' }}>
                <button
                  className="fm-btn fm-btn--secondary fm-btn--small"
                  onClick={() => setShowPress(true)}
                  disabled={state.pressWeek === state.week}
                >
                  <Icon name="mic" size={14} /> {state.pressWeek === state.week ? 'Press done' : 'Press Conference'}
                </button>
              </div>
            )}
          </div>
        )}

        <div className="fm-mod">
          <div className="fm-mod__head"><h2 className="fm-mod__title">Club</h2></div>
          <div className="fm-stats-strip">
            <div className="fm-stat">
              <span className="fm-stat__label">Budget</span>
              <span className="fm-stat__value">{formatMoney(state.budget)}</span>
            </div>
            <div className="fm-stat">
              <span className="fm-stat__label">Morale</span>
              <span className="fm-stat__value" style={{ color: moraleTone }}>{state.morale}</span>
            </div>
            <div className="fm-stat">
              <span className="fm-stat__label">Board</span>
              <span className="fm-stat__value" style={{ color: boardTone }}>{state.board.confidence}</span>
            </div>
            <div className="fm-stat">
              <span className="fm-stat__label">Fans</span>
              <span className="fm-stat__value" style={{ color: state.fanConfidence >= 50 ? 'var(--green)' : 'var(--red)' }}>{state.fanConfidence}</span>
            </div>
          </div>
        </div>

        {/* Tasks */}
        {show('tasks') && tasks.length > 0 && (
          <div className="fm-mod">
            <div className="fm-mod__head">
              <h2 className="fm-mod__title">Tasks</h2>
              <span className="fm-badge fm-badge--alert">{tasks.length}</span>
            </div>
            <ul className="fm-card__list">
              {tasks.map((t) => (
                <li key={t.tab} className="fm-card__list-item">
                  <button className="fm-card__list-link" onClick={() => onNavigate(t.tab)}>
                    {t.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Starting scenario status — always visible while active, regardless of
            filter, since it's a standing objective rather than a transient item. */}
        {state.scenario && state.scenario.status === 'active' && (
          <div className="fm-mod">
            <div className="fm-mod__head"><h2 className="fm-mod__title">Scenario</h2></div>
            <p className="fm-card__hint">{state.scenario.objective}</p>
            {typeof state.scenario.meta.streak === 'number' && (
              <p className="fm-card__hint">Promotion streak: {state.scenario.meta.streak}</p>
            )}
            {typeof state.scenario.meta.academySales === 'number' && (
              <p className="fm-card__hint">Academy graduates sold for profit: {state.scenario.meta.academySales} / 3</p>
            )}
            {typeof state.scenario.meta.deadlineSeason === 'number' && (
              <p className="fm-card__hint">Deadline: end of {state.scenario.meta.deadlineSeason}</p>
            )}
            {typeof state.scenario.meta.deduction === 'number' && (
              <p className="fm-card__hint">Starting deduction: −{state.scenario.meta.deduction} pts</p>
            )}
          </div>
        )}

        {/* News */}
        {show('news') && state.news.length > 0 && (
          <div className="fm-mod">
            <div className="fm-mod__head">
              <h2 className="fm-mod__title">News</h2>
              <span className="fm-badge fm-badge--new">{Math.min(state.news.length, 9)}</span>
            </div>
            <ul className="fm-card__news">
              {state.news.slice(0, 4).map((n, i) => (
                <li key={i} className="fm-card__news-item">{n}</li>
              ))}
            </ul>
            {state.news.length > 4 && <p className="fm-card__more">+{state.news.length - 4} more</p>}
          </div>
        )}

        {/* Transfer offers */}
        {show('offers') && offerCount > 0 && (
          <button className="fm-mod fm-mod--action" onClick={() => onNavigate('transfers')}>
            <div className="fm-mod__head">
              <h2 className="fm-mod__title">Offers</h2>
              <span className="fm-badge fm-badge--new">{offerCount}</span>
            </div>
            <p className="fm-card__hint">
              {offerCount === 1 ? '1 bid awaiting your reply' : `${offerCount} bids awaiting your reply`}
              <Icon name="chevron" size={13} />
            </p>
          </button>
        )}

        {/* Board objective */}
        {show('board') && (
          <div className="fm-mod">
            <div className="fm-mod__head"><h2 className="fm-mod__title">Objective</h2></div>
            <p className="fm-card__objective">{state.board.objective}</p>
            <p className="fm-card__hint">Finish top {state.board.minPosition} to satisfy the board.</p>
          </div>
        )}
      </div>

      {showPress && opponent && (
        <PressConferenceModal
          state={state}
          opponentName={opponent.name}
          onChange={onChange}
          onClose={() => setShowPress(false)}
        />
      )}

      {/* Abandon */}
      <div className="fm-portal__actions">
        <button
          className="fm-btn fm-btn--danger fm-btn--small"
          onClick={() => { if (window.confirm('Abandon this career? Your save will be deleted.')) onAbandon(); }}
        >
          Abandon career
        </button>
      </div>
    </div>
  );
}

function ord(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return 'th';
  return ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
}
