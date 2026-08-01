/**
 * Procedural canvas textures for the 3D stadium menu (gap 77).
 *
 * Everything here is generated at runtime from a 2D canvas — the game ships no
 * external image assets for the menu, by design. All functions touch
 * `document`, so they MUST only ever be called from inside a `useEffect`
 * (client-side), never at module scope or during render: this app is built by
 * Next.js and a module-scope `document` access would break the build.
 */
import * as THREE from 'three';

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2d context unavailable');
  return [c, ctx];
}

/** Deterministic hash-noise so the crowd looks the same every load (no flicker between mounts). */
function noise(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed * 43.7585) * 43758.5453;
  return n - Math.floor(n);
}

/**
 * Pitch: mown stripes plus full white line markings (touchlines, halfway line,
 * centre circle + spot, both penalty boxes, six-yard boxes, penalty spots and
 * arcs, corner arcs). Drawn in a 105x68-proportional space so the markings land
 * in the right places on the 105x68 plane it is mapped onto.
 */
export function makePitchTexture(): THREE.CanvasTexture {
  // 2048x1328 ~= 105:68, a bit over 19px per metre.
  const PX = 20;
  const W = 105 * PX;
  const H = 68 * PX;
  const [canvas, ctx] = makeCanvas(W, H);
  const m = (v: number) => v * PX;

  // Mown stripes down the length of the pitch.
  const STRIPES = 14;
  for (let i = 0; i < STRIPES; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#2f7a34' : '#276a2c';
    ctx.fillRect((i * W) / STRIPES, 0, W / STRIPES + 1, H);
  }

  // Subtle turf grain so the stripes don't read as flat vector bands.
  const grain = ctx.getImageData(0, 0, W, H);
  for (let i = 0; i < grain.data.length; i += 4) {
    const p = (i / 4) | 0;
    const d = (noise(p % W, (p / W) | 0, 1) - 0.5) * 18;
    grain.data[i] += d;
    grain.data[i + 1] += d;
    grain.data[i + 2] += d;
  }
  ctx.putImageData(grain, 0, 0);

  ctx.strokeStyle = 'rgba(255,255,255,0.88)';
  ctx.lineWidth = Math.max(2, m(0.25));
  ctx.lineCap = 'butt';

  // Touchlines / goal lines, inset 2m from the plane edge.
  const IN = m(2);
  ctx.strokeRect(IN, IN, W - IN * 2, H - IN * 2);

  // Halfway line + centre circle + centre spot.
  ctx.beginPath();
  ctx.moveTo(W / 2, IN);
  ctx.lineTo(W / 2, H - IN);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(W / 2, H / 2, m(9.15), 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  ctx.beginPath();
  ctx.arc(W / 2, H / 2, m(0.35), 0, Math.PI * 2);
  ctx.fill();

  // Boxes + penalty spots + D-arcs, mirrored at both ends.
  for (const side of [0, 1]) {
    const dir = side === 0 ? 1 : -1;
    const goalX = side === 0 ? IN : W - IN;
    // 16.5m penalty area, 40.32m tall.
    ctx.strokeRect(
      side === 0 ? goalX : goalX - m(16.5),
      H / 2 - m(20.16),
      m(16.5),
      m(40.32),
    );
    // 5.5m six-yard box, 18.32m tall.
    ctx.strokeRect(
      side === 0 ? goalX : goalX - m(5.5),
      H / 2 - m(9.16),
      m(5.5),
      m(18.32),
    );
    const spotX = goalX + dir * m(11);
    ctx.beginPath();
    ctx.arc(spotX, H / 2, m(0.35), 0, Math.PI * 2);
    ctx.fill();
    // Arc outside the box only.
    ctx.beginPath();
    const half = Math.acos(m(5.5) / m(9.15));
    ctx.arc(
      spotX,
      H / 2,
      m(9.15),
      side === 0 ? -half : Math.PI - half,
      side === 0 ? half : Math.PI + half,
    );
    ctx.stroke();
  }

  // Corner arcs.
  for (const cx of [IN, W - IN]) {
    for (const cy of [IN, H - IN]) {
      ctx.beginPath();
      ctx.arc(cx, cy, m(1), 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Crowd: noise-based blocks of seat/shirt colour on a dark seating base, tiled
 * across the stand faces. Not individual spectator sprites — a per-cell colour
 * grid, which is what reads as "a full stand" from menu-camera distance.
 */
export function makeCrowdTexture(repeatX = 8, repeatY = 2): THREE.CanvasTexture {
  const COLS = 96;
  const ROWS = 48;
  const CELL = 6;
  const [canvas, ctx] = makeCanvas(COLS * CELL, ROWS * CELL);

  ctx.fillStyle = '#14181d';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const palette = [
    '#e8e8ec', '#d9dde2', '#c2c8d0', // pale shirts
    '#2b3440', '#232a33', '#1b2028', // empty/dark seats
    '#8b1f2a', '#a8323d', // club red
    '#1f3f8b', '#2b52a8', // club blue
    '#e0c04a', // gold
  ];

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const n = noise(c, r, 7);
      // Back rows sit in shadow under the roof; front rows are brighter.
      const shade = 0.55 + 0.45 * (r / ROWS);
      const col = palette[Math.floor(noise(c, r, 3) * palette.length) % palette.length];
      ctx.globalAlpha = n > 0.12 ? 1 : 0.5; // ~12% of cells read as gaps in the crowd
      ctx.fillStyle = col;
      ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
      ctx.globalAlpha = 1;
      ctx.fillStyle = `rgba(0,0,0,${(1 - shade).toFixed(3)})`;
      ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  return tex;
}

/** Soft radial falloff used as the additive floodlight glow sprite. */
export function makeGlowTexture(): THREE.CanvasTexture {
  const S = 128;
  const [canvas, ctx] = makeCanvas(S, S);
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(255,252,235,1)');
  g.addColorStop(0.15, 'rgba(255,248,215,0.75)');
  g.addColorStop(0.45, 'rgba(255,240,190,0.22)');
  g.addColorStop(1, 'rgba(255,235,170,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
