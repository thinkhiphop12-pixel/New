'use client';

import { useMemo, useState } from 'react';
import { Icon } from './Icon';
import type { GameState, Player, Position } from '@/engine/types';
import { getSquad, isOnLoan } from '@/engine/teamManagement';
import { getYouthSquad, promoteYouthPlayer, starsForPotential } from '@/engine/youthAcademy';
import { MAX_SQUAD_SIZE } from '@/engine/gameRules';
import { getRole } from '@/lib/playerRoles';
import PlayerModal from './PlayerModal';
import { pushToast } from './ToastQueue';

/**
 * The squad, as a list.
 *
 * This screen used to open with the formation summary, the tactics accordion
 * and an interactive pitch — all three of which are what the *Tactics* tab one
 * across is for. The roster itself then sat underneath in two side-by-side
 * columns (GK+DEF | MID+FWD), which meant the one thing a list is good for,
 * comparing any player against any other, was the one thing it couldn't do.
 *
 * So: one list, sortable, and the youth team on a toggle beside the first team
 * rather than three taps away under Training → Academy. Picking the XI moved
 * with the pitch to Tactics → Shape, where the shape it fills already lives;
 * that screen used to tell you to "pick your XI on the Squad screen first",
 * which is no longer a journey anyone has to make.
 */

type SquadTab = 'first' | 'youth';
type SortKey = 'pos' | 'ovr' | 'age' | 'form';

const SORTS: { id: SortKey; label: string }[] = [
  { id: 'pos', label: 'Position' },
  { id: 'ovr', label: 'Rating' },
  { id: 'age', label: 'Age' },
  { id: 'form', label: 'Form' },
];

const POS_ORDER: Record<Position, number> = { GK: 0, DEF: 1, MID: 2, FWD: 3 };
const GROUP_LABEL: Record<Position, string> = {
  GK: 'Goalkeepers',
  DEF: 'Defenders',
  MID: 'Midfielders',
  FWD: 'Forwards',
};

function moraleColor(v: number): string {
  if (v >= 70) return 'var(--green)';
  if (v >= 45) return 'var(--gold)';
  return 'var(--red)';
}

function formTag(p: Player): React.ReactNode {
  if (isOnLoan(p)) return <span className="cold">On loan</span>;
  if (p.injuryWeeks > 0) return <span className="inj">INJ {p.injuryWeeks}w</span>;
  if (p.unhappy) return <span className="inj">Unhappy</span>;
  if (p.form >= 1.06) return <span className="hot">In form</span>;
  if (p.form <= 0.94) return <span className="cold">Poor form</span>;
  return null;
}

/** Form as a single sortable number, so "Form" can rank the whole list rather
 *  than only separating the three tags the row happens to show. */
function formRank(p: Player): number {
  if (p.injuryWeeks > 0 || isOnLoan(p)) return -1;
  return p.form;
}

