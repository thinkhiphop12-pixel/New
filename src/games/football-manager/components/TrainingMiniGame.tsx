'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { TeamDrill } from '@/engine/types';
import { DRILL_MINIGAME, drillDef, type MiniGameId } from '@/engine/training';
import { sfx } from '@/lib/sound';
import { Icon } from './Icon';

/**
 * Playing the session.
 *
 * Four games across the six drills, paired by what the drill physically is
 * rather than by name (see `DRILL_MINIGAME`): a rondo for the passing
 * sessions, a finishing arc for attacking, shuttle runs for the two running
 * sessions, and a curled delivery for set pieces.
 *
 * All four are the same shape underneath — a handful of attempts, each scored
 * 0-100, averaged into the session score the engine multiplies output by. That
 * keeps them comparable, keeps one from being the "good" drill to pick, and
 * means a new game only has to supply a scoring rule rather than a scoring
 * system.
 *
 * Every one is skippable and none is required: an unplayed week resolves at
 * the neutral baseline, which is what makes this seasoning rather than a
 * tax on people who don't want to play it.
 */

const ATTEMPTS = 5;

const GAME_COPY: Record<MiniGameId, { title: string; how: string; verb: string }> = {
  rondo: {
    title: 'Rondo',
    how: 'Play the pass when the ball reaches a green man. Hit the defender or nobody at all and the drill breaks down.',
    verb: 'Pass',
  },
  finishing: {
    title: 'Finishing',
    how: 'Stop the sweep inside the target band. The middle is the corner of the net; the edges are the keeper.',
    verb: 'Shoot',
  },
  shuttle: {
    title: 'Shuttle runs',
    how: 'Turn on the line, not before it and not after. Six lengths — keep the rhythm.',
    verb: 'Turn',
  },
  setpiece: {
    title: 'Set pieces',
    how: 'Release the cross as the marker crosses the far post. Too early and it sails, too late and it is cleared.',
    verb: 'Whip it in',
  },
};

/* ------------------------------------------------------------------ rondo */
/** Ball travels round a ring of seven; one of them is the defender. */
function useRondo(onScore: (n: number) => void, live: boolean) {
  const [angle, setAngle] = useState(0);
  const [defender, setDefender] = useState(3);
  const speedRef = useRef(0.028);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (!live) return;
    const loop = () => {
      setAngle((a) => (a + speedRef.current) % (Math.PI * 2));
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [live]);

  const tap = useCallback(() => {
    const step = (Math.PI * 2) / 7;
    const idx = ((Math.round(angle / step) % 7) + 7) % 7;
    let diff = Math.abs(angle - idx * step);
    diff = Math.min(diff, Math.PI * 2 - diff);
    if (idx === defender) { onScore(0); return; }
    // Full marks within a tenth of a radian, tailing off to nothing at a third.
    const accuracy = Math.max(0, 1 - Math.max(0, diff - 0.1) / 0.24);
    speedRef.current = Math.min(0.075, speedRef.current + 0.004);
    let next = idx;
    while (next === idx) next = Math.floor(Math.random() * 7);
    setDefender(next);
    onScore(Math.round(accuracy * 100));
  }, [angle, defender, onScore]);

  return { angle, defender, tap };
}

/* --------------------------------------------------- sweeping-bar games */
/** Finishing, shuttle and set-piece all come down to stopping a sweep in a
 *  band; only the band's position, width and speed differ. */
