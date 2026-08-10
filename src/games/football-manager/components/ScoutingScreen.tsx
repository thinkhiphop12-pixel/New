'use client';

import { useEffect, useState } from 'react';
import type { GameState, Position, ScoutAssignmentKind } from '@/engine/types';
import { assignScout, newScouting } from '@/engine/facilities';
import {
  expectedLeadWeeks, getPlayerReports, getScouts, hireScout, fireScout, reassignScout,
  SCOUT_REGIONS, scoutWage,
} from '@/engine/scouting';
import { getSquad } from '@/engine/teamManagement';
import { formatMoney } from '@/engine/utils';
import { Icon } from './Icon';
import { Pulse } from './SectionHub';
import { pushToast } from './ToastQueue';

const POSITIONS: Position[] = ['GK', 'DEF', 'MID', 'FWD'];

/** The three one-off assignments, with the weeks each takes. Durations mirror
 *  `assignmentDuration` in engine/facilities.ts — quoted up front because
 *  "how long does this take?" was previously unanswerable anywhere in the
 *  game: you assigned a scout and simply waited, with nothing to wait for. */
const ASSIGNMENTS: { kind: ScoutAssignmentKind; label: string; weeks: number; blurb: string }[] = [
  {
    kind: 'player-search',
    label: 'Player search',
    weeks: 2,
    blurb: 'Comes back with three transfer targets, straight onto your shortlist.',
  },
  {
    kind: 'youth',
    label: 'Youth search',
    weeks: 3,
    blurb: 'Same, but only players aged 20 and under.',
  },
  {
    kind: 'opponent',
    label: 'Scout an opponent',
    weeks: 1,
    blurb: 'A written report on one club: how they play, and where they can be got at.',
  },
];

