'use client';

import type { GameState, Staff } from '@/engine/types';
import { ACADEMY_UPGRADE_COST, STAFF_MAX_LEVEL, STAFF_UPGRADE_COST, leagueName } from '@/engine/gameRules';
import {
  getStaff, setCaptain, staffWageBill, upgradeAcademy,
  upgradeStaff, weeklyWageBill, computeTable, userLeague, userLeagueId,
} from '@/engine/seasonProgression';
import { getSquad } from '@/engine/teamManagement';
import { groundCapacity } from '@/engine/facilities';
import { traitNames } from '@/engine/traits';
import { formatMoney } from '@/engine/utils';
import { StatTile, ReputationStars, ordinalSuffix, Bar, clubForm, FormChip } from './visuals';
import { Icon } from './Icon';

const STAFF_LABELS: Record<keyof Staff, string> = { coach: 'Assistant coach', physio: 'Physio', scout: 'Chief scout' };
const STAFF_BLURB: Record<keyof Staff, string> = {
  coach: 'Faster player development.',
  physio: 'Fewer injuries.',
  scout: 'Better scouting leads.',
};

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
  const upgradeCost = ACADEMY_UPGRADE_COST[state.academyLevel + 1];
  const staff = getStaff(state);
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
  const form = clubForm(state, state.userClubId);

  const capacity = groundCapacity(state, state.userClubId);

  return (
    <>
      {/* ── Hero: reputation + recent form + table position ── */}
      <div className="fm-panel">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 8 }}>
          <div>
            <p className="fm-label" style={{ margin: '0 0 6px' }}>Position</p>
            <p style={{ fontSize: 24, fontWeight: 900, color: position <= Math.ceil(clubCount / 3) ? 'var(--green)' : position <= Math.ceil(clubCount * 2 / 3) ? 'var(--gold)' : 'var(--red)', margin: 0 }}>
              {position}{ordinalSuffix(position)}
            </p>
            <p className="fm-hint" style={{ margin: '2px 0 0' }}>of {clubCount}</p>
          </div>
          <div>
            <p className="fm-label" style={{ margin: '0 0 6px' }}>Reputation</p>
            <ReputationStars value={club.reputation ?? 1} title={`Reputation ${club.reputation ?? 1}/5`} />
          </div>
        </div>
        {form.length > 0 && (
          <div>
            <p className="fm-label" style={{ margin: '0 0 6px' }}>Recent form</p>
            <span className="fm-form-strip">
              {form.map((r, i) => <FormChip key={i} result={r} />)}
            </span>
          </div>
        )}
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
          <span className="fm-qstat__val">{capacity ? capacity.toLocaleString() : '—'}</span>
          <span className="fm-qstat__lbl">ground capacity</span>
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
          <StatTile icon={<Icon name="stadium" size={14} />} value={capacity.toLocaleString()} label="Capacity" />
          <StatTile icon={<Icon name="sprout" size={14} />} value={state.academyLevel} label={`Academy L${state.academyLevel}`} />
          {staff.coach ? <StatTile icon={<Icon name="staff" size={14} />} value={staff.coach} label="Coach" /> : <StatTile icon={<Icon name="staff" size={14} />} value="—" label="Coach" />}
          {staff.physio ? <StatTile icon={<Icon name="injury" size={14} />} value={staff.physio} label="Physio" /> : <StatTile icon={<Icon name="injury" size={14} />} value="—" label="Physio" />}
          {staff.scout ? <StatTile icon={<Icon name="binoculars" size={14} />} value={staff.scout} label="Scout" /> : <StatTile icon={<Icon name="binoculars" size={14} />} value="—" label="Scout" />}
        </div>
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
        {((state.managerProfile?.coachingStyles?.length ?? 0) > 0 ||
          (state.managerProfile?.personality?.length ?? 0) > 0) && (
          <p className="fm-hint" style={{ textAlign: 'left', margin: '0 0 0.5rem 0' }}>
            {state.managerProfile?.coachingStyles?.length ? state.managerProfile.coachingStyles.join(', ') : ''}
            {state.managerProfile?.coachingStyles?.length && state.managerProfile?.personality?.length ? ' — ' : ''}
            {state.managerProfile?.personality?.length ? state.managerProfile.personality.join(', ') : ''}
          </p>
        )}
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
          Transfer budget{' '}
          <strong style={{ color: state.budget >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {formatMoney(state.budget)}
          </strong>
          {' '}· wage bill {formatMoney(wages)}/wk
          {staffWages > 0 ? ` plus ${formatMoney(staffWages)}/wk of staff` : ''}
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
