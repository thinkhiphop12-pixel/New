'use client';

/** Hex radar (spider) chart for player attributes, ported from the
 *  competitor's `buildSpiderChart` (SVG-string generator) into JSX. Six
 *  axes, a filled "Current" polygon, and — only when `potentials` is
 *  supplied — a dashed ghosted "Potential" outline. */

const CX = 100;
const CY = 100;
const R = 66;

function angle(i: number, n: number): number {
  return (i / n) * Math.PI * 2 - Math.PI / 2;
}

function pt(val: number, i: number, n: number): [number, number] {
  const a = angle(i, n);
  const d = (Math.max(0, val) / 99) * R;
  return [CX + d * Math.cos(a), CY + d * Math.sin(a)];
}

function polyStr(pts: [number, number][]): string {
  return pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
}

export function SpiderChart({
  labels,
  values,
  potentials,
  size = 176,
}: {
  labels: string[];
  values: number[];
  /** Optional potential values, same length as `values`. When omitted the
   *  dashed potential outline and its polygon are not rendered. */
  potentials?: number[];
  size?: number;
}) {
  const n = labels.length;
  const grid = [0.25, 0.5, 0.75, 1].map((s, gi) => {
    const pts = labels.map((_, i) => {
      const a = angle(i, n);
      return [CX + s * R * Math.cos(a), CY + s * R * Math.sin(a)] as [number, number];
    });
    return (
      <polygon
        key={gi}
        points={polyStr(pts)}
        fill="none"
        stroke="rgba(255,255,255,0.07)"
        strokeWidth={1}
      />
    );
  });

  const axes = labels.map((_, i) => {
    const a = angle(i, n);
    return (
      <line
        key={i}
        x1={CX}
        y1={CY}
        x2={(CX + R * Math.cos(a)).toFixed(1)}
        y2={(CY + R * Math.sin(a)).toFixed(1)}
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={1}
      />
    );
  });

  const lbls = labels.map((name, i) => {
    const a = angle(i, n);
    const d = R + 17;
    return (
      <text
        key={name}
        x={(CX + d * Math.cos(a)).toFixed(1)}
        y={(CY + d * Math.sin(a)).toFixed(1)}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="rgba(255,255,255,0.45)"
        fontSize={9}
        fontFamily="Oswald,sans-serif"
      >
        {name}
      </text>
    );
  });

  const curPts = labels.map((_, i) => pt(values[i] ?? 0, i, n));
  const hasPot = !!potentials && potentials.length === n;
  const potPts = hasPot ? labels.map((_, i) => pt(potentials![i] ?? 0, i, n)) : null;

  const dots = curPts.map(([x, y], i) => (
    <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r={2.5} fill="#00d084" />
  ));

  return (
    <svg viewBox="0 0 200 200" style={{ width: size, height: size, display: 'block', margin: '0 auto' }}>
      {grid}
      {axes}
      {lbls}
      {potPts && (
        <polygon
          points={polyStr(potPts)}
          fill="rgba(255,255,255,0.04)"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth={1.5}
          strokeDasharray="3,2"
        />
      )}
      <polygon points={polyStr(curPts)} fill="rgba(0,208,132,0.12)" stroke="#00d084" strokeWidth={2} />
      {dots}
    </svg>
  );
}
