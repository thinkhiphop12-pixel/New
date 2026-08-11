'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { TrainingReport } from '@/engine/types';
import { drillDef } from '@/engine/training';
import { Icon } from './Icon';

/**
 * Watch the week's training.
 *
 * This is a *replay*, not a simulation. Everything shown here was already
 * decided by `applyWeeklyTraining` during the weekly tick and recorded on
 * `GameState.lastTrainingReport`; the canvas and the feed are a retelling of
 * that record. Nothing in this component can change an outcome, which is what
 * makes Skip completely free — and what stops the screen becoming a second,
 * disagreeing source of truth about what training did.
 *
 * The scene is drawn on a canvas rather than assembled from DOM nodes: it's a
 * dozen moving dots at 60fps, which is the case canvas is for, and it keeps
 * the whole thing to one element the layout never has to reason about.
 */

const DURATION_MS = 8000;
const PLAYERS = 9;

interface Dot { x: number; y: number; keeper: boolean; }

function layout(): Dot[] {
  const dots: Dot[] = [];
  // Seven in the rondo ring, two defenders in the middle.
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 - Math.PI / 2;
    dots.push({ x: 0.5 + Math.cos(a) * 0.3, y: 0.52 + Math.sin(a) * 0.28, keeper: true });
  }
  dots.push({ x: 0.44, y: 0.5, keeper: false });
  dots.push({ x: 0.58, y: 0.56, keeper: false });
  return dots;
}

export default function TrainingSessionModal({
  report,
  onClose,
}: {
  report: TrainingReport;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const [shown, setShown] = useState(0);
  const [finished, setFinished] = useState(false);
  const [clock, setClock] = useState(0);
  const [progress, setProgress] = useState(0);

  const reduceMotion = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const finish = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setShown(report.events.length);
    setProgress(1);
    setClock(8);
    setFinished(true);
  }, [report.events.length]);

  useEffect(() => {
    if (reduceMotion) { finish(); return; }

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) { finish(); return; }

    const dots = layout();
    const ball = { from: 0, to: 2, t: 0 };
    let elapsed = 0;
    let last = performance.now();

    const draw = (time: number) => {
      const { width: W, height: H } = canvas;
      ctx.clearRect(0, 0, W, H);

      // Mown stripes, then the markings.
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.022)' : 'rgba(0,0,0,0.05)';
        ctx.fillRect((i * W) / 8, 0, W / 8, H);
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 2;
      ctx.strokeRect(24, 24, W - 48, H - 48);
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, Math.min(W, H) * 0.16, 0, Math.PI * 2);
      ctx.stroke();

      // Corner cones, so it reads as a training ground and not a match.
      ctx.fillStyle = 'rgba(255,180,40,0.55)';
      for (const [cx, cy] of [[0.2, 0.18], [0.8, 0.18], [0.2, 0.86], [0.8, 0.86]]) {
        ctx.beginPath();
        ctx.moveTo(cx * W, cy * H - 7);
        ctx.lineTo(cx * W - 5, cy * H + 4);
        ctx.lineTo(cx * W + 5, cy * H + 4);
        ctx.closePath();
        ctx.fill();
      }

      dots.forEach((d, i) => {
        const wob = Math.sin(time / 420 + i) * 4;
        const px = d.x * W;
        const py = d.y * H + wob;
        ctx.beginPath();
        ctx.ellipse(px, py + 11, 8, 3, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(px, py, 9, 0, Math.PI * 2);
        ctx.fillStyle = d.keeper ? '#b8ff3c' : '#f2667a';
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(0,0,0,0.45)';
        ctx.stroke();
      });

      const a = dots[ball.from];
      const b = dots[ball.to];
      const bx = (a.x + (b.x - a.x) * ball.t) * W;
      const by = (a.y + (b.y - a.y) * ball.t) * H - Math.sin(ball.t * Math.PI) * 16;
      ctx.beginPath();
      ctx.arc(bx, by, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    };

    const loop = (now: number) => {
      const dt = now - last;
      last = now;
      elapsed += dt;

      ball.t += dt / 620;
      if (ball.t >= 1) {
        ball.t = 0;
        ball.from = ball.to;
        ball.to = (ball.to + 2 + Math.floor(Math.random() * 3)) % 7;
      }

      const p = Math.min(1, elapsed / DURATION_MS);
      setProgress(p);
      setClock(Math.floor(p * 8));
      setShown(report.events.filter((e) => e.at <= p).length);
      draw(elapsed);

      if (p < 1) rafRef.current = requestAnimationFrame(loop);
      else { rafRef.current = null; setFinished(true); }
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [report, reduceMotion, finish]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const visible = report.events.slice(0, shown);
  const signed = (n: number) => (n >= 0 ? `+${n.toFixed(1)}` : `−${Math.abs(n).toFixed(1)}`);

  return (
    <div className="fm-modal-backdrop" onClick={onClose}>
      <div
        className="fm-modal fm-session"
        role="dialog"
        aria-modal="true"
        aria-label="Training session"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="fm-modal__header">
          <h2 style={{ margin: 0, fontSize: 16 }}>
            {drillDef(report.drills[0]).label} &amp; {drillDef(report.drills[1]).label}
          </h2>
          <button className="fm-settings-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>

        <div className="fm-session__body">
          <div className="fm-session__pitch">
            <canvas ref={canvasRef} width={640} height={400} />
            <div className="fm-session__hud">
              <span className="fm-session__who">{report.attended} on the grass</span>
              <span className="fm-session__clock">00:0{clock}</span>
            </div>
            <div className="fm-session__prog"><i style={{ width: `${progress * 100}%` }} /></div>
          </div>

          <div className="fm-session__side">
            <div className="fm-session__feed">
              {visible.length === 0 && <p className="fm-session__waiting">Warming up…</p>}
              {visible.map((e, i) => (
                <p key={i} className={`fm-session__event fm-session__event--${e.tone}`}>{e.text}</p>
              ))}
              {finished && (
                <div className="fm-session__totals">
                  <p className="fm-label" style={{ margin: '0 0 4px' }}>Session report</p>
                  <p>Sharpness <b>{signed(report.sharpness)}</b> a man</p>
                  <p>Fitness <b>{signed(report.fitness)}</b> a man</p>
                  {report.chemistry > 0 && <p>Chemistry <b>{signed(report.chemistry)}</b></p>}
                  {report.events.length === 0 && <p className="fm-hint" style={{ margin: '4px 0 0', textAlign: 'left' }}>No breakthroughs this week.</p>}
                </div>
              )}
            </div>

            <button
              className={`fm-btn ${finished ? 'fm-btn--primary' : 'fm-btn--ghost'} fm-btn--small fm-btn--full`}
              onClick={finished ? onClose : finish}
            >
              {finished ? 'Done' : (<><Icon name="play" size={13} /> Skip to the report</>)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
