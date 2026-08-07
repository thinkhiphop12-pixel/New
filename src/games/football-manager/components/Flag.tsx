'use client';

/** National flags drawn as inline SVG, one per nation the game simulates.
 *
 *  Flag emoji are not an option here: Windows ships no country-flag glyphs
 *  at all, so 🇪🇸 falls back to the bare regional-indicator letters ("ES")
 *  and the subdivision flags used for England and Scotland degrade to a
 *  lone waving-flag glyph. Drawing them means every player sees the same
 *  thing on every platform.
 *
 *  Each flag is described in a 30×20 viewBox — the 3:2 ratio most of these
 *  use — and rendered at whatever size the caller asks for. The intricate
 *  ones (the Indian chakra, the Saudi shahada, the Australian Union Jack)
 *  are simplified to their recognisable shapes at the ~48px this is drawn
 *  at, not reproduced heraldically.
 */

type Stripe = { c: string; x?: number; y?: number; w?: number; h?: number };

/** Horizontal bands, top to bottom, in equal shares unless weights given. */
function bands(colors: string[], weights?: number[]): Stripe[] {
  const w = weights ?? colors.map(() => 1);
  const total = w.reduce((s, n) => s + n, 0);
  let y = 0;
  return colors.map((c, i) => {
    const h = (w[i] / total) * 20;
    const stripe = { c, y, h, x: 0, w: 30 };
    y += h;
    return stripe;
  });
}

/** Vertical bands, left to right, in equal shares. */
function pales(colors: string[], weights?: number[]): Stripe[] {
  const w = weights ?? colors.map(() => 1);
  const total = w.reduce((s, n) => s + n, 0);
  let x = 0;
  return colors.map((c, i) => {
    const width = (w[i] / total) * 30;
    const stripe = { c, x, w: width, y: 0, h: 20 };
    x += width;
    return stripe;
  });
}

/** Off-centre Nordic cross: field, then the cross arms. */
function nordic(field: string, cross: string, inner?: string): Stripe[] {
  const arms: Stripe[] = [
    { c: cross, x: 0, y: 8, w: 30, h: 4 },
    { c: cross, x: 9, y: 0, w: 4, h: 20 },
  ];
  if (inner) {
    arms.push({ c: inner, x: 0, y: 9, w: 30, h: 2 }, { c: inner, x: 10, y: 0, w: 2, h: 20 });
  }
  return [{ c: field, x: 0, y: 0, w: 30, h: 20 }, ...arms];
}

type FlagSpec = { rects: Stripe[]; extra?: React.ReactNode };

