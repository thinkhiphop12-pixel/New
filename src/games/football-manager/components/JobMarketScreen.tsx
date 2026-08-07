'use client';

import { useState } from 'react';
import type { GameState, JobOffer } from '@/engine/types';
import { applyForJob } from '@/engine/seasonProgression';
import {
  CHAIRMAN_BLURB, CHAIRMAN_LABEL, MID_SEASON_RESIGN_REP_COST, interviewOdds, interviewVerdict,
} from '@/engine/jobMarket';
import { getLeague, leagueName } from '@/engine/gameRules';
import { formatMoney } from '@/engine/utils';
import { Crest } from './Crest';
import { Icon } from './Icon';
import { Bar, ordinalSuffix } from './visuals';

/**
 * The Job Market: openings at other clubs, with what each board is actually
 * offering stated before you commit.
 *
 * A career here is a job you hold rather than a club you own, so this screen
 * is the other half of the Board screen — that one tells you how secure you
 * are, this one tells you where you could go instead. Applying while employed
 * *is* the resignation: you walk out of one job into another, which mid-season
 * costs reputation.
 */
export default function JobMarketScreen({
  state,
  onChange,
}: {
  state: GameState;
  onChange: (next: GameState) => void;
}) {
  const [confirming, setConfirming] = useState<number | null>(null);
  const [outcome, setOutcome] = useState<{ hired: boolean; message: string } | null>(null);

  const vacancies = state.vacancies ?? [];
  const club = state.clubs.find((c) => c.id === state.userClubId);
  const myLevel = club ? getLeague(club.leagueId).level : 99;
  const midSeason = state.week > 1;

  const apply = (clubId: number) => {
    const result = applyForJob(state, clubId);
    setConfirming(null);
    setOutcome({ hired: result.hired, message: result.message });
    onChange(result.state);
  };

  return (
    <>
      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>Your Standing</p>
        <Bar value={state.manager.reputation} label="Reputation" />
        <p className="fm-hint">
          {club ? `${club.name}, ${leagueName(club.leagueId)}` : 'Between jobs'} ·{' '}
          {state.manager.wins}W {state.manager.draws}D {state.manager.losses}L over{' '}
          {state.manager.seasons} season{state.manager.seasons === 1 ? '' : 's'}
          {state.manager.trophies.length > 0 && ` · ${state.manager.trophies.length} trophies`}
        </p>
        <p className="fm-hint">
          Boards hire on reputation. Win where you are and the bigger jobs open up on their own.
        </p>
      </div>

      {outcome && (
        <div className="fm-panel">
          <p
            className="fm-club-line"
            style={{ margin: 0, color: outcome.hired ? 'var(--green)' : 'var(--red)' }}
          >
            <Icon name={outcome.hired ? 'check' : 'cross'} size={14} style={{ verticalAlign: -2, marginRight: 6 }} />
            {outcome.message}
          </p>
          <button
            className="fm-btn fm-btn--small"
            style={{ marginTop: 8 }}
            onClick={() => setOutcome(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>
          Open Positions ({vacancies.length})
        </p>
        {vacancies.length === 0 ? (
          <p className="fm-hint">
            No clubs are looking right now. Boards lose patience as the season runs — check back after
            a few more rounds.
          </p>
        ) : (
          <p className="fm-hint">
            Every listing states the board&apos;s budget and expectation up front. Applying means leaving
            {club ? ` ${club.name}` : ' your club'}
            {midSeason && `, which mid-season costs you ${MID_SEASON_RESIGN_REP_COST} reputation`}.
          </p>
        )}
      </div>

      {vacancies.map((v) => (
        <VacancyCard
          key={v.clubId}
          state={state}
          offer={v}
          myLevel={myLevel}
          midSeason={midSeason}
          confirming={confirming === v.clubId}
          onConfirm={() => setConfirming(v.clubId)}
          onCancel={() => setConfirming(null)}
          onApply={() => apply(v.clubId)}
        />
      ))}
    </>
  );
}

function VacancyCard({
  state,
  offer,
  myLevel,
  midSeason,
  confirming,
  onConfirm,
  onCancel,
  onApply,
}: {
  state: GameState;
  offer: JobOffer;
  myLevel: number;
  midSeason: boolean;
  confirming: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onApply: () => void;
}) {
  const club = state.clubs.find((c) => c.id === offer.clubId);
  if (!club) return null;

  const league = getLeague(offer.leagueId);
  const odds = interviewOdds(state, offer);
  const shortfall = offer.repRequired - state.manager.reputation;
  // Level counts down towards the top flight, so a lower number is a step up.
  const move = league.level < myLevel ? 'up' : league.level > myLevel ? 'down' : 'across';

  return (
    <div className="fm-panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Crest name={club.name} code={club.code} color={club.color} size={36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="fm-club-line" style={{ margin: 0 }}>{club.name}</p>
          <span className="fm-player-row__sub">
            {leagueName(offer.leagueId)} · Tier {league.level}
            {move === 'up' && (
              <span style={{ color: 'var(--green)' }}>
                {' '}<Icon name="arrow-up" size={11} style={{ verticalAlign: -1 }} /> step up
              </span>
            )}
            {move === 'down' && (
              <span style={{ color: 'var(--red)' }}>
                {' '}<Icon name="arrow-down" size={11} style={{ verticalAlign: -1 }} /> step down
              </span>
            )}
          </span>
        </div>
      </div>

      <p className="fm-hint" style={{ marginTop: 8 }}>{offer.note}</p>

      <table className="fm-finance-table" style={{ marginTop: 8 }}>
        <tbody>
          <tr>
            <td>Transfer budget</td>
            <td style={{ textAlign: 'right' }}>{formatMoney(offer.budget)}</td>
          </tr>
          <tr>
            <td>Board expects</td>
            <td style={{ textAlign: 'right' }}>
              {offer.objective} ({offer.minPosition}
              {ordinalSuffix(offer.minPosition)} or better)
            </td>
          </tr>
          <tr>
            <td>Chairman</td>
            <td style={{ textAlign: 'right' }}>{CHAIRMAN_LABEL[offer.chairman]}</td>
          </tr>
          <tr>
            <td>Reputation wanted</td>
            <td
              style={{ textAlign: 'right', color: shortfall > 0 ? 'var(--red)' : 'var(--green)' }}
            >
              {offer.repRequired} (yours: {state.manager.reputation})
            </td>
          </tr>
          <tr>
            <td>Interview</td>
            <td style={{ textAlign: 'right' }}>{interviewVerdict(odds)} — {odds}%</td>
          </tr>
        </tbody>
      </table>

      <p className="fm-hint">{CHAIRMAN_BLURB[offer.chairman]}</p>

      {confirming ? (
        <div>
          <p className="fm-club-line" style={{ color: 'var(--gold)' }}>
            Apply to {club.name}?
          </p>
          <p className="fm-hint">
            {shortfall > 0
              ? `You are ${shortfall} short of what their board is looking for — the interview may go against you, and a rejection closes this job.`
              : 'You clear their reputation bar comfortably.'}
            {midSeason && ` Leaving mid-season costs you ${MID_SEASON_RESIGN_REP_COST} reputation.`}
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="fm-btn fm-btn--primary fm-btn--small" onClick={onApply}>
              {midSeason ? 'Resign & apply' : 'Apply'}
            </button>
            <button className="fm-btn fm-btn--small" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button className="fm-btn fm-btn--small" onClick={onConfirm}>
          Apply for this job
        </button>
      )}
    </div>
  );
}