export default function SquadScreen({
  state,
  onChange,
}: {
  state: GameState;
  onChange: (next: GameState) => void;
}) {
  const [tab, setTab] = useState<SquadTab>('first');
  const [sort, setSort] = useState<SortKey>('pos');
  const [detailId, setDetailId] = useState<number | null>(null);

  const first = getSquad(state, state.userClubId);
  const youth = getYouthSquad(state, state.userClubId);
  const players = tab === 'youth' ? youth : first;

  const sorted = useMemo(() => {
    const list = [...players];
    if (sort === 'pos') return list.sort((a, b) => POS_ORDER[a.pos] - POS_ORDER[b.pos] || b.rating - a.rating);
    if (sort === 'ovr') return list.sort((a, b) => b.rating - a.rating);
    if (sort === 'age') return list.sort((a, b) => a.age - b.age || b.rating - a.rating);
    return list.sort((a, b) => formRank(b) - formRank(a) || b.rating - a.rating);
  }, [players, sort]);

  const detail = detailId !== null ? state.players[detailId] : null;
  const squadFull = first.length >= MAX_SQUAD_SIZE;

  const promote = (p: Player) => {
    if (squadFull) {
      pushToast(`Squad is full at ${MAX_SQUAD_SIZE} — sell or release someone first.`, 'error');
      return;
    }
    onChange(promoteYouthPlayer(state, p.id));
    pushToast(`${p.name} promoted to the first team.`, 'success');
  };

  const renderRow = (p: Player) => {
    const inLineup = state.lineup.includes(p.id);
    const isYouth = tab === 'youth';
    return (
      <div key={p.id} className="fm-squadrow">
        <button
          className={`fm-player-row fm-player-row--squad fm-pos-${p.pos}${inLineup ? ' in-lineup' : ''}`}
          onClick={() => setDetailId(detailId === p.id ? null : p.id)}
        >
          {p.squadNumber !== undefined && (
            <span className="fm-player-row__num" aria-label={`Shirt number ${p.squadNumber}`}>
              {p.squadNumber}
            </span>
          )}
          <span className="fm-player-row__badge">{p.role}</span>
          <span className="fm-player-row__name">
            {p.name}
            <span className="fm-player-row__sub">
              {p.age}y{inLineup ? ' · XI' : ''}
              {isYouth
                ? ` · ceiling ${'★'.repeat(starsForPotential(p.potential ?? p.rating))}`
                : p.tacticalRole && getRole(p.tacticalRole)?.name
                  ? ` · ${getRole(p.tacticalRole)?.name}`
                  : ''}
              {!isYouth && p.contractYears <= 1 && (
                <> · <Icon name="warning" size={11} style={{ verticalAlign: -1 }} /> expiring</>
              )}
            </span>
          </span>
          <span className="fm-player-row__tag">
            {formTag(p)}
            <span className="fm-morale" style={{ color: moraleColor(p.morale) }} title={`Morale ${Math.round(p.morale)}`}>
              {Math.round(p.morale)}
            </span>
          </span>
          <span className={`fm-player-row__rating${p.rating >= 85 ? ' fm-player-row__rating--elite' : ''}`}>
            {p.rating}
          </span>
        </button>
        {isYouth && (
          // The academy screen's only real action, on the row it belongs to —
          // no reason to send anyone to another screen to press it.
          <button
            type="button"
            className="fm-squadrow__promote"
            onClick={() => promote(p)}
            disabled={squadFull}
            title={squadFull ? `Squad is full at ${MAX_SQUAD_SIZE}` : `Promote ${p.name} to the first team`}
          >
            Promote
          </button>
        )}
      </div>
    );
  };

  /* Position headers only make sense while the list *is* in position order —
     any other sort is a single ranked run, and headers would cut it up. */
  const body: React.ReactNode[] = [];
  if (sort === 'pos') {
    let seen: Position | null = null;
    for (const p of sorted) {
      if (p.pos !== seen) {
        seen = p.pos;
        body.push(
          <p key={`h-${p.pos}`} className="fm-grouphead">{GROUP_LABEL[p.pos]}</p>,
        );
      }
      body.push(renderRow(p));
    }
  } else {
    for (const p of sorted) body.push(renderRow(p));
  }

  return (
    <>
      <div className="fm-squadbar">
        <div className="fm-segmented fm-squadbar__tabs" role="tablist" aria-label="Squad">
          {([
            { id: 'first' as const, label: 'First team', n: first.length },
            { id: 'youth' as const, label: 'Youth', n: youth.length },
          ]).map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              className={`fm-segmented__opt${tab === t.id ? ' active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label} <span className="fm-segmented__count">{t.n}</span>
            </button>
          ))}
        </div>
        <div className="fm-squadbar__sorts">
          {SORTS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`fm-sortchip${sort === s.id ? ' active' : ''}`}
              aria-pressed={sort === s.id}
              onClick={() => setSort(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="fm-player-list">
        {body}
        {sorted.length === 0 && (
          <p className="fm-hint">
            {tab === 'youth'
              ? 'Nobody in the academy yet. Trialists report in every pre-season — sign the ones worth keeping under Training → Academy.'
              : 'No players in the squad.'}
          </p>
        )}
      </div>

      <p className="fm-hint">
        {tab === 'youth'
          ? `${youth.length} in the academy. Promoting moves a player onto the first-team roster on a fresh contract.`
          : `${first.length} registered · ${state.lineup.filter((id) => id != null).length} in the XI. Pick the XI on Tactics → Shape.`}
      </p>

      {detail && (
        <PlayerModal
          state={state}
          player={detail}
          club={state.clubs.find((c) => c.id === detail.clubId)}
          onChange={onChange}
          onClose={() => setDetailId(null)}
        />
      )}
    </>
  );
}
