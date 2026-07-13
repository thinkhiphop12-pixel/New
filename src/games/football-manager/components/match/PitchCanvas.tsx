'use client';

import { useEffect, useRef } from 'react';
import type { Club } from '@/engine/types';
import type { MinuteSnapshot } from '@/engine/tickEngine/types';

/** Heatmap grid resolution (landscape pitch: x = along pitch, y = across). */
const GW = 36;
const GH = 24;

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [47, 210, 122];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Landscape pitch with a live accumulating possession heatmap. Home attacks
 * right. Heat is splatted into a low-res buffer per team and upscaled with
 * smoothing, like the reference sim.
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
  const heat = useRef<{ home: Float32Array; away: Float32Array; upTo: number }>({
    home: new Float32Array(GW * GH),
    away: new Float32Array(GW * GH),
    upTo: 0,
  });

  useEffect(() => {
    heat.current = { home: new Float32Array(GW * GH), away: new Float32Array(GW * GH), upTo: 0 };
  }, [resetKey]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    if (canvas.width !== Math.round(w * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Accumulate heat for any newly-revealed minutes.
    const hm = heat.current;
    if (hm.upTo > minute) {
      hm.home.fill(0);
      hm.away.fill(0);
      hm.upTo = 0;
    }
    for (const snap of snapshots) {
      if (snap.minute <= hm.upTo || snap.minute > minute) continue;
      // ballY is 0 at the home goal line → landscape x. ballX is across → y.
      const gx = Math.min(GW - 1, Math.max(0, Math.floor(snap.ballY * GW)));
      const gy = Math.min(GH - 1, Math.max(0, Math.floor(snap.ballX * GH)));
      const grid = snap.possession === 'home' ? hm.home : hm.away;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const x = gx + dx;
          const y = gy + dy;
          if (x < 0 || x >= GW || y < 0 || y >= GH) continue;
          grid[y * GW + x] += dx === 0 && dy === 0 ? 1 : 0.35;
        }
      }
    }
    hm.upTo = Math.max(hm.upTo, minute);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Pitch base + mow stripes.
    ctx.fillStyle = '#0e3520';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 12; i++) {
      if (i % 2) continue;
      ctx.fillStyle = 'rgba(255,255,255,0.025)';
      ctx.fillRect((w / 12) * i, 0, w / 12, h);
    }

    // Heatmaps via a low-res offscreen buffer upscaled with smoothing.
    const maxHeat = Math.max(4, ...hm.home, ...hm.away);
    const off = document.createElement('canvas');
    off.width = GW;
    off.height = GH;
    const octx = off.getContext('2d')!;
    const img = octx.createImageData(GW, GH);
    const homeRgb = hexToRgb(homeClub?.color ?? '#2fd27a');
    let awayRgb = hexToRgb(awayClub?.color ?? '#f2667a');
    if (Math.abs(homeRgb[0] - awayRgb[0]) + Math.abs(homeRgb[1] - awayRgb[1]) + Math.abs(homeRgb[2] - awayRgb[2]) < 90) {
      awayRgb = [242, 102, 122];
    }
    for (let i = 0; i < GW * GH; i++) {
      const hv = hm.home[i] / maxHeat;
      const av = hm.away[i] / maxHeat;
      const t = hv + av;
      if (t <= 0) continue;
      img.data[i * 4] = Math.round((homeRgb[0] * hv + awayRgb[0] * av) / t);
      img.data[i * 4 + 1] = Math.round((homeRgb[1] * hv + awayRgb[1] * av) / t);
      img.data[i * 4 + 2] = Math.round((homeRgb[2] * hv + awayRgb[2] * av) / t);
      img.data[i * 4 + 3] = Math.round(Math.min(1, t) * 175);
    }
    octx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(off, 8, 8, w - 16, h - 16);

    // Markings.
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1.5;
    const mx = 10;
    const my = 10;
    const pw = w - mx * 2;
    const ph = h - my * 2;
    ctx.strokeRect(mx, my, pw, ph);
    ctx.beginPath();
    ctx.moveTo(w / 2, my);
    ctx.lineTo(w / 2, h - my);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, Math.min(pw, ph) * 0.12, 0, Math.PI * 2);
    ctx.stroke();
    const boxH = ph * 0.55;
    const boxW = pw * 0.14;
    const sixH = ph * 0.26;
    const sixW = pw * 0.05;
    for (const left of [true, false]) {
      const bx = left ? mx : w - mx - boxW;
      ctx.strokeRect(bx, (h - boxH) / 2, boxW, boxH);
      const sx = left ? mx : w - mx - sixW;
      ctx.strokeRect(sx, (h - sixH) / 2, sixW, sixH);
    }

    // Ball dot at the latest revealed snapshot.
    const cur = [...snapshots].reverse().find((sn) => sn.minute <= minute);
    if (cur) {
      const bx = mx + cur.ballY * pw;
      const by = my + cur.ballX * ph;
      ctx.beginPath();
      ctx.arc(bx, by, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 4;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Attacking direction labels.
    ctx.font = '700 10px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.textAlign = 'left';
    ctx.fillText(`${homeClub?.code ?? 'HOME'} →`, mx + 6, my + 14);
    ctx.textAlign = 'right';
    ctx.fillText(`← ${awayClub?.code ?? 'AWAY'}`, w - mx - 6, h - my - 8);
    ctx.textAlign = 'left';
  }, [snapshots, minute, homeClub, awayClub, resetKey]);

  return <canvas ref={canvasRef} className="fm-matchx__canvas" />;
}
