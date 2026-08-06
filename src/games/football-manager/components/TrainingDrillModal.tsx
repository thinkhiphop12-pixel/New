'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import type { GameState, Player } from '@/engine/types';
import { applyDrillResult, type DrillResult } from '@/engine/development';

const STAT_LABEL: Record<string, string> = {
  pac: 'Pace', sho: 'Shooting', pas: 'Passing', dri: 'Dribbling', def: 'Defending', phy: 'Physical',
};

/**
 * Manual training mini-game: a marker sweeps left-right across a bar and the
 * player stops it — the closer to the centre "sweet spot", the higher the
 * score fed into `applyDrillResult`. Pure DOM/CSS timing bar, no canvas,
 * matching the project's existing lightweight modal patterns (see
 * PressConferenceModal.tsx).
 */
export default function TrainingDrillModal({
  state,
  player,
  onChange,
  onClose,
}: {
  state: GameState;
  player: Player;
  onChange: (next: GameState) => void;
  onClose: () => void;
}) {
  const [pos, setPos] = useState(0); // 0-100
  const [dir, setDir] = useState(1);
  const [result, setResult] = useState<DrillResult | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (result) return;
    let last = performance.now();
    const speed = 90; // % per second
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setPos((p) => {
        let next = p + dir * speed * dt;
        if (next >= 100) { next = 100; setDir(-1); }
        else if (next <= 0) { next = 0; setDir(1); }
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [dir, result]);

  const stop = () => {
    if (result) return;
    // Score peaks at the centre (50) and falls off toward the edges.
    const score = Math.round(Math.max(0, 100 - Math.abs(pos - 50) * 2));
    const { state: next, result: r } = applyDrillResult(state, player.id, score);
    onChange(next);
    setResult(r);
  };

  return (
    <div className="fm-matchx-modal" onClick={onClose}>
      <div className="fm-matchx-modal__panel fm-matchx-modal__panel--narrow" onClick={(e) => e.stopPropagation()}>
        <div className="fm-matchx-modal__head">
          <span className="fm-matchx-modal__title">Run Drill — {player.name}</span>
          <button className="fm-matchx-modal__close" onClick={onClose} aria-label="Close"><Icon name="cross" size={15} /></button>
        </div>

        {!result ? (
          <>
            <p className="fm-hint" style={{ textAlign: 'left', marginTop: 0 }}>
              Stop the marker in the middle of the bar for the best result.
            </p>
            <div
              style={{
                position: 'relative', height: 28, borderRadius: 8, background: 'var(--panel-2)',
                border: '1px solid var(--border-soft)', overflow: 'hidden', margin: '12px 0',
              }}
            >
              <div style={{ position: 'absolute', left: '35%', width: '30%', top: 0, bottom: 0, background: 'var(--green-dim)' }} />
              <div
                style={{
                  position: 'absolute', left: `calc(${pos}% - 2px)`, top: 0, bottom: 0, width: 4,
                  background: 'var(--gold)', borderRadius: 2,
                }}
              />
            </div>
            <button className="fm-btn fm-btn--primary" style={{ width: '100%' }} onClick={stop}>
              Stop
            </button>
          </>
        ) : (
          <>
            <p style={{ fontSize: 28, fontWeight: 900, margin: '8px 0 0', textAlign: 'center' }}>{result.score}</p>
            <p className="fm-hint" style={{ marginTop: 0 }}>Drill score</p>
            <ul className="fm-news">
              <li>Sharpness +{result.sharpnessGained}</li>
              {result.statGained && <li>{STAT_LABEL[result.statGained] ?? result.statGained} +1</li>}
              {!result.statGained && <li>No attribute breakthrough this time.</li>}
            </ul>
            <button className="fm-btn fm-btn--secondary" style={{ width: '100%', marginTop: 8 }} onClick={onClose}>
              Done
            </button>
          </>
        )}
      </div>
    </div>
  );
}
