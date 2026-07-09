'use client';

import { useEffect, useRef, useState } from 'react';
import { initiateGame, playIteration } from 'footballsim';
import type { MatchDetails } from 'footballsim';
import type { Club, FormationDef, MatchEvent, Player } from '@/engine/types';
import { getFormation } from '@/engine/gameRules';
import { SIM_PITCH, toSimTeam } from './toSimTeams';

/** Picks up to 11 club players (best-effort GK/DEF/MID/FWD spread) to stand
 *  in for the opponent's shape — Gaffer doesn't track rival formations, so
 *  this is ambient visual flavor only; it never affects the real result. */
function pickOpponentLineup(club: Club | undefined, players: Record<number, Player>): (number | null)[] {
  const formation = getFormation('4-4-2');
  if (!club) return formation.slots.map(() => null);
  const squad = club.playerIds.map((id) => players[id]).filter(Boolean) as Player[];
  const bucket = (pos: string) => squad.filter((p) => p.pos === pos).sort((a, b) => b.rating - a.rating);
  const gk = bucket('GK');
  const def = bucket('DEF');
  const mid = bucket('MID');
  const fwd = bucket('FWD');
  const queues: Record<string, Player[]> = { GK: [...gk], DEF: [...def], MID: [...mid], FWD: [...fwd] };
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

function drawPitch(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#0c2818';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(4, 4, w - 8, h - 8);
  ctx.beginPath();
  ctx.moveTo(4, h / 2);
  ctx.lineTo(w - 4, h / 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, h * 0.09, 0, Math.PI * 2);
  ctx.stroke();
  const boxW = w * 0.46;
  ctx.strokeRect((w - boxW) / 2, 4, boxW, h * 0.16);
  ctx.strokeRect((w - boxW) / 2, h - 4 - h * 0.16, boxW, h * 0.16);
}

function drawDot(ctx: CanvasRenderingContext2D, x: number, y: number, rgb: [number, number, number], hasBall: boolean) {
  ctx.beginPath();
  ctx.fillStyle = `rgb(${rgb.join(',')})`;
  ctx.arc(x, y, hasBall ? 6.5 : 5.5, 0, Math.PI * 2);
  ctx.fill();
  if (hasBall) {
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!latestEvent || latestEvent.type !== 'goal') return;
    const color = latestEvent.clubId === homeClub?.id ? homeClub?.color ?? '#2fd27a' : awayClub?.color ?? '#f2667a';
    setGoalFlash({ key: `${latestEvent.minute}-${latestEvent.clubId}`, color });
    const t = setTimeout(() => setGoalFlash(null), 1600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestEvent?.minute, latestEvent?.type, latestEvent?.clubId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const homeRgb = toRgb(homeClub?.color ?? '#2fd27a');
    const awayRgb = toRgb(awayClub?.color ?? '#f2667a');

    let stopped = false;
    function tick() {
      if (stopped) return;
      const w = canvas!.width;
      const h = canvas!.height;
      if (!paused && document.visibilityState === 'visible' && matchRef.current) {
        for (let i = 0; i < 6; i++) {
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
        for (const p of md.kickOffTeam.players) {
          if (p.currentPOS[0] === 'NP') continue;
          drawDot(ctx!, (p.currentPOS[0] as number) * sx, (p.currentPOS[1] as number) * sy, homeRgb, !!p.hasBall);
        }
        for (const p of md.secondTeam.players) {
          if (p.currentPOS[0] === 'NP') continue;
          drawDot(ctx!, (p.currentPOS[0] as number) * sx, (p.currentPOS[1] as number) * sy, awayRgb, !!p.hasBall);
        }
        const ballHeld = md.kickOffTeam.players.some((p) => p.hasBall) || md.secondTeam.players.some((p) => p.hasBall);
        if (!ballHeld) {
          drawDot(ctx!, md.ball.position[0] * sx, md.ball.position[1] * sy, [255, 255, 255], false);
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      stopped = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [paused, homeClub?.color, awayClub?.color]);

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
