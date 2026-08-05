'use client';

import { CSSProperties } from 'react';
import type { GameState, Staff } from '@/engine/types';
import { ACADEMY_UPGRADE_COST, STADIUM_UPGRADE_COST, STAFF_MAX_LEVEL, STAFF_UPGRADE_COST, leagueName } from '@/engine/gameRules';
import {
  gateIncome, getStaff, getStadiumLevel, setCaptain, staffWageBill, upgradeAcademy, upgradeStadium,
  upgradeStaff, weeklyWageBill, computeTable, leagueFixtures, userLeague, userLeagueId,
} from '@/engine/seasonProgression';
import { getSquad } from '@/engine/teamManagement';
import { totalCapacity } from '@/engine/facilities';
import { traitNames } from '@/engine/traits';
import { formatMoney } from '@/engine/utils';
import { StatTile, ReputationStars } from './visuals';
import { Icon } from './Icon';

const STAFF_LABELS: Record<keyof Staff, string> = { coach: 'Assistant coach', physio: 'Physio', scout: 'Chief scout' };
const STAFF_BLURB: Record<keyof Staff, string> = {
  coach: 'Faster player development.',
  physio: 'Fewer injuries.',
  scout: 'Better scouting leads.',
};

function Bar({ value, label }: { value: number; label: string }) {
  const tone = value >= 65 ? 'good' : value >= 35 ? 'mid' : 'bad';
  return (
    <div className="fm-bar-row">
      <span className="fm-bar-row__label">{label}</span>
      <div className="fm-bar">
        <div className={`fm-bar__fill ${tone}`} style={{ width: `${value}%` }} />
      </div>
      <span className="fm-bar-row__value">{value}</span>
    </div>
  );
}

/** Last `count` league results for the user's club — the recent-form strip
 *  (mock: five W/D/L chips). Derived from played fixtures, same pattern TableScreen
 *  uses, since the engine doesn't store a running form string per club. */
function clubForm(state: GameState, clubId: number, count = 5): ('W' | 'D' | 'L')[] {
  const leagueId = userLeagueId(state);
  const played = leagueFixtures(state, leagueId)
    .filter((f) => f.played && (f.homeId === clubId || f.awayId === clubId))
    .sort((a, b) => a.round - b.round);
  return played.slice(-count).map((f) => {
    const isHome = f.homeId === clubId;
    const gf = isHome ? f.homeGoals : f.awayGoals;
    const ga = isHome ? f.awayGoals : f.homeGoals;
    return gf > ga ? 'W' : gf < ga ? 'L' : 'D';
  });
}


function FormChip({ result }: { result: 'W' | 'D' | 'L' }) {
  return (
    <span className={`fm-form-chip fm-form-chip--${result.toLowerCase()}`}>
      {result}
    </span>
  );
}

