'use client';

import { useState, type CSSProperties } from 'react';
import type { GameState } from '@/engine/types';
import { SEASON_ROUNDS, leagueName } from '@/engine/gameRules';
import { computeTable, nextUserFixture, userLeagueId } from '@/engine/seasonProgression';
import { getSquad, isLineupValid } from '@/engine/teamManagement';
import { isClubAlive, knockoutRoundDue } from '@/engine/cups';
import { continentalRoundDue, isContinentalClubAlive } from '@/engine/europeanCup';
import { daysUntilMatchDay, isMatchDay, relativeDays } from '@/engine/calendar';
import { formatMoney } from '@/engine/utils';
import { ReputationStars, tint } from './visuals';
import { Crest } from './Crest';
import PressConferenceModal from './PressConferenceModal';
import { Icon, type IconName } from './Icon';
import type { ScreenId } from './hubNav';
import { getAssistant } from '@/engine/assistant';
import { assistantTopics } from './assistant/tips';

function ord(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return 'th';
  return ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
}

type AttentionRow = { icon: IconName; text: string; warn?: boolean; onClick: () => void };

/**
 * The single command centre. Replaces the old two-front-door setup — a
 * GroupHub landing (four menu cards) that duplicated PortalHub's club
 * header, week badge and next-fixture info almost line for line. There is
 * now exactly one Home, reachable both as the Hub's landing (`route ===
 * null`) and as Matchday → Overview, both rendering this same component so
 * the two entry points can no longer disagree with each other.
 *
 * Answers, at a glance, the questions a home screen has to answer: when's
 * the next match, who's injured, who's unhappy, what needs me, how's
 * training going, what's happening in the market, what am I being judged
 * on. Every attention row is a button, not a string — the old Tasks module
 * rendered `<li>{t}</li>`, which told the player something was wrong with
 * no way to act on it from here.
 */
