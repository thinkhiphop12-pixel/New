'use client';

import { useEffect, useRef } from 'react';
import type { Club } from '@/engine/types';
import type { MinuteSnapshot, TeamSide } from '@/engine/tickEngine/types';
import { getFormation } from '@/engine/gameRules';
import { matchKits } from '@/lib/clubColors';

/** Frames of ball history kept for the trail. Tuned against the easing rate
 *  (0.14/frame toward target): ~14 frames is roughly a quarter-second of
 *  travel, long enough to show direction and short enough that the trail
 *  never lags far enough behind to read as a second ball. */
const TRAIL_LEN = 14;

/** Deterministic per-player-per-minute jitter so replays look identical. */
function noise(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1; // -1..1
}

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [47, 210, 122];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}



interface Token {
  key: string;
  along: number; // 0..1 left → right of the landscape pitch
  across: number; // 0..1 top → bottom
  num?: number;
  kind: 'player' | 'gk' | 'ref' | 'assist' | 'ball';
  side?: TeamSide;
  onBall?: boolean;
}

/** Kit colours: home keeps its first choice, away changes if it would clash
 *  (see matchKits — Arsenal vs Wrexham cannot both be red on this pitch). */
function kitColors(homeClub: Club | undefined, awayClub: Club | undefined) {
  return matchKits(homeClub?.name, awayClub?.name);
}

/**
 * Compute where every token should be for the currently revealed minute.
 * Player targets are their formation anchor pulled toward the ball plus a
 * deterministic per-minute wander, which reads like FM's top-down match view.
 */
function computeTargets(snap: MinuteSnapshot, minute: number): Token[] {
  const tokens: Token[] = [];
  const ballAlong = snap.ballY;
  const ballAcross = snap.ballX;

  for (const side of ['home', 'away'] as TeamSide[]) {
    const ctx = snap.resume[side];
    const formation = getFormation(ctx.formationId);
    // Nearest outfielder of the possession side carries the ball.
    let carrier = -1;
    let carrierDist = Infinity;
    const placed: { i: number; along: number; across: number }[] = [];
    formation.slots.forEach((slot, i) => {
      const id = ctx.lineup[i];
      if (id === null || id === undefined) return; // sent off / empty slot
      const isGk = slot.pos === 'GK';
      const mirror = side === 'away';
      let along: number;
      let across = 0.1 + (slot.x / 100) * 0.8;
      if (isGk) {
        const base = 0.045 + (ballAlong - 0.5) * 0.03 * (mirror ? -1 : 1);
        along = mirror ? 1 - base : base;
        across = 0.5 + (ballAcross - 0.5) * 0.1;
      } else {
        const anchor = 0.06 + (slot.y / 100) * 0.6;
        const shifted = anchor + (Math.abs((mirror ? 1 - ballAlong : ballAlong)) - 0.5) * 0.34;
        along = mirror ? 1 - shifted : shifted;
        along += noise(minute * 13 + i * 7 + (mirror ? 501 : 0)) * 0.02;
        across += (ballAcross - 0.5) * 0.22 + noise(minute * 17 + i * 11 + (mirror ? 900 : 0)) * 0.025;
      }
      along = Math.min(0.975, Math.max(0.025, along));
      across = Math.min(0.96, Math.max(0.04, across));
      if (!isGk && snap.possession === side) {
        const d = Math.abs(along - ballAlong) + Math.abs(across - ballAcross);
        if (d < carrierDist) {
          carrierDist = d;
          carrier = i;
        }
      }
      placed.push({ i, along, across });
    });
    for (const p of placed) {
      const slot = formation.slots[p.i];
      const isCarrier = p.i === carrier;
      tokens.push({
        key: `${side}${p.i}`,
        along: isCarrier ? ballAlong + (p.along - ballAlong) * 0.2 : p.along,
        across: isCarrier ? ballAcross + (p.across - ballAcross) * 0.2 : p.across,
        num: p.i + 1,
        kind: slot.pos === 'GK' ? 'gk' : 'player',
        side,
        onBall: isCarrier,
      });
    }
  }

  tokens.push({ key: 'ball', along: ballAlong, across: ballAcross, kind: 'ball' });
  tokens.push({
    key: 'ref',
    along: Math.min(0.92, Math.max(0.08, ballAlong - 0.05 + noise(minute * 3) * 0.02)),
    across: Math.min(0.9, Math.max(0.1, ballAcross + 0.09)),
    kind: 'ref',
  });
  tokens.push({ key: 'a1', along: Math.min(0.95, Math.max(0.55, ballAlong)), across: -0.035, kind: 'assist' });
  tokens.push({ key: 'a2', along: Math.min(0.45, Math.max(0.05, ballAlong)), across: 1.035, kind: 'assist' });
  return tokens;
}