function avg(nums: number[]): number {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

/** The squad's weakest position by average rating — a report on a player
 *  who plays it and beats that average is a genuine upgrade, not just a
 *  name. Ties break toward GK/DEF/MID/FWD order (arbitrary but stable, so
 *  the "weakest" label doesn't flicker between reports for no reason). */
function weakestPosition(squad: { pos: Position; rating: number }[]): { pos: Position; avgRating: number } {
  let weakest = { pos: POSITIONS[0], avgRating: Infinity };
  for (const pos of POSITIONS) {
    const inPos = squad.filter((p) => p.pos === pos);
    const rating = inPos.length ? avg(inPos.map((p) => p.rating)) : 0;
    if (rating < weakest.avgRating) weakest = { pos, avgRating: rating };
  }
  return weakest;
}

/**
 * Scouting network: hire named scouts (1-5 stars), each assigned to a
 * region, who periodically file transfer-target leads — real players added
 * to the shared shortlist (engine/facilities.ts) with a report in the inbox.
 * Feeds straight into the existing TransfersScreen; no separate pipeline.
 * Youth academy intake now has its own screen (YouthAcademyScreen, under the
 * Club group's Academy tab) rather than a static summary card here.
 *
 * The one-off assignments below (`assignScout`) are the *other* half of
 * scouting, and until now they had no entry point at all: the Transfers
 * screen's "Hub" tab was the only place they could be started, and that tab
 * was deleted. The engine kept ticking them (`tickFacilitiesWeek`, called
 * from the weekly round), so the feature was live but unreachable — and
 * because a player-search assignment is what marks a shortlisted player as
 * "scouted", every name on the shortlist sat on "report pending" forever.
 * They belong on this screen, next to the scouts who run them.
 */
export default function ScoutingScreen({
  state,
  onChange,
}: {
  state: GameState;
  onChange: (next: GameState) => void;
}) {
  const [hireStars, setHireStars] = useState(3);
  const [hireRegion, setHireRegion] = useState<string>(SCOUT_REGIONS[0]);
  // Lazy-init on the trailing edge of render, not during it — calling
  // onChange synchronously here (the original code) triggered React's
  // "Cannot update a component while rendering a different component"
  // warning on this screen every time a save predates scouting.
  useEffect(() => {
    if (!state.scouting) onChange({ ...state, scouting: newScouting() });
  }, [state, onChange]);

  const sc = state.scouting ?? newScouting();
  const scouts = getScouts(state);
  const reports = getPlayerReports(state);
  const squad = getSquad(state, state.userClubId);
  const weakest = weakestPosition(squad);
  const activeAssignments = sc.assignments.filter((a) => !a.complete);
  const opponentClubs = state.clubs.filter((c) => c.id !== state.userClubId && !c.dormant);

  const hire = () => {
    onChange(hireScout(state, hireStars, hireRegion));
    pushToast(
      `${hireStars}★ scout hired for ${hireRegion} — expect his first lead in about ${expectedLeadWeeks(hireStars)} weeks.`,
      'success',
    );
  };

  const assign = (kind: ScoutAssignmentKind, weeks: number, targetClubId?: number) => {
    onChange(assignScout(state, kind, targetClubId));
    const what = targetClubId != null
      ? state.clubs.find((c) => c.id === targetClubId)?.name ?? 'that club'
      : ASSIGNMENTS.find((a) => a.kind === kind)?.label.toLowerCase() ?? 'the search';
    pushToast(`Scout sent out: ${what}. Report due in ${weeks} week${weeks === 1 ? '' : 's'}.`, 'success');
  };

  return (
    <>
      {/* Was a three-line paragraph explaining the feature. The same facts
          are legible as numbers, and the one thing prose was needed for
          (where leads end up) is one short line under them. */}
      <Pulse
        items={[
          { icon: 'binoculars', label: 'Scouts', value: String(scouts.length), tone: scouts.length ? 'green' : 'gold' },
          { icon: 'document', label: 'Leads filed', value: String(reports.length) },
          { icon: 'calendar', label: 'Out in the field', value: String(activeAssignments.length), tone: activeAssignments.length ? 'green' : 'plain' },
          { icon: 'money-out', label: 'Weekly cost', value: formatMoney(scouts.reduce((n, s) => n + s.wage, 0)) },
        ]}
      />

      <div className="fm-panel" data-tour="scouting-hire">
        <p className="fm-label" style={{ marginTop: 0 }}>Hire a Scout</p>
        <p className="fm-hint" style={{ marginTop: 0, textAlign: 'left' }}>
          A scout on your books works his region permanently, filing a lead whenever he finds someone.
          More stars means better players and a shorter wait. Leads land on your shortlist and in your
          inbox, ready to pursue from Transfers.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <label className="fm-hint">
            Stars{' '}
            <select value={hireStars} onChange={(e) => setHireStars(Number(e.target.value))}>
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}★</option>)}
            </select>
          </label>
          <label className="fm-hint">
            Region{' '}
            <select value={hireRegion} onChange={(e) => setHireRegion(e.target.value)}>
              {SCOUT_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
          <button className="fm-btn fm-btn--secondary fm-btn--small" onClick={hire}>
            Hire — {formatMoney(scoutWage(hireStars))}/wk
          </button>
        </div>
        {/* The answer to "how long does a scout take", quoted before you pay
            rather than discovered by waiting and wondering. */}
        <p className="fm-hint" style={{ margin: '8px 0 0', textAlign: 'left' }}>
          A {hireStars}★ scout files a lead roughly every{' '}
          <strong>{expectedLeadWeeks(hireStars)} weeks</strong>. It is a rolling chance each week, not a
          countdown — some come sooner, some later.
        </p>
      </div>

      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>Your Scouts</p>
        {scouts.length === 0 ? (
          <p className="fm-hint">No scouts hired yet.</p>
        ) : (
          scouts.map((scout) => (
            <div key={scout.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid var(--border-soft)' }}>
              <div>
                <span className="fm-club-line">
                  {'★'.repeat(scout.stars)}{'☆'.repeat(5 - scout.stars)} {scout.name}
                </span>
                <p className="fm-hint" style={{ margin: '2px 0 0' }}>
                  Assigned to {scout.region} · {formatMoney(scout.wage)}/wk · a lead about every {expectedLeadWeeks(scout.stars)} weeks
                </p>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <select
                  value={scout.region}
                  aria-label={`Region for ${scout.name}`}
                  onChange={(e) => {
                    onChange(reassignScout(state, scout.id, e.target.value));
                    pushToast(`${scout.name} reassigned to ${e.target.value}.`, 'info');
                  }}
                >
                  {SCOUT_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <button
                  className="fm-btn fm-btn--ghost fm-btn--small"
                  onClick={() => {
                    onChange(fireScout(state, scout.id));
                    pushToast(`${scout.name} released — ${formatMoney(scout.wage)}/wk off the wage bill.`, 'info');
                  }}
                >
                  Release
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* One-off jobs, distinct from the permanent scouts above: you send
          someone out, and a fixed number of weeks later a specific thing
          comes back. */}
      <div className="fm-panel" data-tour="scouting-assign">
        <p className="fm-label" style={{ marginTop: 0 }}>Send a scout out</p>
        <p className="fm-hint" style={{ marginTop: 0, textAlign: 'left' }}>
          A one-off job with a fixed deadline. Time only passes when you advance it from the dock, so
          &ldquo;2 weeks&rdquo; means two weeks of simulated football, not two weeks of sitting here.
        </p>
        <div className="fm-assign-grid">
          {ASSIGNMENTS.map((a) => (
            <div key={a.kind} className="fm-assign-card">
              <span className="fm-assign-card__head">
                <Icon name="binoculars" size={15} />
                <span className="fm-assign-card__label">{a.label}</span>
                <span className="fm-assign-card__weeks">{a.weeks}wk</span>
              </span>
              <p className="fm-assign-card__blurb">{a.blurb}</p>
              {a.kind === 'opponent' ? (
                <select
                  className="fm-search"
                  defaultValue=""
                  aria-label="Choose a club to scout"
                  onChange={(e) => {
                    const clubId = Number(e.target.value);
                    if (clubId) assign('opponent', a.weeks, clubId);
                    e.target.value = '';
                  }}
                >
                  <option value="" disabled>Choose a club…</option>
                  {opponentClubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              ) : (
                <button
                  className="fm-btn fm-btn--secondary fm-btn--small fm-btn--full"
                  onClick={() => assign(a.kind, a.weeks)}
                >
                  Send him out
                </button>
              )}
            </div>
          ))}
        </div>

        {activeAssignments.length > 0 ? (
          <ul className="fm-news" style={{ marginTop: 12 }}>
            {activeAssignments.map((a) => {
              const total = Math.max(1, a.dueWeek - a.startWeek);
              const progress = Math.max(0, Math.min(100, Math.round((1 - a.weeksRemaining / total) * 100)));
              const what =
                a.kind === 'opponent'
                  ? state.clubs.find((c) => c.id === a.targetClubId)?.name ?? 'An opponent'
                  : a.kind === 'youth' ? 'Youth search' : 'Player search';
              return (
                <li key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="fm-icon-tile fm-icon-tile--sm"><Icon name="binoculars" size={16} /></span>
                  <span style={{ flex: 1 }}>
                    {what}
                    <span className="fm-hint" style={{ display: 'block' }}>
                      {a.scoutName} · back in {a.weeksRemaining} week{a.weeksRemaining === 1 ? '' : 's'} (week {a.dueWeek})
                    </span>
                  </span>
                  <span className="fm-hint">{progress}%</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="fm-hint" style={{ marginTop: 12 }}>Nobody out on a job right now.</p>
        )}
      </div>

      <div className="fm-panel" data-tour="scouting-leads">
        <p className="fm-label" style={{ marginTop: 0 }}>Recent Leads</p>
        <p className="fm-hint" style={{ textAlign: 'left', margin: '0 0 10px' }}>
          Weakest position right now: <strong>{weakest.pos}</strong> (avg {Math.round(weakest.avgRating)}). Reports that would upgrade it are flagged below.
        </p>
        {reports.length === 0 ? (
          <p className="fm-hint">
            No leads filed yet — hire a scout and assign him a region, then advance time from the dock.
          </p>
        ) : (
          [...reports]
            .sort((a, b) => {
              const pa = state.players[a.playerId];
              const pb = state.players[b.playerId];
              const recA = !!pa && pa.pos === weakest.pos && pa.rating > weakest.avgRating;
              const recB = !!pb && pb.pos === weakest.pos && pb.rating > weakest.avgRating;
              if (recA !== recB) return recA ? -1 : 1;
              return 0;
            })
            .slice(0, 10)
            .map((r) => {
              const player = state.players[r.playerId];
              const recommended = !!player && player.pos === weakest.pos && player.rating > weakest.avgRating;
              return (
                <div key={r.id} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid var(--border-soft)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {recommended && (
                      <span className="fm-pill active" style={{ fontSize: 10 }}>Recommended</span>
                    )}
                    <span className="fm-club-line">{player ? player.name : 'Unknown player'} — {r.region}, S{r.yearGenerated} wk{r.weekGenerated}</span>
                  </div>
                  {recommended && player && (
                    <p className="fm-hint" style={{ margin: '2px 0 0', color: 'var(--green)' }}>
                      Fills your weakest position ({weakest.pos}, avg {Math.round(weakest.avgRating)}) — rated {player.rating}.
                    </p>
                  )}
                  <p className="fm-hint" style={{ margin: '2px 0 0' }}>{r.note}</p>
                </div>
              );
            })
        )}
      </div>

      {sc.reports.length > 0 && (
        <div className="fm-panel">
          <p className="fm-label" style={{ marginTop: 0 }}>Opponent reports</p>
          {sc.reports.slice(0, 5).map((r) => (
            <div key={r.id} style={{ marginBottom: 8 }}>
              <p className="fm-club-line" style={{ margin: 0 }}>
                {state.clubs.find((c) => c.id === r.clubId)?.name ?? 'Unknown club'} — {r.summary}
              </p>
              <p className="fm-hint" style={{ margin: 0 }}>
                Strengths: {r.strengths.join(', ') || 'none noted'} · Weaknesses: {r.weaknesses.join(', ') || 'none noted'}
              </p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
