'use client';

import { useState } from 'react';
import type { GameState, Position } from '@/engine/types';
import { newScouting } from '@/engine/facilities';
import { getPlayerReports, getScouts, hireScout, fireScout, reassignScout, SCOUT_REGIONS, scoutWage } from '@/engine/scouting';
import { getSquad } from '@/engine/teamManagement';
import { formatMoney } from '@/engine/utils';

const POSITIONS: Position[] = ['GK', 'DEF', 'MID', 'FWD'];

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
  if (!state.scouting) onChange({ ...state, scouting: newScouting() });

  const scouts = getScouts(state);
  const reports = getPlayerReports(state);
  const squad = getSquad(state, state.userClubId);
  const weakest = weakestPosition(squad);

  // Recommended = plays the squad's weakest position and would be an
  // upgrade on the average there — not just "a name that arrived", a
  // report worth actually looking at first. Recommended reports float to
  // the top; everything else stays in arrival order underneath.
  const rankedReports = [...reports].sort((a, b) => {
    const pa = state.players[a.playerId];
    const pb = state.players[b.playerId];
    const recA = pa && pa.pos === weakest.pos && pa.rating > weakest.avgRating;
    const recB = pb && pb.pos === weakest.pos && pb.rating > weakest.avgRating;
    if (recA !== recB) return recA ? -1 : 1;
    return 0;
  });

  return (
    <>
      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>Scouting Network</p>
        <p className="fm-club-line">
          Hire scouts and assign each a region. Higher star ratings file leads faster and find better
          players. Leads land on your shortlist and in your inbox, ready to pursue from Transfers.
        </p>
      </div>

      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>Hire a Scout</p>
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
          <button
            className="fm-btn fm-btn--secondary fm-btn--small"
            onClick={() => onChange(hireScout(state, hireStars, hireRegion))}
          >
            Hire — {formatMoney(scoutWage(hireStars))}/wk
          </button>
        </div>
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
                  Assigned to {scout.region} · {formatMoney(scout.wage)}/wk
                </p>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <select value={scout.region} onChange={(e) => onChange(reassignScout(state, scout.id, e.target.value))}>
                  {SCOUT_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <button className="fm-btn fm-btn--ghost fm-btn--small" onClick={() => onChange(fireScout(state, scout.id))}>
                  Release
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>Recent Leads</p>
        <p className="fm-hint" style={{ textAlign: 'left', margin: '0 0 10px' }}>
          Weakest position right now: <strong>{weakest.pos}</strong> (avg {Math.round(weakest.avgRating)}). Reports that would upgrade it are flagged below.
        </p>
        {reports.length === 0 ? (
          <p className="fm-hint">No leads filed yet — hire a scout and assign him a region.</p>
        ) : (
          rankedReports.slice(0, 10).map((r) => {
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

    </>
  );
}