/** Paint the static stadium: stands, ad boards, grass and markings. */
function paintStadium(ctx: CanvasRenderingContext2D, w: number, h: number, px: number, py: number, pw: number, ph: number) {
  // Concrete surround.
  ctx.fillStyle = '#b9bec5';
  ctx.fillRect(0, 0, w, h);

  // Stands: striped seating blocks on all four sides.
  const stand = (x: number, y: number, sw: number, sh: number, horizontal: boolean) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, sw, sh);
    ctx.clip();
    ctx.fillStyle = '#c6cbd1';
    ctx.fillRect(x, y, sw, sh);
    ctx.fillStyle = '#d6dade';
    const step = 7;
    if (horizontal) {
      for (let yy = y; yy < y + sh; yy += step) ctx.fillRect(x, yy, sw, 3);
      // aisles
      ctx.fillStyle = '#aeb4bb';
      for (let xx = x + sw * 0.18; xx < x + sw; xx += sw * 0.22) ctx.fillRect(xx, y, 3, sh);
    } else {
      for (let xx = x; xx < x + sw; xx += step) ctx.fillRect(xx, y, 3, sh);
      ctx.fillStyle = '#aeb4bb';
      for (let yy = y + sh * 0.18; yy < y + sh; yy += sh * 0.22) ctx.fillRect(x, yy, sw, 3);
    }
    ctx.restore();
  };
  const board = 10; // ad board thickness
  stand(0, 0, w, py - board, true);
  stand(0, h - (h - py - ph) + board, w, h - py - ph - board, true);
  stand(0, 0, px - board, h, false);
  stand(w - (w - px - pw) + board, 0, w - px - pw - board, h, false);

  // Ad boards hugging the pitch. Lime on deep green — BALLKNW's own palette,
  // replacing the design spec's purple/yellow hoardings (PLAN.md decision 1).
  const BOARD_DARK = '#0b2a16';
  const BOARD_LIME = '#b8ff3c';
  const segs = ['BALLKNW', 'GAFFER', 'BALLKNW', 'GAFFER'];
  const drawBoard = (x: number, y: number, bw: number, bh: number, vertical: boolean) => {
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = i % 2 ? BOARD_LIME : BOARD_DARK;
      if (vertical) ctx.fillRect(x, y + (bh / 8) * i, bw, bh / 8);
      else ctx.fillRect(x + (bw / 8) * i, y, bw / 8, bh);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = '700 6px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < 8; i++) {
      if (i % 2 === 0) continue; // text on the dark segments reads poorly at this size
      const label = segs[(i >> 1) % segs.length];
      if (vertical) {
        ctx.save();
        ctx.translate(x + bw / 2, y + (bh / 8) * (i + 0.5));
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = BOARD_DARK;
        ctx.fillText(label, 0, 0);
        ctx.restore();
      } else {
        ctx.fillStyle = BOARD_DARK;
        ctx.fillText(label, x + (bw / 8) * (i + 0.5), y + bh / 2);
      }
    }
  };
  drawBoard(px, py - board - 1, pw, board, false);
  drawBoard(px, py + ph + 1, pw, board, false);
  drawBoard(px - board - 1, py, board, ph, true);
  drawBoard(px + pw + 1, py, board, ph, true);

  // Checkered grass.
  const cols = 16;
  const rows = 10;
  for (let cx = 0; cx < cols; cx++) {
    for (let cy = 0; cy < rows; cy++) {
      ctx.fillStyle = (cx + cy) % 2 ? '#54923f' : '#4c8a38';
      ctx.fillRect(px + (pw / cols) * cx, py + (ph / rows) * cy, pw / cols + 1, ph / rows + 1);
    }
  }
  // Stand shadow across the top edge for depth.
  const grad = ctx.createLinearGradient(0, py, 0, py + ph * 0.45);
  grad.addColorStop(0, 'rgba(20,30,20,0.30)');
  grad.addColorStop(1, 'rgba(20,30,20,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(px, py, pw, ph * 0.45);

  // Markings.
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 1.6;
  ctx.strokeRect(px, py, pw, ph);
  ctx.beginPath();
  ctx.moveTo(px + pw / 2, py);
  ctx.lineTo(px + pw / 2, py + ph);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(px + pw / 2, py + ph / 2, ph * 0.16, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(px + pw / 2, py + ph / 2, 2, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fill();

  const boxH = ph * 0.58;
  const boxW = pw * 0.135;
  const sixH = ph * 0.28;
  const sixW = pw * 0.05;
  const goalH = ph * 0.12;
  for (const left of [true, false]) {
    const bx = left ? px : px + pw - boxW;
    ctx.strokeRect(bx, py + (ph - boxH) / 2, boxW, boxH);
    const sx = left ? px : px + pw - sixW;
    ctx.strokeRect(sx, py + (ph - sixH) / 2, sixW, sixH);
    // Penalty spot + D.
    const spotX = left ? px + pw * 0.095 : px + pw - pw * 0.095;
    ctx.beginPath();
    ctx.arc(spotX, py + ph / 2, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(spotX, py + ph / 2, ph * 0.13, left ? -0.9 : Math.PI - 0.9, left ? 0.9 : Math.PI + 0.9);
    ctx.stroke();
    // Goal + net.
    const gx = left ? px - 6 : px + pw;
    ctx.fillStyle = 'rgba(240,240,240,0.85)';
    ctx.fillRect(gx, py + (ph - goalH) / 2, 6, goalH);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    // Corner arcs.
    for (const top of [true, false]) {
      ctx.beginPath();
      ctx.arc(left ? px : px + pw, top ? py : py + ph, 7, 0, Math.PI * 2);
      ctx.save();
      ctx.beginPath();
      ctx.rect(px, py, pw, ph);
      ctx.clip();
      ctx.beginPath();
      ctx.arc(left ? px : px + pw, top ? py : py + ph, 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}

/**
 * FM-style top-down live pitch: stadium surround, checkered grass and
 * numbered kit-coloured tokens easing toward per-minute targets.
 */
export default function PitchCanvas({
  snapshots,
  minute,
  homeClub,
  awayClub,
  resetKey,
}: {
  snapshots: MinuteSnapshot[];
  minute: number;
  homeClub: Club | undefined;
  awayClub: Club | undefined;
  resetKey: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bgRef = useRef<HTMLCanvasElement | null>(null);
  const positions = useRef<Map<string, { along: number; across: number }>>(new Map());
  /** Recent ball positions in pitch-relative units, newest last. Painted as a
   *  fading taper so the eye can follow a switch of play across the pitch —
   *  a 6px white dot moving between 22 tokens is genuinely hard to track. */
  const trail = useRef<{ along: number; across: number }[]>([]);
  const frame = useRef<{ snapshots: MinuteSnapshot[]; minute: number }>({ snapshots, minute });
  frame.current = { snapshots, minute };

  useEffect(() => {
    positions.current.clear();
    trail.current.length = 0;
  }, [resetKey]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let raf = 0;
    let bgW = 0;
    let bgH = 0;
    // Read once per mount rather than per frame — the trail is decorative
    // motion, so it is the part that goes when the player asks for less.
    const reduceMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const draw = () => {
      raf = requestAnimationFrame(draw);
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      if (w === 0 || h === 0) return;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Pitch rect inside the stands.
      const px = Math.round(w * 0.075);
      const py = Math.round(h * 0.1);
      const pw = w - px * 2;
      const ph = h - py * 2;

      // Re-render the static stadium only when the size changes.
      if (!bgRef.current || bgW !== w || bgH !== h) {
        bgRef.current = document.createElement('canvas');
        bgRef.current.width = Math.round(w * dpr);
        bgRef.current.height = Math.round(h * dpr);
        const bctx = bgRef.current.getContext('2d')!;
        bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        paintStadium(bctx, w, h, px, py, pw, ph);
        bgW = w;
        bgH = h;
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(bgRef.current, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const { snapshots: snaps, minute: min } = frame.current;
      let cur: MinuteSnapshot | undefined;
      for (const sn of snaps) {
        if (sn.minute > Math.max(1, min)) break;
        cur = sn;
      }
      if (!cur) return;

      const targets = computeTargets(cur, cur.minute);
      const kits = kitColors(homeClub, awayClub);
      const r = Math.max(8, Math.min(13, pw * 0.016));

      // Ease every token toward its target. Painting is a second pass so the
      // ball trail and the carrier glow can go *under* the tokens — drawn
      // inline they would sit on top of the players they belong to.
      const painted: { t: Token; x: number; y: number }[] = [];
      for (const t of targets) {
        let p = positions.current.get(t.key);
        if (!p) {
          p = { along: t.along, across: t.across };
          positions.current.set(t.key, p);
        }
        const k = t.kind === 'ball' ? 0.14 : 0.075;
        p.along += (t.along - p.along) * k;
        p.across += (t.across - p.across) * k;
        painted.push({ t, x: px + p.along * pw, y: py + p.across * ph });
        if (t.kind === 'ball') {
          trail.current.push({ along: p.along, across: p.across });
          if (trail.current.length > TRAIL_LEN) trail.current.shift();
        }
      }

      // Ball trail: oldest → newest, widening and brightening as it goes.
      if (!reduceMotion && trail.current.length > 1) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        for (let i = 1; i < trail.current.length; i++) {
          const a = trail.current[i - 1];
          const b = trail.current[i];
          const f = i / trail.current.length; // 0 oldest → 1 newest
          ctx.beginPath();
          ctx.moveTo(px + a.along * pw, py + a.across * ph - r * 0.9);
          ctx.lineTo(px + b.along * pw, py + b.across * ph - r * 0.9);
          ctx.strokeStyle = `rgba(255,255,255,${(0.28 * f).toFixed(3)})`;
          ctx.lineWidth = Math.max(0.6, r * 0.34 * f);
          ctx.stroke();
        }
      }

      // Carrier glow: a soft pool of the kit colour under whoever has the
      // ball, so possession is readable without hunting for the yellow ring.
      const carrier = painted.find((q) => q.t.onBall);
      if (carrier) {
        const glow = carrier.t.side === 'home' ? kits.home : kits.away;
        const [gr, gg, gb] = hexToRgb(glow);
        const rad = ctx.createRadialGradient(carrier.x, carrier.y, 0, carrier.x, carrier.y, r * 3.2);
        rad.addColorStop(0, `rgba(${gr},${gg},${gb},0.38)`);
        rad.addColorStop(1, `rgba(${gr},${gg},${gb},0)`);
        ctx.fillStyle = rad;
        ctx.beginPath();
        ctx.arc(carrier.x, carrier.y, r * 3.2, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const { t, x, y } of painted) {
        if (t.kind === 'ball') {
          ctx.beginPath();
          ctx.arc(x, y - r * 0.9, r * 0.42, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = 'rgba(0,0,0,0.55)';
          ctx.shadowBlur = 3;
          ctx.shadowOffsetY = 2;
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.shadowOffsetY = 0;
          ctx.beginPath();
          ctx.arc(x - r * 0.12, y - r * 0.98, r * 0.13, 0, Math.PI * 2);
          ctx.fillStyle = '#222';
          ctx.fill();
          continue;
        }

        const fill =
          t.kind === 'ref' || t.kind === 'assist'
            ? '#111111'
            : t.kind === 'gk'
              ? '#1fa055'
              : t.side === 'home'
                ? kits.home
                : kits.away;
        const label = t.kind === 'ref' ? 'R' : t.kind === 'assist' ? 'A' : String(t.num ?? '');

        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = fill;
        ctx.shadowColor = 'rgba(0,0,0,0.45)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetY = 2;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        ctx.lineWidth = 1.6;
        ctx.strokeStyle = luminance(fill) > 0.6 ? 'rgba(30,40,80,0.55)' : 'rgba(255,255,255,0.9)';
        ctx.stroke();
        if (t.onBall) {
          ctx.beginPath();
          ctx.arc(x, y, r + 2.5, 0, Math.PI * 2);
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#ffe23f';
          ctx.stroke();
        }
        ctx.font = `800 ${Math.round(r * 1.02)}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = t.kind === 'player' && luminance(fill) > 0.6 ? '#20337a' : '#ffffff';
        ctx.fillText(label, x, y + 0.5);
      }
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [homeClub, awayClub, resetKey]);

  return <canvas ref={canvasRef} className="fm-matchx__canvas" />;
}