export default function ClubScreen({
  state,
  onChange,
}: {
  state: GameState;
  onChange: (next: GameState) => void;
}) {
  const m = state.manager;
  const wages = weeklyWageBill(state);
  const staffWages = staffWageBill(state);
  const gate = gateIncome(state);
  const upgradeCost = ACADEMY_UPGRADE_COST[state.academyLevel + 1];
  const staff = getStaff(state);
  const stadiumLevel = getStadiumLevel(state);
  const stadiumCost = STADIUM_UPGRADE_COST[stadiumLevel + 1];
  const squad = getSquad(state, state.userClubId).sort((a, b) => b.rating - a.rating);
  const captain = state.captainId != null ? state.players[state.captainId] : null;
  const legends = Object.values(state.legacy)
    .map((l) => ({ ...l, score: l.apps + l.goals * 2 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const club = state.clubs.find((c) => c.id === state.userClubId)!;
  const leagueId = userLeagueId(state);
  const lg = userLeague(state);
  const table = computeTable(state, leagueId);
  const posIndex = table.findIndex((r) => r.clubId === state.userClubId);
  const position = posIndex >= 0 ? posIndex + 1 : 0;
  const clubCount = lg.clubCount;
  // Ring fill: further up the table = fuller ring. Position 1/20 → 100%.
  const positionPct = position > 0 && clubCount > 0
    ? Math.max(0, Math.min(100, ((clubCount - position) / Math.max(1, clubCount - 1)) * 100))
    : 0;
  const form = clubForm(state, state.userClubId);

  const fs = state.facilities;
  const capUsed = fs ? totalCapacity(fs) : 0;
  const capMax = fs ? fs.groundCapacityCap : 0;

  return (
    <>
      {/* ── Hero: position ring + reputation + recent form ── */}
      <div className="fm-panel">
        <div className="fm-hero-rings">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div
              className="fm-ring fm-ring--lg"
              style={
                {
                  '--ring-pct': positionPct,
                  '--ring-color': position <= Math.ceil(clubCount / 3) ? 'var(--green)' : position <= Math.ceil(clubCount * 2 / 3) ? 'var(--gold)' : 'var(--red)',
                } as CSSProperties
              }
            >
              <span className="fm-ring__value">{position}</span>
            </div>
            <span className="fm-hero-rings__pos-num">{position}{ordinalSuffix(position)}</span>
            <span className="fm-hero-rings__pos-sub">of {clubCount} · {leagueName(leagueId)}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <ReputationStars value={club.reputation ?? 1} title={`Reputation ${club.reputation ?? 1}/5`} />
            <span className="fm-hero-rings__pos-sub">Club reputation</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginLeft: 'auto' }}>
            <span className="fm-hero-rings__pos-sub">Recent form (last {form.length})</span>
            <span className="fm-form-strip">
              {form.length > 0 ? (
                form.map((r, i) => <FormChip key={i} result={r} />)
              ) : (
                <span className="fm-hint" style={{ margin: 0 }}>No results yet this season.</span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* ── Budget overview + quick stats ── */}
      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>Budget Overview</p>
        <p style={{ fontSize: '28px', fontWeight: 900, color: 'var(--green)', margin: '4px 0 12px' }}>
          {formatMoney(state.budget)}
          <span className="fm-hint" style={{ display: 'block', fontSize: 10, marginTop: 4, textAlign: 'left', color: 'var(--muted)' }}>
            transfer + wage budget
          </span>
        </p>
        <div className="fm-qstat" style={{ marginBottom: 8 }}>
          <span className="fm-qstat__icon"><Icon name="trend" size={16} /></span>
          <span className="fm-qstat__val">{formatMoney(wages)}/wk</span>
          <span className="fm-qstat__lbl">player wages</span>
          <span className="fm-qstat__lbl" style={{ marginLeft: 12 }}>{staffWages > 0 ? `${formatMoney(staffWages)}/wk` : 'no staff wages'}</span>
        </div>
        <div className="fm-qstat" style={{ marginBottom: 8 }}>
          <span className="fm-qstat__icon"><Icon name="stadium" size={16} /></span>
          <span className="fm-qstat__val">{gate > 0 ? formatMoney(gate) : '—'}/wk</span>
          <span className="fm-qstat__lbl">gate income</span>
          <span className="fm-qstat__lbl" style={{ marginLeft: 12 }}>
            {capMax ? `${capUsed.toLocaleString()} / ${capMax.toLocaleString()} cap` : 'capacity N/A'}
          </span>
        </div>
        <div className="fm-qstat">
          <span className="fm-qstat__icon"><Icon name="finances" size={16} /></span>
          <span className="fm-qstat__val">{getSquad(state, state.userClubId).length}</span>
          <span className="fm-qstat__lbl">squad size</span>
          <span className="fm-qstat__lbl" style={{ marginLeft: 12 }}>{m.wins}W {m.draws}D {m.losses}L</span>
        </div>
      </div>

      {/* ── Stadium & facilities quick stats ── */}
      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>Stadium & Facilities</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px 14px' }}>
          <StatTile icon={<Icon name="stadium" size={14} />} value={stadiumLevel} label={`Stadium L${stadiumLevel}`} />
          <StatTile icon={<Icon name="sprout" size={14} />} value={state.academyLevel} label={`Academy L${state.academyLevel}`} />
          {staff.coach ? <StatTile icon={<Icon name="staff" size={14} />} value={staff.coach} label="Coach" /> : <StatTile icon={<Icon name="staff" size={14} />} value="—" label="Coach" />}
          {staff.physio ? <StatTile icon={<Icon name="injury" size={14} />} value={staff.physio} label="Physio" /> : <StatTile icon={<Icon name="injury" size={14} />} value="—" label="Physio" />}
          {staff.scout ? <StatTile icon={<Icon name="binoculars" size={14} />} value={staff.scout} label="Scout" /> : <StatTile icon={<Icon name="binoculars" size={14} />} value="—" label="Scout" />}
        </div>
        {capMax > 0 && (
          <div style={{ marginTop: 10 }}>
            <div className="fm-attendance__track">
              <div
                className="fm-attendance__fill"
                style={{ width: `${Math.min(100, (capUsed / capMax) * 100)}%`, background: 'var(--green)' }}
              />
            </div>
            <span className="fm-hint" style={{ marginTop: 4, display: 'block' }}>
              Capacity {capUsed.toLocaleString()} / {capMax.toLocaleString()} ({Math.round((capUsed / capMax) * 100)}%)
            </span>
          </div>
        )}
      </div>

      {/* ── Existing panels preserved ── */}

      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>
          Manager — {m.name}
        </p>
        <p className="fm-club-line">
          Reputation {m.reputation} · {m.seasons} season{m.seasons === 1 ? '' : 's'} · Record {m.wins}W {m.draws}D{' '}
          {m.losses}L
        </p>
        {m.trophies.length > 0 ? (
          <ul className="fm-news">
            {m.trophies.slice(-6).map((t, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="trophy" size={13} /> {t}</li>
            ))}
          </ul>
        ) : (
          <p className="fm-hint" style={{ textAlign: 'left', margin: 0 }}>
            No trophies yet — the cabinet is waiting.
          </p>
        )}
      </div>

      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>
          Boardroom & fans
        </p>
        <p className="fm-club-line">Objective: {state.board.objective}</p>
        <Bar value={state.board.confidence} label="Board" />
        <Bar value={state.fanConfidence} label="Fans" />
        <Bar value={state.chemistry} label="Chemistry" />
        <p className="fm-hint" style={{ textAlign: 'left', marginBottom: 0 }}>
          Board confidence under 20 at season end = sacked.
        </p>
      </div>

      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>
          Finances
        </p>
        <p className="fm-club-line">
          Weekly: {formatMoney(gate)} gate income − {formatMoney(wages)} player wages
          {staffWages > 0 ? ` − ${formatMoney(staffWages)} staff wages` : ''} ={' '}
          <strong style={{ color: gate - wages - staffWages >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {formatMoney(gate - wages - staffWages)}
          </strong>
        </p>
        {state.ledger.length > 0 && (
          <ul className="fm-ledger">
            {state.ledger.slice(0, 10).map((e, i) => (
              <li key={i}>
                <span className="wk">W{e.week}</span>
                <span>{e.desc}</span>
                <span className={e.amount >= 0 ? 'in' : 'out'}>
                  {e.amount >= 0 ? '+' : ''}
                  {formatMoney(e.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>
          Youth academy — level {state.academyLevel}
        </p>
        <p className="fm-club-line">
          {state.academyLevel >= 3 ? 'Two top prospects graduate each season.' : 'One prospect graduates each season.'}
        </p>
        {upgradeCost && (
          <button
            className="fm-btn fm-btn--secondary fm-btn--small"
            disabled={upgradeCost > state.budget}
            onClick={() => onChange(upgradeAcademy(state))}
          >
            Upgrade to level {state.academyLevel + 1} — {formatMoney(upgradeCost)}
          </button>
        )}
      </div>

      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>
          Captain
        </p>
        <p className="fm-club-line">
          {captain ? `${captain.name} wears the armband.` : 'No captain appointed — pick a Leader.'}
        </p>
        <div className="fm-pills">
          {squad.slice(0, 8).map((p) => (
            <button
              key={p.id}
              className={`fm-pill${state.captainId === p.id ? ' active' : ''}`}
              onClick={() => onChange(setCaptain(state, state.captainId === p.id ? null : p.id))}
            >
              {p.name}
              {traitNames(p).includes('Leader') && <Icon name="star" size={11} style={{ marginLeft: 4, verticalAlign: -1 }} />}
            </button>
          ))}
        </div>
      </div>

      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>
          Backroom staff
        </p>
        {(Object.keys(STAFF_LABELS) as (keyof Staff)[]).map((role) => {
          const level = staff[role];
          const cost = STAFF_UPGRADE_COST[level + 1];
          return (
            <div key={role} style={{ marginBottom: 10 }}>
              <p className="fm-club-line" style={{ marginBottom: 4 }}>
                <strong>{STAFF_LABELS[role]}</strong> — level {level}/{STAFF_MAX_LEVEL}. {STAFF_BLURB[role]}
              </p>
              {level < STAFF_MAX_LEVEL && (
                <button
                  className="fm-btn fm-btn--secondary fm-btn--small"
                  disabled={cost > state.budget}
                  onClick={() => onChange(upgradeStaff(state, role))}
                >
                  Hire level {level + 1} — {formatMoney(cost)}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>
          Stadium — level {stadiumLevel}/3
        </p>
        <p className="fm-club-line">
          {stadiumLevel >= 3 ? 'Fully expanded.' : 'Each level raises gate income 25%.'}
        </p>
        {stadiumCost && (
          <button
            className="fm-btn fm-btn--secondary fm-btn--small"
            disabled={stadiumCost > state.budget}
            onClick={() => onChange(upgradeStadium(state))}
          >
            Expand to level {stadiumLevel + 1} — {formatMoney(stadiumCost)}
          </button>
        )}
      </div>

      <div className="fm-panel">
        <p className="fm-label" style={{ marginTop: 0 }}>
          Records & legends
        </p>
        <div className="fm-attr-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <StatTile icon={<Icon name="net" />} value={state.records.biggestWin?.text ?? '—'} label="Biggest win" />
          <StatTile
            icon={<Icon name="medal" />}
            value={state.records.bestFinish ? `${state.records.bestFinish.position}${ordinalSuffix(state.records.bestFinish.position)}` : '—'}
            label={state.records.bestFinish ? `${leagueName(state.records.bestFinish.leagueId)}, ${state.records.bestFinish.year}` : 'Best finish'}
          />
          <StatTile
            icon={<Icon name="goal" />}
            value={state.records.topSeasonScorer ? state.records.topSeasonScorer.goals : '—'}
            label={state.records.topSeasonScorer ? `${state.records.topSeasonScorer.name} (${state.records.topSeasonScorer.year})` : 'Top scorer'}
          />
        </div>
        {legends.length > 0 && (
          <>
            <p className="fm-label">Club legends</p>
            <ul className="fm-news">
              {legends.map((l, i) => (
                <li key={i}>
                  {l.name} — {l.apps} apps, {l.goals} goals
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </>
  );
}

function ordinalSuffix(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return 'th';
  return ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
}
