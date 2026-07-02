'use client';

import { useState } from 'react';
import type { GameState } from '@/engine/types';
import { CLUBS_PER_DIVISION, PROMOTION_SPOTS } from '@/engine/gameRules';
import { computeTable, userDivision } from '@/engine/seasonProgression';

export default function TableScreen({ state }: { state: GameState }) {
  const [division, setDivision] = useState<1 | 2>(userDivision(state));
  const table = computeTable(state, division);
  const clubName = (id: number) => state.clubs.find((c) => c.id === id)?.name ?? '—';

  return (
    <>
      <div className="fm-division-toggle" style={{ alignSelf: 'center' }}>
        <button className={division === 1 ? 'active' : ''} onClick={() => setDivision(1)}>
          Division 1
        </button>
        <button className={division === 2 ? 'active' : ''} onClick={() => setDivision(2)}>
          Division 2
        </button>
      </div>
      <div className="fm-panel" style={{ padding: '8px 6px', overflowX: 'auto' }}>
        <table className="fm-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Club</th>
              <th>P</th>
              <th>W</th>
              <th>D</th>
              <th>L</th>
              <th>GD</th>
              <th>Pts</th>
            </tr>
          </thead>
          <tbody>
            {table.map((row, i) => {
              const pos = i + 1;
              const promo = division === 2 && pos <= PROMOTION_SPOTS;
              const releg = division === 1 && pos > CLUBS_PER_DIVISION - PROMOTION_SPOTS;
              const me = row.clubId === state.userClubId;
              return (
                <tr key={row.clubId} className={`${me ? 'me ' : ''}${promo ? 'promo' : ''}${releg ? 'releg' : ''}`}>
                  <td>{pos}</td>
                  <td>{clubName(row.clubId)}</td>
                  <td>{row.played}</td>
                  <td>{row.won}</td>
                  <td>{row.drawn}</td>
                  <td>{row.lost}</td>
                  <td>{row.gd > 0 ? `+${row.gd}` : row.gd}</td>
                  <td className="pts">{row.pts}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="fm-hint">
        {division === 1
          ? `Bottom ${PROMOTION_SPOTS} are relegated to Division 2.`
          : `Top ${PROMOTION_SPOTS} are promoted to Division 1.`}
      </p>
    </>
  );
}
