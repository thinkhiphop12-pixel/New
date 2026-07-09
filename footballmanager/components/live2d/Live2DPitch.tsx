'use client';

import { useEffect, useRef, useState } from 'react';
import { initiateGame, playIteration } from 'footballsim';
import type { MatchDetails } from 'footballsim';
import type { Club, FormationDef, MatchEvent, Player } from '@/engine/types';
import { getFormation } from '@/engine/gameRules';
import { SIM_PITCH, toSimTeam } from './toSimTeams';

function pickOpponentLineup(club: Club | undefined, players: Record<number, Player>): (number | null)[] {
  const formation = getFormation('4-4-2');
  if (!club) return formation.slots.map(() => null);
  const squad = club.playerIds.map((id) => players[id]).filter(Boolean) as Player[];
  const bucket = (pos: string) => squad.filter((p) => p.pos === pos).sort((a, b) => b.rating - a.rating);
  const queues: Record<string, Player[]> = {
    GK: [...bucket('GK')],
    DEF: [...bucket('DEF')],
    MID: [...bucket('MID')],
    FWD: [...bucket('FWD')],
  };
  return formation.slots.map((slot) => {
    const q = queues[slot.pos];
    const next = q && q.length ? q.shift()! : null;
    return next ? next.id : null;
  });
}

function toRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbStr(rgb: [number, number, number], alpha = 1): string {
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
}

function drawPitch(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Gradient grass
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#0d2e1a');
  grad.addColorStop(0.5, '#0f3820');
  grad.addColorStop(1, '#0a2515');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Mowing stripes
  const stripeCount = 10;
  const stripeH = h / stripeCount;
  for (let i = 0; i < stripeCount; i++) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.04)';
    ctx.fillRect(0, i * stripeH, w, stripeH);
  }

  // Pitch markings
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 1.2;

  // Outer boundary
  ctx.strokeRect(6, 6, w - 12, h - 12);

  // Halfway line
  ctx.beginPath();
  ctx.moveTo(6, h / 2);
  ctx.lineTo(w - 6, h / 2);
  ctx.stroke();

  // Centre circle + spot
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, h * 0.085, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, 1.5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fill();

  // Penalty boxes (top + bottom)
  const boxW = w * 0.5;
  const boxH = h * 0.14;
  const boxX = (w - boxW) / 2;

  // Bottom box (home)
  ctx.strokeRect(boxX, h - 6 - boxH, boxW, boxH);
  // 6-yard box
  const sixW = w * 0.28;
  const sixH = h * 0.05;
  ctx.strokeRect((w - sixW) / 2, h - 6 - sixH, sixW, sixH);
  // Goal area arc
  ctx.beginPath();
  ctx.arc(w / 2, h - 6 - boxH, h * 0.06, Math.PI, 0);
  ctx.stroke();

  // Top box (away)
  ctx.strokeRect(boxX, 6, boxW, boxH);
  ctx.strokeRect((w - sixW) / 2, 6, sixW, sixH);
  ctx.beginPath();
  ctx.arc(w / 2, 6 + boxH, h * 0.06, 0, Math.PI);
  ctx.stroke();

  // Goals
  const goalW = w * 0.18;
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect((w - goalW) / 2, h - 4, goalW, 3);
  ctx.strokeRect((w - goalW) / 2, 1, goalW, 3);
}

