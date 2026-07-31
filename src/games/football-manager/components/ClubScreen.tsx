'use client';

import type { GameState, Staff } from '@/engine/types';
import { ACADEMY_UPGRADE_COST, STADIUM_UPGRADE_COST, STAFF_MAX_LEVEL, STAFF_UPGRADE_COST, leagueName } from '@/engine/gameRules';
import {
  gateIncome, getStadiumLevel, getStaff, setCaptain, staffWageBill, upgradeAcademy, upgradeStadium,
  upgradeStaff, weeklyWageBill,
} from '@/engine/seasonProgression';
import { getSquad } from '@/engine/teamManagement';
import { traitNames } from '@/engine/traits';
import { formatMoney } from '@/engine/utils';
import { StatTile } from './visuals';
import { Icon } from './Icon';
import type { Tab } from './HubScreen';

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

export default function ClubScreen({
  state,
  onChange,
  onNavigate,
}: {
  state: GameState;
  onChange: (next: GameState) => void;
  onNavigate: (tab: Tab) => void;
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

  return (
    <>
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

      {/* Facilities runs the same academy/staff/stadium upgrades as timed
          building projects. Two views of one club, so link them explicitly. */}
      <button className="fm-inline-link" onClick={() => onNavigate('facilities')}>
        Plan longer-term building projects in Facilities <Icon name="chevron" size={12} />
      </button>

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
            value={state.records.bestFinish ? `${state.records.bestFinish.position}${ord(state.records.bestFinish.position)}` : '—'}
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

function ord(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return 'th';
  return ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
}
