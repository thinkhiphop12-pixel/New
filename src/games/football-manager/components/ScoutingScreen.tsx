'use client';

import { useState } from 'react';
import type { GameState } from '@/engine/types';
import { newScouting } from '@/engine/facilities';
import { getPlayerReports, getScouts, hireScout, fireScout, reassignScout, SCOUT_REGIONS, scoutWage } from '@/engine/scouting';
import { formatMoney } from '@/engine/utils';
import { Pulse } from './SectionHub';

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

  return (
    <>
      {/* Was a three-line paragraph explaining the feature. The same facts
          are legible as numbers, and the one thing prose was needed for
          (where leads end up) is one short line under them. */}
      <Pulse
        items={[
          { icon: 'binoculars', label: 'Scouts', value: String(scouts.length), tone: scouts.length ? 'green' : 'gold' },
          { icon: 'document', label: 'Leads filed', value: String(reports.length) },
          { icon: 'flag', label: 'Regions', value: `${new Set(scouts.map((s) => s.region)).size}/${SCOUT_REGIONS.length}` },
          { icon: 'money-out', label: 'Weekly cost', value: formatMoney(scouts.reduce((n, s) => n + s.wage, 0)) },
        ]}
      />

      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>Hire a Scout</p>
        <p className="fm-hint" style={{ marginTop: 0 }}>
          More stars, faster and better leads. Leads land on your shortlist, ready to pursue from Transfers.
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
        {reports.length === 0 ? (
          <p className="fm-hint">No leads filed yet — hire a scout and assign him a region.</p>
        ) : (
          reports.slice(0, 10).map((r) => {
            const player = state.players[r.playerId];
            return (
              <div key={r.id} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid var(--border-soft)' }}>
                <span className="fm-club-line">{player ? player.name : 'Unknown player'} — {r.region}, S{r.yearGenerated} wk{r.weekGenerated}</span>
                <p className="fm-hint" style={{ margin: '2px 0 0' }}>{r.note}</p>
              </div>
            );
          })
        )}
      </div>

    </>
  );
}
