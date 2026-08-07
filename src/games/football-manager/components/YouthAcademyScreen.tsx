'use client';

import { useState } from 'react';
import type { GameState, Player } from '@/engine/types';
import { getYouthSquad, promoteYouthPlayer, acceptTrialist, rejectTrialist } from '@/engine/youthAcademy';
import { MAX_SQUAD_SIZE } from '@/engine/gameRules';
import { Icon } from './Icon';
import { PlayerFace } from './PlayerFace';
import PlayerModal from './PlayerModal';

/**
 * Youth Academy hub: lists the youth squad built up by season-end intake
 * (engine/seasonProgression.ts makeYouthPlayer → club.youthPlayerIds) and
 * lets the user promote a prospect onto the first-team roster
 * (engine/youthAcademy.ts promoteYouthPlayer). Youth players are never part
 * of `club.playerIds`, so they don't draw a first-team wage, count toward
 * MAX_SQUAD_SIZE, or appear in lineup/tactics selection until promoted.
 * Potential is shown openly here — scouting a hidden gem in your own academy
 * is the point of the feature, so there's no fog-of-war on youth ratings.
 */
export default function YouthAcademyScreen({
  state,
  onChange,
}: {
  state: GameState;
  onChange: (next: GameState) => void;
}) {
  const [detailId, setDetailId] = useState<number | null>(null);

  const club = state.clubs.find((c) => c.id === state.userClubId);
  const youth = getYouthSquad(state, state.userClubId).sort((a, b) => b.potential - a.potential);
  const detail: Player | undefined = detailId != null ? state.players[detailId] : undefined;
  const firstTeamSize = club?.playerIds.length ?? 0;
  const squadFull = firstTeamSize >= MAX_SQUAD_SIZE;

  const nextIntakeCount = state.academyLevel >= 3 ? 2 : 1;
  const trialists = state.trialistPool ?? [];

  return (
    <>
      {trialists.length > 0 && (
        <div className="fm-mod">
          <div className="fm-mod__head"><h2 className="fm-mod__title">Trialist Intake</h2></div>
          <div className="fm-player-list">
            {trialists.map((t) => {
              const player = state.players[t.playerId];
              if (!player) return null;
              return (
                <div
                  key={t.playerId}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '40px 1fr auto',
                    alignItems: 'center',
                    gap: 12,
                    padding: '8px 12px',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        display: 'inline-block',
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        backgroundColor: 'var(--muted)',
                        fontSize: 10,
                        lineHeight: '26px',
                        textAlign: 'center',
                        fontWeight: 600,
                      }}
                    >
                      {player.pos}
                    </span>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
                      {player.name}
                      {t.starRating > 0 && (
                        <span style={{ marginLeft: 6, fontSize: 12, color: 'var(--gold)' }}>
                          {'★'.repeat(t.starRating)}
                        </span>
                      )}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>
                      CA {t.ca} · PA {t.pa} · {player.age}y
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className="fm-btn fm-btn--secondary fm-btn--small"
                      onClick={() => onChange(acceptTrialist(state, t.playerId))}
                    >
                      Sign
                    </button>
                    <button
                      className="fm-btn fm-btn--ghost fm-btn--small"
                      onClick={() => onChange(rejectTrialist(state, t.playerId))}
                    >
                      Release
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="fm-panel">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
          <div>
            <p className="fm-label" style={{ marginTop: 0, marginBottom: 4 }}>Reputation</p>
            <div className="fm-bar">
              <div className="fm-bar__fill good" style={{ width: `${((state.facilities?.academyReputation ?? 20) / 100) * 100}%` }} />
            </div>
            <p className="fm-hint" style={{ margin: '4px 0 0' }}>{state.facilities?.academyReputation ?? 20}/100</p>
          </div>
          <div>
            <p className="fm-label" style={{ marginTop: 0, marginBottom: 4 }}>Level</p>
            <div className="fm-bar">
              <div className="fm-bar__fill good" style={{ width: `${(state.academyLevel / 3) * 100}%` }} />
            </div>
            <p className="fm-hint" style={{ margin: '4px 0 0' }}>{state.academyLevel}/3</p>
          </div>
          <div>
            <p className="fm-label" style={{ marginTop: 0, marginBottom: 4 }}>Next intake</p>
            <p style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>{nextIntakeCount}</p>
            <p className="fm-hint" style={{ margin: '4px 0 0' }}>prospect{nextIntakeCount > 1 ? 's' : ''}</p>
          </div>
        </div>
        {squadFull && (
          <p className="fm-hint" style={{ marginBottom: 0, color: 'var(--red)' }}>Squad full — promote to free space</p>
        )}
      </div>

      <div className="fm-mod">
        <div className="fm-mod__head"><h2 className="fm-mod__title">Youth Squad</h2></div>
        <div className="fm-player-list">
          {youth.length === 0 && (
            <p className="fm-hint">No youth players yet — the academy intakes new prospects at season end.</p>
          )}
          {youth.map((p) => (
            <button
              key={p.id}
              className={`fm-player-row fm-player-row--faced fm-pos-${p.pos}`}
              onClick={() => setDetailId(detailId === p.id ? null : p.id)}
            >
              <PlayerFace playerId={p.id} size={26} />
              <span className="fm-player-row__badge">{p.role}</span>
              <span className="fm-player-row__name">
                {p.name}
                <span className="fm-player-row__sub">{p.age}y · PA {p.potential}</span>
              </span>
              <span className="fm-player-row__rating">{p.rating}</span>
              <span
                className="fm-btn fm-btn--secondary fm-btn--small"
                style={{ marginLeft: 8, opacity: squadFull ? 0.5 : 1 }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!squadFull) onChange(promoteYouthPlayer(state, p.id));
                }}
              >
                Promote
              </span>
            </button>
          ))}
        </div>
      </div>

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