export default function Dashboard({
  state,
  onChange,
  onAbandon,
  onOpenScreen,
  onSimulate,
  simRunning,
}: {
  state: GameState;
  onChange: (next: GameState) => void;
  onAbandon: () => void;
  onOpenScreen: (id: ScreenId) => void;
  onSimulate: (untilDay?: number) => void;
  simRunning: boolean;
}) {
  const [showPress, setShowPress] = useState(false);

  const club = state.clubs.find((c) => c.id === state.userClubId)!;
  const leagueId = userLeagueId(state);
  const table = computeTable(state, leagueId);
  const position = table.findIndex((r) => r.clubId === state.userClubId) + 1;
  const tableStart = Math.min(Math.max(position - 1 - 3, 0), Math.max(table.length - 7, 0));
  const tableSlice = table.slice(tableStart, tableStart + 7);

  const fixture = nextUserFixture(state);
  const opponentId = fixture ? (fixture.homeId === state.userClubId ? fixture.awayId : fixture.homeId) : null;
  const opponent = opponentId ? state.clubs.find((c) => c.id === opponentId) : null;
  const atHome = fixture ? fixture.homeId === state.userClubId : false;
  const cupWeek =
    (knockoutRoundDue(state.cup, state.week) && isClubAlive(state.cup, state.userClubId)) ||
    (continentalRoundDue(state.continental, state.week) && isContinentalClubAlive(state.continental, state.userClubId));

  const squad = getSquad(state, state.userClubId);
  const injured = squad.filter((p) => p.injuryWeeks > 0).sort((a, b) => a.injuryWeeks - b.injuryWeeks);
  const unhappy = squad.filter((p) => p.unhappy);
  const lineupOk = isLineupValid(state, state.userClubId, state.lineup);
  const avgSharpness = squad.length ? Math.round(squad.reduce((s, p) => s + p.sharpness, 0) / squad.length) : 0;
  const avgFitness = squad.length ? Math.round(squad.reduce((s, p) => s + p.fitness, 0) / squad.length) : 0;

  const unreadInbox = state.inbox.filter((i) => !i.read).length;
  const pendingBids = (state.negotiations ?? []).filter((n) => n.type === 'incoming' && n.awaiting === 'user').length;
  const offerCount = state.incomingOffers.length + pendingBids;
  const latestNews = [...state.inbox].sort((a, b) => b.id - a.id)[0] ?? null;

  // "What needs my attention" — every row routes somewhere real. This is the
  // clickable replacement for the old Tasks module's unclickable strings.
  const attention: AttentionRow[] = [];
  if (!lineupOk) attention.push({ icon: 'warning', text: 'Lineup needs 11 fit players', warn: true, onClick: () => onOpenScreen('tactics') });
  if (state.budget < 0) attention.push({ icon: 'money-out', text: `Club in the red — ${formatMoney(state.budget)}`, warn: true, onClick: () => onOpenScreen('finances') });
  if (state.morale < 40) attention.push({ icon: 'warning', text: 'Squad morale is low', warn: true, onClick: () => onOpenScreen('training') });
  if (state.board.confidence < 30) attention.push({ icon: 'target', text: 'Board confidence is fading', warn: true, onClick: () => onOpenScreen('board') });
  if (unhappy.length > 0) attention.push({ icon: 'warning', text: `${unhappy.length} player${unhappy.length === 1 ? '' : 's'} unhappy about game time`, warn: true, onClick: () => onOpenScreen('inbox') });
  if (offerCount > 0) attention.push({ icon: 'transfers', text: `${offerCount} transfer offer${offerCount === 1 ? '' : 's'} awaiting a reply`, onClick: () => onOpenScreen('transfers') });
  if (unreadInbox > 0) attention.push({ icon: 'inbox', text: `${unreadInbox} unread message${unreadInbox === 1 ? '' : 's'}`, onClick: () => onOpenScreen('inbox') });

  return (
    <div className="fm-portal">
      <div className="fm-portal__header">
        <Crest name={club.name} code={club.code} color={club.color} size={48} />
        <div className="fm-portal__club-info">
          <h2 className="fm-portal__club-name">
            {club.name}
            {club.reputation != null && <ReputationStars value={club.reputation} />}
          </h2>
          <p className="fm-portal__club-meta">
            {state.seasonYear}/{(state.seasonYear + 1) % 100} · {position > 0 ? `${position}${ord(position)} in the ${leagueName(leagueId)}` : leagueName(leagueId)}
          </p>
        </div>
        <div className="fm-portal__week-badge">
          <span className="week-num">{Math.min(state.week, SEASON_ROUNDS)}</span>
          <span className="week-lbl">Wk {Math.min(state.week, SEASON_ROUNDS)}/{SEASON_ROUNDS}</span>
        </div>
      </div>

      <div className="fm-hub-grid">
        {/* Next match — the hero module, the reason most players open Home. */}
        {fixture && (
          <div className="fm-mod fm-hub-grid__hero" style={{ background: tint(club.color, '0a'), borderColor: tint(club.color, '30') }}>
            <div className="fm-mod__head">
              <h2 className="fm-mod__title">Next match</h2>
              <span className="fm-actiondock__spacer" />
              <span className="fm-hint" style={{ margin: 0 }}>{relativeDays(daysUntilMatchDay(state))}</span>
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
                type="button"
                className="fm-card__note"
                style={{ color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit' }}
                onClick={() => onOpenScreen('tactics')}
              >
                <Icon name="warning" size={13} /> Lineup needs 11 fit players — fix it in Squad or Tactics.
              </button>
            )}
            <div className="fm-actions" style={{ marginBottom: 0, justifyContent: 'flex-start', gap: 8 }}>
              {/* Gap 1/5 (Userbrain): the "what do I do?" complaint — the
                  progression control already exists as the persistent action
                  dock, but it's easy to miss below the fold. Mirror it here,
                  next to the thing it actually advances. */}
              {/* On matchday the daily loop has already stopped here — there is
                  nowhere else "Next event" could be taking you — so say what
                  it actually does: hands off to the pre-match checks
                  (engine/preMatch.ts) and kickoff, same as the dock's CTA. */}
              <button
                type="button"
                className="fm-btn fm-btn--primary fm-btn--small"
                onClick={() => onSimulate()}
              >
                {isMatchDay(state) ? (
                  <>▶ PROCEED TO MATCH</>
                ) : (
                  <>
                    <Icon name={simRunning ? 'pause' : 'play'} size={14} /> {simRunning ? 'Stop' : 'Next event'}
                  </>
                )}
              </button>
              {/* Gap 5 (Userbrain): a tester mistook Press Conference for team
                  setup because nothing on this screen pointed at Tactics
                  before matchday — put a direct link right next to it. */}
              <button
                type="button"
                className="fm-btn fm-btn--ghost fm-btn--small"
                onClick={() => onOpenScreen('tactics')}
              >
                <Icon name="tactics" size={14} /> Tactics
              </button>
              {opponent && (
                <button
                  className="fm-btn fm-btn--ghost fm-btn--small"
                  onClick={() => setShowPress(true)}
                  disabled={state.pressWeek === state.week}
                >
                  <Icon name="mic" size={14} /> {state.pressWeek === state.week ? 'Press done' : 'Press Conference'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Needs your attention — clickable, resolvable, never a dead end. */}
        <div className="fm-mod">
          <div className="fm-mod__head">
            <h2 className="fm-mod__title">Needs your attention</h2>
            {attention.length > 0 && <span className="fm-badge fm-badge--alert">{attention.length}</span>}
          </div>
          {attention.length === 0 ? (
            <p className="fm-hint" style={{ margin: 0 }}>
              {getAssistant(state)
                ? `"${assistantTopics(state, 'overview')[0]?.line ?? "All quiet, boss — I'd get to the next match."}"`
                : "Nothing urgent — you're all caught up."}
            </p>
          ) : (
            <div className="fm-msg-list">
              {attention.map((row, i) => (
                <button key={i} type="button" className="fm-msg-row unread" onClick={row.onClick}>
                  <span className="fm-icon-tile fm-icon-tile--sm" style={{ '--tile-tint': row.warn ? 'var(--red)' : 'var(--blue)' } as CSSProperties}>
                    <Icon name={row.icon} size={15} />
                  </span>
                  <span className="fm-msg-row__main">
                    <span className="fm-msg-row__title">{row.text}</span>
                  </span>
                  <Icon name="chevron" size={14} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Squad status: injuries, unhappiness, sharpness/fitness. */}
        <div className="fm-mod">
          <div className="fm-mod__head"><h2 className="fm-mod__title">Squad status</h2></div>
          <div className="fm-stats-strip">
            <div className="fm-stat">
              <span className="fm-stat__label">Sharpness</span>
              <span className="fm-stat__value">{avgSharpness}</span>
            </div>
            <div className="fm-stat">
              <span className="fm-stat__label">Fitness</span>
              <span className="fm-stat__value">{avgFitness}</span>
            </div>
            <div className="fm-stat">
              <span className="fm-stat__label">Injured</span>
              <span className="fm-stat__value" style={{ color: injured.length > 0 ? 'var(--red)' : undefined }}>{injured.length}</span>
            </div>
            <div className="fm-stat">
              <span className="fm-stat__label">Unhappy</span>
              <span className="fm-stat__value" style={{ color: unhappy.length > 0 ? 'var(--gold)' : undefined }}>{unhappy.length}</span>
            </div>
          </div>
          {injured.length > 0 && (
            <button type="button" className="fm-msg-row" onClick={() => onOpenScreen('squad')} style={{ marginTop: 6 }}>
              <span className="fm-msg-row__main">
                <span className="fm-msg-row__title">{injured[0].name}</span>
                <span className="fm-msg-row__meta">
                  Back in {injured[0].injuryWeeks} week{injured[0].injuryWeeks === 1 ? '' : 's'}
                  {injured.length > 1 ? ` · +${injured.length - 1} more` : ''}
                </span>
              </span>
              <Icon name="chevron" size={14} />
            </button>
          )}
        </div>

        {/* Objectives, Transfers & Scouting, and League news all pulled from
            here — this screen is both the Hub landing and Matchday →
            Overview, and it was carrying the whole game's status at once.
            Objectives lives on Club → Board, Transfers/Scouting on the
            Market group, and League news was a plain ticker duplicating the
            inbox headline right below. What's left is the one thing this
            screen is actually for: is there something that needs me right
            now, and what's my next match. */}

        {/* Latest news + league table window. */}
        <div className="fm-mod">
          <div className="fm-mod__head">
            <h2 className="fm-mod__title">{leagueName(leagueId)}</h2>
            <span className="fm-actiondock__spacer" />
            <button type="button" className="fm-hint" style={{ margin: 0, background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }} onClick={() => onOpenScreen('table')}>
              Full table <Icon name="chevron" size={12} />
            </button>
          </div>
          {latestNews && (
            <button type="button" className="fm-hubnews" onClick={() => onOpenScreen('inbox')} style={{ marginBottom: 8 }}>
              <span className="fm-hubnews__head">
                <Icon name="inbox" size={12} />
                {!latestNews.read && <span className="fm-hubnews__tag">New</span>}
                <span className="fm-hubnews__cat">{latestNews.category}</span>
              </span>
              <span className="fm-hubnews__title">{latestNews.title}</span>
            </button>
          )}
          <table className="fm-table fm-hubtable__table">
            <tbody>
              {tableSlice.map((row, i) => {
                const c = state.clubs.find((cl) => cl.id === row.clubId)!;
                const isMe = row.clubId === state.userClubId;
                return (
                  <tr key={row.clubId} className={isMe ? 'me' : ''}>
                    <td>{tableStart + i + 1}</td>
                    <td>
                      <span className="fm-table__club-inner">
                        <Crest name={c.name} code={c.code} color={c.color} size={16} />
                        <span className="fm-table__club-name">{c.name}</span>
                      </span>
                    </td>
                    <td>{row.played}</td>
                    <td className="pts">{row.pts}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showPress && opponent && (
        <PressConferenceModal
          state={state}
          opponentName={opponent.name}
          onChange={onChange}
          onClose={() => setShowPress(false)}
        />
      )}

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