const FLAGS: Record<string, FlagSpec> = {
  England: {
    rects: [
      { c: '#ffffff', x: 0, y: 0, w: 30, h: 20 },
      { c: '#ce1124', x: 0, y: 8, w: 30, h: 4 },
      { c: '#ce1124', x: 13, y: 0, w: 4, h: 20 },
    ],
  },
  Scotland: {
    rects: [{ c: '#005eb8', x: 0, y: 0, w: 30, h: 20 }],
    extra: (
      <g stroke="#ffffff" strokeWidth={4}>
        <path d="M0 0 L30 20" />
        <path d="M30 0 L0 20" />
      </g>
    ),
  },
  Spain: { rects: bands(['#aa151b', '#f1bf00', '#aa151b'], [1, 2, 1]) },
  Italy: { rects: pales(['#008c45', '#ffffff', '#cd212a']) },
  Germany: { rects: bands(['#000000', '#dd0000', '#ffce00']) },
  France: { rects: pales(['#002395', '#ffffff', '#ed2939']) },
  Netherlands: { rects: bands(['#ae1c28', '#ffffff', '#21468b']) },
  Portugal: {
    rects: pales(['#046a38', '#da291c'], [2, 3]),
    extra: <circle cx={12} cy={10} r={4} fill="#ffe900" stroke="#da291c" strokeWidth={0.9} />,
  },
  Belgium: { rects: pales(['#000000', '#fdda24', '#ef3340']) },
  'United States': {
    rects: [
      ...bands(
        ['#b31942', '#ffffff', '#b31942', '#ffffff', '#b31942', '#ffffff', '#b31942'],
      ),
      { c: '#0a3161', x: 0, y: 0, w: 13, h: 11 },
    ],
  },
  Denmark: { rects: nordic('#c8102e', '#ffffff') },
  Norway: { rects: nordic('#ba0c2f', '#ffffff', '#00205b') },
  Sweden: { rects: nordic('#005293', '#fecb00') },
  Switzerland: {
    rects: [
      { c: '#d52b1e', x: 0, y: 0, w: 30, h: 20 },
      { c: '#ffffff', x: 13, y: 5, w: 4, h: 10 },
      { c: '#ffffff', x: 10, y: 8, w: 10, h: 4 },
    ],
  },
  Austria: { rects: bands(['#ed2939', '#ffffff', '#ed2939']) },
  Argentina: {
    rects: bands(['#75aadb', '#ffffff', '#75aadb']),
    extra: <circle cx={15} cy={10} r={2.6} fill="#f6b40e" stroke="#85340a" strokeWidth={0.5} />,
  },
  Turkey: {
    rects: [{ c: '#e30a17', x: 0, y: 0, w: 30, h: 20 }],
    extra: (
      <g fill="#ffffff">
        <circle cx={12} cy={10} r={5} />
        <circle cx={13.8} cy={10} r={4} fill="#e30a17" />
        <path d="M18.4 10 L21.6 8.9 L19.6 11.6 L19.6 8.4 L21.6 11.1 Z" />
      </g>
    ),
  },
  'Saudi Arabia': {
    rects: [{ c: '#006c35', x: 0, y: 0, w: 30, h: 20 }],
    extra: (
      <g fill="#ffffff">
        <rect x={7} y={7.4} width={16} height={1.5} rx={0.7} />
        <rect x={8.5} y={10.2} width={13} height={1.1} rx={0.5} />
        <rect x={9} y={13} width={12} height={1.6} rx={0.8} />
      </g>
    ),
  },
  China: {
    rects: [{ c: '#ee1c25', x: 0, y: 0, w: 30, h: 20 }],
    extra: (
      <g fill="#ffde00">
        <path d="M7 3 L8.3 6.6 L11.9 6.6 L9 8.9 L10.1 12.5 L7 10.3 L3.9 12.5 L5 8.9 L2.1 6.6 L5.7 6.6 Z" />
        <circle cx={13} cy={3.4} r={1} />
        <circle cx={15.4} cy={5.6} r={1} />
        <circle cx={15.4} cy={8.8} r={1} />
        <circle cx={13} cy={11} r={1} />
      </g>
    ),
  },
  'South Korea': {
    rects: [{ c: '#ffffff', x: 0, y: 0, w: 30, h: 20 }],
    extra: (
      <>
        <path d="M11 10 a2 2 0 0 1 4 0 a2 2 0 0 0 4 0 a4 4 0 0 0 -8 0 Z" fill="#cd2e3a" />
        <path d="M11 10 a2 2 0 0 0 4 0 a2 2 0 0 1 4 0 a4 4 0 0 1 -8 0 Z" fill="#0047a0" />
        <g stroke="#000000" strokeWidth={0.7}>
          <path d="M4 5.5 L7.5 3.5 M4 7 L7.5 5 M22.5 15 L26 13 M22.5 16.5 L26 14.5" />
        </g>
      </>
    ),
  },
  Poland: { rects: bands(['#ffffff', '#dc143c']) },
  Romania: { rects: pales(['#002b7f', '#fcd116', '#ce1126']) },
  Australia: {
    rects: [
      { c: '#00008b', x: 0, y: 0, w: 30, h: 20 },
      { c: '#ffffff', x: 0, y: 0, w: 13, h: 9 },
    ],
    extra: (
      <>
        <g stroke="#cf142b" strokeWidth={1.6}>
          <path d="M6.5 0 L6.5 9 M0 4.5 L13 4.5" />
        </g>
        <g fill="#ffffff">
          <circle cx={21} cy={7} r={1.5} />
          <circle cx={24.5} cy={12} r={1.2} />
          <circle cx={18.5} cy={14} r={1.2} />
          <circle cx={7} cy={15} r={1.4} />
        </g>
      </>
    ),
  },
  India: {
    rects: bands(['#ff9933', '#ffffff', '#138808']),
    extra: <circle cx={15} cy={10} r={2.6} fill="none" stroke="#000080" strokeWidth={0.9} />,
  },
  Ireland: { rects: pales(['#169b62', '#ffffff', '#ff883e']) },
};

function getFlag(country: string): FlagSpec | undefined {
  return Object.prototype.hasOwnProperty.call(FLAGS, country) ? FLAGS[country] : undefined;
}

/** True where the game knows how to draw this nation's flag. */
export function hasFlag(country: string): boolean {
  return getFlag(country) !== undefined;
}

export default function Flag({
  country,
  size = 48,
  className,
}: {
  readonly country: string;
  readonly size?: number;
  readonly className?: string;
}) {
  const spec = getFlag(country);
  const width = size;
  const height = Math.round((size * 2) / 3);

  return (
    <svg
      viewBox="0 0 30 20"
      width={width}
      height={height}
      className={className}
      role="img"
      aria-label={`Flag of ${country}`}
      style={{ borderRadius: 3, display: 'block' }}
    >
      {spec ? (
        <>
          {spec.rects.map((r, i) => (
            <rect
              key={i}
              x={r.x ?? 0}
              y={r.y ?? 0}
              width={r.w ?? 30}
              height={r.h ?? 20}
              fill={r.c}
            />
          ))}
          {spec.extra}
        </>
      ) : (
        // No drawing for this nation: a neutral field with its initials, so a
        // league added to the dataset before its flag still renders sanely.
        <>
          <rect x={0} y={0} width={30} height={20} fill="#1f2937" />
          <text
            x={15}
            y={13.5}
            textAnchor="middle"
            fontSize={9}
            fontWeight={800}
            fill="#e5e7eb"
            fontFamily="system-ui, sans-serif"
          >
            {country.slice(0, 2).toUpperCase()}
          </text>
        </>
      )}
      {/* Hairline edge so white flags (Poland, England) stay visible on the
          dark panel behind them. */}
      <rect x={0.25} y={0.25} width={29.5} height={19.5} fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth={0.5} />
    </svg>
  );
}