function drawPlayerDot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rgb: [number, number, number],
  hasBall: boolean,
  label?: string,
) {
  const r = hasBall ? 7 : 5.5;

  // Glow when has ball
  if (hasBall) {
    ctx.beginPath();
    ctx.arc(x, y, r + 4, 0, Math.PI * 2);
    ctx.fillStyle = rgbStr(rgb, 0.2);
    ctx.fill();
  }

  // Shadow
  ctx.beginPath();
  ctx.arc(x, y + 1.5, r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fill();

  // Main dot
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = rgbStr(rgb);
  ctx.fill();

  // Ring
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Ball indicator ring
  if (hasBall) {
    ctx.beginPath();
    ctx.arc(x, y, r + 1.5, 0, Math.PI * 2);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Label
  if (label) {
    ctx.font = '600 9px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    const metrics = ctx.measureText(label);
    const padX = 3;
    ctx.fillRect(x - metrics.width / 2 - padX, y + r + 2, metrics.width + padX * 2, 11);
    ctx.fillStyle = '#fff';
    ctx.fillText(label, x, y + r + 10);
  }
}

function drawBall(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Glow
  ctx.beginPath();
  ctx.arc(x, y, 7, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(245,179,1,0.25)';
  ctx.fill();

  // Ball
  const grad = ctx.createRadialGradient(x - 2, y - 2, 0, x, y, 5);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.5, '#fff8e0');
  grad.addColorStop(1, '#f5b301');
  ctx.beginPath();
  ctx.arc(x, y, 4.5, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 0.5;
  ctx.stroke();
}

export default function Live2DPitch({
  homeFormation,
  homeLineup,
  homeClub,
  awayClub,
  players,
  latestEvent,
  paused,
  onError,
}: {
  homeFormation: FormationDef;
  homeLineup: (number | null)[];
  homeClub: Club | undefined;
  awayClub: Club | undefined;
  players: Record<number, Player>;
  latestEvent?: MatchEvent;
  paused: boolean;
  onError: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const matchRef = useRef<MatchDetails | null>(null);
  const rafRef = useRef<number | null>(null);
  const [goalFlash, setGoalFlash] = useState<{ key: string; color: string } | null>(null);

  useEffect(() => {
    try {
      const home = toSimTeam(homeClub?.name ?? 'Home', homeFormation, homeLineup, players);
      const awayLineup = pickOpponentLineup(awayClub, players);
      const away = toSimTeam(awayClub?.name ?? 'Away', getFormation('4-4-2'), awayLineup, players);
      matchRef.current = initiateGame(home, away, SIM_PITCH);
    } catch {
      onError();
    }
  }, []);

  useEffect(() => {
    if (!latestEvent || latestEvent.type !== 'goal') return;
    const color = latestEvent.clubId === homeClub?.id ? homeClub?.color ?? '#2fd27a' : awayClub?.color ?? '#f2667a';
    setGoalFlash({ key: `${latestEvent.minute}-${latestEvent.clubId}`, color });
    const t = setTimeout(() => setGoalFlash(null), 1800);
    return () => clearTimeout(t);
  }, [latestEvent?.minute, latestEvent?.type, latestEvent?.clubId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const homeRgb = toRgb(homeClub?.color ?? '#2fd27a');
    const awayRgb = toRgb(awayClub?.color ?? '#f2667a');

    // Build name lookup for home team labels
    const homeNames: Record<number, string> = {};
    homeFormation.slots.forEach((slot, i) => {
      const id = homeLineup[i];
      if (id != null && players[id]) {
        const parts = players[id].name.split(' ');
        homeNames[i] = parts[parts.length - 1];
      }
    });

    let stopped = false;
    function tick() {
      if (stopped) return;
      const w = canvas!.width;
      const h = canvas!.height;
      if (!paused && document.visibilityState === 'visible' && matchRef.current) {
        const iters = 6;
        for (let i = 0; i < iters; i++) {
          try {
            matchRef.current = playIteration(matchRef.current);
          } catch {
            break;
          }
        }
      }
      drawPitch(ctx!, w, h);
      const md = matchRef.current;
      if (md) {
        const sx = w / SIM_PITCH.pitchWidth;
        const sy = h / SIM_PITCH.pitchHeight;
        let homeIdx = 0;
        for (const p of md.kickOffTeam.players) {
          if (p.currentPOS[0] === 'NP') continue;
          const px = (p.currentPOS[0] as number) * sx;
          const py = (p.currentPOS[1] as number) * sy;
          drawPlayerDot(ctx!, px, py, homeRgb, !!p.hasBall, homeNames[homeIdx]);
          homeIdx++;
        }
        for (const p of md.secondTeam.players) {
          if (p.currentPOS[0] === 'NP') continue;
          drawPlayerDot(ctx!, (p.currentPOS[0] as number) * sx, (p.currentPOS[1] as number) * sy, awayRgb, !!p.hasBall);
        }
        const ballHeld = md.kickOffTeam.players.some((p) => p.hasBall) || md.secondTeam.players.some((p) => p.hasBall);
        if (!ballHeld) {
          drawBall(ctx!, md.ball.position[0] * sx, md.ball.position[1] * sy);
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      stopped = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [paused, homeClub?.color, awayClub?.color, homeFormation, homeLineup, players]);

  return (
    <div className="fm-pitch fm-pitch--live" style={{ position: 'relative' }}>
      <canvas ref={canvasRef} width={340} height={525} className="fm-live2d-canvas" />
      {goalFlash && (
        <div className="fm-goal-flash" style={{ ['--goal-color' as string]: goalFlash.color }}>
          <span className="fm-goal-flash__text">GOAL</span>
        </div>
      )}
    </div>
  );
}