function useSweep(config: { band: number; width: number; speed: number }, onScore: (n: number) => void, live: boolean) {
  const [pos, setPos] = useState(0);
  const dirRef = useRef(1);
  const raf = useRef<number | null>(null);
  const lastRef = useRef(0);

  useEffect(() => {
    if (!live) return;
    lastRef.current = performance.now();
    const loop = (now: number) => {
      const dt = (now - lastRef.current) / 1000;
      lastRef.current = now;
      setPos((p) => {
        let next = p + dirRef.current * config.speed * dt;
        if (next >= 100) { next = 100; dirRef.current = -1; }
        else if (next <= 0) { next = 0; dirRef.current = 1; }
        return next;
      });
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [live, config.speed]);

  const tap = useCallback(() => {
    const off = Math.abs(pos - config.band);
    const accuracy = Math.max(0, 1 - off / config.width);
    onScore(Math.round(accuracy * 100));
  }, [pos, config.band, config.width, onScore]);

  return { pos, tap };
}

/**
 * Band centre, half-width and sweep speed per game.
 *
 * Tuned so a reasonably-timed tap clears `SESSION_BASE_QUALITY` (55) — i.e.
 * playing the drill and paying attention beats not playing it — while a
 * perfect one still needs real timing. Scoring 55 means landing within 45% of
 * the half-width, a window of roughly 150-200ms at these speeds.
 */
const SWEEP_CONFIG: Record<'finishing' | 'shuttle' | 'setpiece', { band: number; width: number; speed: number }> = {
  finishing: { band: 50, width: 34, speed: 78 },
  shuttle: { band: 78, width: 28, speed: 104 },
  setpiece: { band: 64, width: 30, speed: 66 },
};

export default function TrainingMiniGame({
  drill,
  onFinish,
  onClose,
}: {
  drill: TeamDrill;
  /** Called once with the averaged session score, 0-100. */
  onFinish: (score: number) => void;
  onClose: () => void;
}) {
  const game = DRILL_MINIGAME[drill];
  const copy = GAME_COPY[game];
  const [scores, setScores] = useState<number[]>([]);
  const [flash, setFlash] = useState<{ text: string; good: boolean } | null>(null);
  const done = scores.length >= ATTEMPTS;

  const record = useCallback((n: number) => {
    sfx.click();
    setScores((prev) => (prev.length >= ATTEMPTS ? prev : [...prev, n]));
    setFlash(
      n >= 85 ? { text: 'Perfect.', good: true }
        : n >= 55 ? { text: 'Good enough.', good: true }
          : n > 0 ? { text: 'Sloppy.', good: false }
            : { text: 'Lost it.', good: false },
    );
  }, []);

  const rondo = useRondo(record, game === 'rondo' && !done);
  const sweep = useSweep(
    SWEEP_CONFIG[game === 'rondo' ? 'finishing' : game],
    record,
    game !== 'rondo' && !done,
  );

  const total = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  const tap = () => { if (!done) (game === 'rondo' ? rondo.tap() : sweep.tap()); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.code === 'Space' || e.key === 'Enter') { e.preventDefault(); tap(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  const cfg = SWEEP_CONFIG[game === 'rondo' ? 'finishing' : game];

  return (
    <div className="fm-modal-backdrop" onClick={onClose}>
      <div
        className="fm-modal fm-mini"
        role="dialog"
        aria-modal="true"
        aria-label={`${copy.title} drill`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="fm-modal__header">
          <h2 style={{ margin: 0, fontSize: 16 }}>{copy.title} — {drillDef(drill).label}</h2>
          <button className="fm-settings-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>

        <p className="fm-hint" style={{ textAlign: 'left', marginTop: 0 }}>{copy.how}</p>

        <div className="fm-mini__pips" aria-label={`Attempt ${Math.min(scores.length + 1, ATTEMPTS)} of ${ATTEMPTS}`}>
          {Array.from({ length: ATTEMPTS }, (_, i) => (
            <i
              key={i}
              className={`fm-mini__pip${i < scores.length ? (scores[i] >= 55 ? ' good' : ' bad') : ''}`}
            />
          ))}
        </div>

        <div className={`fm-mini__stage${game === 'rondo' ? '' : ' fm-mini__stage--sweep'}`}>
          {game === 'rondo' ? (
            <RondoStage angle={rondo.angle} defender={rondo.defender} />
          ) : (
            <SweepStage game={game} pos={sweep.pos} band={cfg.band} width={cfg.width} />
          )}
          {done && (
            <div className="fm-mini__result">
              <b>{total}</b>
              <span>Session score</span>
              <p className="fm-hint" style={{ margin: '6px 0 0' }}>
                {total >= 80 ? 'Sharp session. They got a lot out of that.'
                  : total >= 55 ? 'Decent work. Nothing wasted.'
                    : total >= 30 ? 'Scrappy. It will still count for something.'
                      : 'That was a mess, boss.'}
              </p>
            </div>
          )}
        </div>

        <p className={`fm-mini__flash${flash?.good ? ' good' : flash ? ' bad' : ''}`}>
          {done ? '' : flash?.text ?? ' '}
        </p>

        <div className="fm-actions" style={{ marginBottom: 0 }}>
          {done ? (
            <button className="fm-btn fm-btn--primary fm-btn--full" onClick={() => onFinish(total)}>
              Bank the session
            </button>
          ) : (
            <>
              <button className="fm-btn fm-btn--ghost fm-btn--small" onClick={onClose}>Skip</button>
              <button className="fm-btn fm-btn--primary" style={{ flex: 1 }} onClick={tap}>
                {copy.verb}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- stages */

function RondoStage({ angle, defender }: { angle: number; defender: number }) {
  const R = 38;
  const spots = Array.from({ length: 7 }, (_, i) => {
    const a = (i / 7) * Math.PI * 2 - Math.PI / 2;
    return { x: 50 + Math.cos(a) * R, y: 50 + Math.sin(a) * R, defender: i === defender };
  });
  const bx = 50 + Math.cos(angle - Math.PI / 2) * R;
  const by = 50 + Math.sin(angle - Math.PI / 2) * R;
  return (
    <svg viewBox="0 0 100 100" className="fm-mini__svg" aria-hidden="true">
      <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="1.2" />
      {spots.map((s, i) => (
        <g key={i}>
          <circle cx={s.x} cy={s.y} r="6.5" fill={s.defender ? 'var(--red)' : 'var(--green)'} />
          <text
            x={s.x} y={s.y + 2.4} textAnchor="middle"
            fontSize="6" fontWeight="800" fill="#04140d"
          >
            {s.defender ? 'D' : i + 1}
          </text>
        </g>
      ))}
      <circle cx={bx} cy={by} r="3.4" fill="#fff" stroke="rgba(0,0,0,0.4)" strokeWidth="0.8" />
    </svg>
  );
}

/** What the two ends of the bar represent, so the band means something. */
const SWEEP_ENDS: Record<'finishing' | 'shuttle' | 'setpiece', [string, string]> = {
  finishing: ['Keeper', 'Keeper'],
  shuttle: ['Start', 'The line'],
  setpiece: ['Near post', 'Far post'],
};

function SweepStage({
  game, pos, band, width,
}: {
  game: 'finishing' | 'shuttle' | 'setpiece';
  pos: number;
  band: number;
  width: number;
}) {
  const [left, right] = SWEEP_ENDS[game];
  const bandLeft = Math.max(0, band - width);
  return (
    <div className="fm-sweep-wrap">
      <div className="fm-sweep">
        <div
          className="fm-sweep__band"
          style={{ left: `${bandLeft}%`, width: `${Math.min(100 - bandLeft, width * 2)}%` }}
        />
        <div className="fm-sweep__perfect" style={{ left: `${band}%` }} />
        <div className="fm-sweep__marker" style={{ left: `${pos}%` }} />
      </div>
      <div className="fm-sweep__ends"><span>{left}</span><span>{right}</span></div>
    </div>
  );
}
