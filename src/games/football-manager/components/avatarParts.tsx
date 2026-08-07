'use client';

/** Avatar part catalog.
 *
 *  The manager avatar is a stack of layered SVG parts drawn over a fixed head
 *  geometry (head circle centred at 50,54 with r=31 inside a 0 0 100 100
 *  viewBox). Every part is keyed by a stable string id so a saved
 *  `AvatarConfig` keeps meaning across releases, and every catalog is exported
 *  as an ordered `{ id, label }[]` so the creator screen can enumerate
 *  variants without duplicating the list.
 *
 *  Ids are additive-only: never renumber or reuse one, or existing saves will
 *  silently render as a different person. */

/** Shared palette for every colourable axis — one universal set, as in the
 *  reference creator, so unnatural picks (silver hair, vivid kit colours) are
 *  deliberately reachable rather than gated per category. */
export const PALETTE: string[] = [
  '#1b7f5e', '#3aa76d', '#57c785', '#f2e8d5',
  '#b0246e', '#6b3fa0', '#1e5fb4', '#1b3a8f',
  '#f7d9b6', '#d93b3b', '#e0457b', '#e9a8bf',
  '#f0c98a', '#c98a4b', '#8b5a2b', '#e8b4a0',
  '#1a1a1a', '#4a4a4a', '#9a9a9a', '#efefef',
  // DEFAULT_AVATAR's starting colours (CharacterCustomizerScreen.tsx) — kept
  // in the palette so the very first swatch a player sees actually reads as
  // selected, instead of the default rendering a colour the palette can't
  // reproduce.
  '#e8b48a', '#4a3728', '#3b2b20', '#2b3445', '#a85751',
  // Every SKIN_TONES id below also needs to exist here — the Skin category's
  // colour panel reuses this same palette, so picking a variant from that
  // grid must leave a matching swatch selected too, not just the default.
  '#d69f6e', '#b57a4d', '#6b4423', '#4a2f19',
];

/** Quick-pick complexions for the Skin category's variant grid. The palette
 *  above still reaches any tone; these are just the sensible starting points. */
export const SKIN_TONES: { id: string; label: string }[] = [
  { id: '#f7d9b6', label: 'Porcelain' },
  { id: '#f0c98a', label: 'Light' },
  { id: '#e8b48a', label: 'Warm' },
  { id: '#d69f6e', label: 'Golden' },
  { id: '#b57a4d', label: 'Tan' },
  { id: '#8b5a2b', label: 'Bronze' },
  { id: '#6b4423', label: 'Deep' },
  { id: '#4a2f19', label: 'Ebony' },
];

export const HAIR_STYLES: { id: string; label: string }[] = [
  { id: '', label: 'Bald' },
  { id: 'buzz', label: 'Buzz' },
  { id: 'short01', label: 'Crop' },
  { id: 'sidepart', label: 'Side Part' },
  { id: 'quiff', label: 'Quiff' },
  { id: 'curly01', label: 'Curls' },
  { id: 'afro', label: 'Afro' },
  { id: 'straight01', label: 'Waves' },
  { id: 'long01', label: 'Long' },
  { id: 'longstraight', label: 'Sleek' },
  { id: 'bun', label: 'Bun' },
  { id: 'ponytail', label: 'Ponytail' },
];

export const EYEBROW_STYLES: { id: string; label: string }[] = [
  { id: 'default', label: 'Arched' },
  { id: 'flat', label: 'Flat' },
  { id: 'angled', label: 'Angled' },
  { id: 'thin', label: 'Thin' },
  { id: 'bushy', label: 'Bushy' },
  { id: 'raised', label: 'Raised' },
];

export const EYE_STYLES: { id: string; label: string }[] = [
  { id: 'default', label: 'Round' },
  { id: 'narrow', label: 'Narrow' },
  { id: 'wide', label: 'Wide' },
  { id: 'sleepy', label: 'Sleepy' },
  { id: 'sharp', label: 'Sharp' },
  { id: 'closed', label: 'Closed' },
];

export const MOUTH_STYLES: { id: string; label: string }[] = [
  { id: 'default', label: 'Smile' },
  { id: 'neutral', label: 'Neutral' },
  { id: 'frown', label: 'Frown' },
  { id: 'grin', label: 'Grin' },
  { id: 'smirk', label: 'Smirk' },
  { id: 'open', label: 'Shout' },
];

export const FACIAL_HAIR_STYLES: { id: string; label: string }[] = [
  { id: '', label: 'Clean' },
  { id: 'stubble', label: 'Stubble' },
  { id: 'moustache', label: 'Moustache' },
  { id: 'beardLight', label: 'Goatee' },
  { id: 'beardMajestic', label: 'Full Beard' },
  { id: 'beardLong', label: 'Long Beard' },
];

export const ATTIRE_STYLES: { id: string; label: string }[] = [
  { id: 'suittie', label: 'Suit & Tie' },
  { id: 'suitopen', label: 'Open Suit' },
  { id: 'shirt', label: 'Shirt' },
  { id: 'turtleneck', label: 'Turtleneck' },
  { id: 'polo', label: 'Polo' },
  { id: 'tracksuit', label: 'Tracksuit' },
];

export const ACCESSORY_STYLES: { id: string; label: string }[] = [
  { id: '', label: 'None' },
  { id: 'glasses', label: 'Round Specs' },
  { id: 'glassesSquare', label: 'Square Specs' },
  { id: 'sunglasses', label: 'Shades' },
  { id: 'earring', label: 'Earring' },
];

/* ── Part renderers ──
   Each takes resolved colours (already `#`-prefixed by the caller) and
   returns SVG fragments positioned against the fixed head geometry. */

/** Solid hair caps, built from quadratic curves rather than elliptical arcs —
 *  an arc's sweep/large-arc flags are easy to get subtly wrong (they render as
 *  thin bands instead of caps), and a filled cap drawn over the head needs no
 *  inner cut-out at all. `CAP` sits on the hairline at y=40, just above the
 *  brows at y≈47, and crests at y=22 to match the head's crown. */
const CAP = 'M20 42 Q20 16 50 16 Q80 16 80 42 Z';
/** A tighter cap that hugs the scalp, for the shortest cuts. Still has to
 *  overshoot the crown (y=23) or a sliver of bare scalp shows through. */
const CAP_LOW = 'M21 43 Q21 20 50 20 Q79 20 79 43 Z';

export function Hair({ style, color, shadow }: { style: string; color: string; shadow: string }) {
  switch (style) {
    case 'buzz':
      return <path d={CAP_LOW} fill={color} opacity="0.85" />;
    case 'short01':
      return <path d={CAP} fill={color} />;
    case 'sidepart':
      return (
        <g fill={color}>
          <path d={CAP} />
          <path d="M34 23 Q58 27 76 38 Q58 32 33 31 Z" fill={shadow} />
        </g>
      );
    case 'quiff':
      return (
        <g fill={color}>
          <path d={CAP} />
          <path d="M38 24 Q42 8 62 14 Q50 17 46 27 Z" />
        </g>
      );
    case 'curly01':
      return (
        <g fill={color}>
          <path d={CAP} />
          <circle cx="30" cy="32" r="11" />
          <circle cx="44" cy="24" r="12" />
          <circle cx="58" cy="24" r="12" />
          <circle cx="71" cy="32" r="11" />
        </g>
      );
    case 'afro':
      return (
        <g fill={color}>
          <circle cx="50" cy="26" r="23" />
          <circle cx="28" cy="36" r="12" />
          <circle cx="72" cy="36" r="12" />
        </g>
      );
    case 'straight01':
      return (
        <g fill={color}>
          <path d={CAP} />
          <path d="M23 38 Q16 56 21 72 L28 69 Q23 55 28 40 Z" />
          <path d="M77 38 Q84 56 79 72 L72 69 Q77 55 72 40 Z" />
        </g>
      );
    case 'long01':
      return (
        <g fill={color}>
          <path d={CAP} />
          <path d="M23 38 Q19 62 21 80 Q29 82 30 70 Q28 54 29 40 Z" />
          <path d="M77 38 Q81 62 79 80 Q71 82 70 70 Q72 54 71 40 Z" />
        </g>
      );
    case 'longstraight':
      return (
        <g fill={color}>
          <path d={CAP} />
          <path d="M23 38 Q17 66 18 90 Q28 92 29 74 Q28 54 29 40 Z" />
          <path d="M77 38 Q83 66 82 90 Q72 92 71 74 Q72 54 71 40 Z" />
        </g>
      );
    case 'bun':
      return (
        <g fill={color}>
          <path d={CAP} />
          <circle cx="50" cy="15" r="9" />
        </g>
      );
    case 'ponytail':
      return (
        <g fill={color}>
          <path d={CAP} />
          <path d="M74 32 Q90 46 85 72 Q78 73 78 63 Q83 46 70 38 Z" />
        </g>
      );
    default: // bald
      return null;
  }
}

export function Eyebrows({ style, color }: { style: string; color: string }) {
  const common = { stroke: color, fill: 'none', strokeLinecap: 'round' as const };
  switch (style) {
    case 'flat':
      return (
        <g {...common} strokeWidth="2.4">
          <path d="M33 47 L45 47" />
          <path d="M55 47 L67 47" />
        </g>
      );
    case 'angled':
      return (
        <g {...common} strokeWidth="2.6">
          <path d="M33 49 L45 45" />
          <path d="M67 49 L55 45" />
        </g>
      );
    case 'thin':
      return (
        <g {...common} strokeWidth="1.6">
          <path d="M34 47 Q39 44 45 47" />
          <path d="M55 47 Q61 44 66 47" />
        </g>
      );
    case 'bushy':
      return (
        <g fill={color}>
          <path d="M32 50 Q38 42 46 46 Q39 47 33 51 Z" />
          <path d="M68 50 Q62 42 54 46 Q61 47 67 51 Z" />
        </g>
      );
    case 'raised':
      return (
        <g {...common} strokeWidth="2.2">
          <path d="M33 45 Q39 41 45 44" />
          <path d="M55 46 Q61 43 67 47" />
        </g>
      );
    default: // arched
      return (
        <g {...common} strokeWidth="2.2">
          <path d="M33 48 Q39 44 45 48" />
          <path d="M55 48 Q61 44 67 48" />
        </g>
      );
  }
}

export function Eyes({ style, color }: { style: string; color: string }) {
  const L = 38;
  const R = 62;
  const y = 57;
  switch (style) {
    case 'narrow':
      return (
        <g>
          <ellipse cx={L} cy={y} rx="4.4" ry="2.4" fill="#fff" />
          <ellipse cx={R} cy={y} rx="4.4" ry="2.4" fill="#fff" />
          <circle cx={L} cy={y} r="2.2" fill={color} />
          <circle cx={R} cy={y} r="2.2" fill={color} />
        </g>
      );
    case 'wide':
      return (
        <g>
          <circle cx={L} cy={y} r="4.8" fill="#fff" />
          <circle cx={R} cy={y} r="4.8" fill="#fff" />
          <circle cx={L} cy={y} r="2.8" fill={color} />
          <circle cx={R} cy={y} r="2.8" fill={color} />
          <circle cx={L + 1.1} cy={y - 1.3} r="0.9" fill="#fff" />
          <circle cx={R + 1.1} cy={y - 1.3} r="0.9" fill="#fff" />
        </g>
      );
    case 'sleepy':
      return (
        <g>
          <path d={`M${L - 5} ${y} A5 5 0 0 0 ${L + 5} ${y} Z`} fill="#fff" />
          <path d={`M${R - 5} ${y} A5 5 0 0 0 ${R + 5} ${y} Z`} fill="#fff" />
          <circle cx={L} cy={y + 1.4} r="2.4" fill={color} />
          <circle cx={R} cy={y + 1.4} r="2.4" fill={color} />
        </g>
      );
    case 'sharp':
      return (
        <g>
          <path d={`M${L - 5.5} ${y + 1} Q${L} ${y - 4.5} ${L + 5.5} ${y + 1} Q${L} ${y + 3} ${L - 5.5} ${y + 1} Z`} fill="#fff" />
          <path d={`M${R - 5.5} ${y + 1} Q${R} ${y - 4.5} ${R + 5.5} ${y + 1} Q${R} ${y + 3} ${R - 5.5} ${y + 1} Z`} fill="#fff" />
          <circle cx={L} cy={y} r="2.4" fill={color} />
          <circle cx={R} cy={y} r="2.4" fill={color} />
        </g>
      );
    case 'closed':
      return (
        <g stroke={color} strokeWidth="2" fill="none" strokeLinecap="round">
          <path d={`M${L - 5} ${y} Q${L} ${y + 3.5} ${L + 5} ${y}`} />
          <path d={`M${R - 5} ${y} Q${R} ${y + 3.5} ${R + 5} ${y}`} />
        </g>
      );
    default: // round
      return (
        <g>
          <ellipse cx={L} cy={y} rx="4.1" ry="3.6" fill="#fff" />
          <ellipse cx={R} cy={y} rx="4.1" ry="3.6" fill="#fff" />
          <circle cx={L} cy={y} r="2.3" fill={color} />
          <circle cx={R} cy={y} r="2.3" fill={color} />
          <circle cx={L + 0.9} cy={y - 1.1} r="0.8" fill="#fff" />
          <circle cx={R + 0.9} cy={y - 1.1} r="0.8" fill="#fff" />
        </g>
      );
  }
}

export function Mouth({ style, color }: { style: string; color: string }) {
  switch (style) {
    case 'neutral':
      return <path d="M43 71 L57 71" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />;
    case 'frown':
      return <path d="M43 72 Q50 68 57 72" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />;
    case 'grin':
      return (
        <g>
          <path d="M42 69 Q50 77 58 69 Z" fill={color} />
          <path d="M42 69 L58 69" stroke="#fff" strokeWidth="1.6" />
        </g>
      );
    case 'smirk':
      return <path d="M43 71 Q50 74 57 68" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />;
    case 'open':
      return <ellipse cx="50" cy="71" rx="5" ry="4" fill={color} />;
    default: // smile
      return <path d="M43 69 Q50 74 57 69" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />;
  }
}

/** Beard mass covering the jaw and cheeks. Curve-based for the same reason as
 *  the hair caps. The `Mouth` layer is drawn after this, so a full beard can
 *  cover the whole lower face and the mouth still reads on top of it. */
const BEARD = 'M20 55 Q21 85 50 86 Q79 85 80 55 Q50 69 20 55 Z';

export function FacialHair({ style, color }: { style: string; color: string }) {
  if (!style) return null;
  switch (style) {
    case 'stubble':
      return <path d={BEARD} fill={color} opacity="0.25" />;
    case 'moustache':
      return <path d="M40 66 Q50 61 60 66 Q50 70 40 66 Z" fill={color} />;
    case 'beardLight':
      return (
        <g fill={color}>
          <path d="M40 66 Q50 61 60 66 Q50 70 40 66 Z" />
          <path d="M42 74 Q50 84 58 74 Q50 78 42 74 Z" />
        </g>
      );
    case 'beardMajestic':
      return <path d={BEARD} fill={color} />;
    case 'beardLong':
      return (
        <g fill={color}>
          <path d={BEARD} />
          <path d="M33 78 Q50 100 67 78 Q50 88 33 78 Z" />
        </g>
      );
    default:
      return null;
  }
}

export function Attire({ style, color, shadow }: { style: string; color: string; shadow: string }) {
  // Shared shoulder silhouette every outfit is built on.
  const shoulders = <path d="M8 100 Q50 68 92 100 Z" fill={color} />;
  switch (style) {
    case 'suitopen':
      return (
        <g>
          {shoulders}
          <path d="M38 78 L50 92 L44 100 L30 100 Z" fill="#f2efe9" />
          <path d="M62 78 L50 92 L56 100 L70 100 Z" fill="#f2efe9" />
          <path d="M38 78 L50 92 L46 78 Z" fill={shadow} />
          <path d="M62 78 L50 92 L54 78 Z" fill={shadow} />
        </g>
      );
    case 'shirt':
      return (
        <g>
          {shoulders}
          <path d="M40 76 L50 88 L60 76 L60 100 L40 100 Z" fill="#f2efe9" />
          <path d="M40 76 L50 88 L44 76 Z" fill={shadow} />
          <path d="M60 76 L50 88 L56 76 Z" fill={shadow} />
        </g>
      );
    case 'turtleneck':
      return (
        <g>
          {shoulders}
          <path d="M38 74 Q50 82 62 74 L62 84 Q50 92 38 84 Z" fill={shadow} />
        </g>
      );
    case 'polo':
      return (
        <g>
          {shoulders}
          <path d="M42 76 L50 86 L58 76 L58 100 L42 100 Z" fill={shadow} />
          <rect x="48.5" y="82" width="3" height="18" fill={color} />
        </g>
      );
    case 'tracksuit':
      return (
        <g>
          {shoulders}
          <rect x="48.5" y="76" width="3" height="24" fill={shadow} />
          <path d="M20 92 Q50 74 80 92 L80 96 Q50 78 20 96 Z" fill="#f2efe9" opacity="0.85" />
        </g>
      );
    default: // suit & tie
      return (
        <g>
          {shoulders}
          <path d="M40 76 L50 90 L60 76 L60 100 L40 100 Z" fill="#f2efe9" />
          <path d="M40 76 L50 90 L45 76 Z" fill={shadow} />
          <path d="M60 76 L50 90 L55 76 Z" fill={shadow} />
          <path d="M50 84 L54 88 L52 100 L48 100 L46 88 Z" fill="#2b3445" />
        </g>
      );
  }
}

export function Accessory({ style, color }: { style: string; color: string }) {
  const L = 38;
  const R = 62;
  const y = 57;
  switch (style) {
    case 'glasses':
      return (
        <g stroke={color} strokeWidth="1.8" fill="none">
          <circle cx={L} cy={y} r="7.5" />
          <circle cx={R} cy={y} r="7.5" />
          <path d={`M${L + 7.5} ${y} L${R - 7.5} ${y}`} />
          <path d={`M${L - 7.5} ${y} L23 54`} />
          <path d={`M${R + 7.5} ${y} L77 54`} />
        </g>
      );
    case 'glassesSquare':
      return (
        <g stroke={color} strokeWidth="1.8" fill="none">
          <rect x={L - 8} y={y - 6} width="16" height="12" rx="2" />
          <rect x={R - 8} y={y - 6} width="16" height="12" rx="2" />
          <path d={`M${L + 8} ${y} L${R - 8} ${y}`} />
          <path d={`M${L - 8} ${y - 2} L23 54`} />
          <path d={`M${R + 8} ${y - 2} L77 54`} />
        </g>
      );
    case 'sunglasses':
      return (
        <g>
          <rect x={L - 8.5} y={y - 6} width="17" height="12" rx="3" fill={color} />
          <rect x={R - 8.5} y={y - 6} width="17" height="12" rx="3" fill={color} />
          <path d={`M${L + 8.5} ${y - 2} L${R - 8.5} ${y - 2}`} stroke={color} strokeWidth="2.4" />
          <path d={`M${L - 8.5} ${y - 3} L23 54`} stroke={color} strokeWidth="1.8" fill="none" />
          <path d={`M${R + 8.5} ${y - 3} L77 54`} stroke={color} strokeWidth="1.8" fill="none" />
        </g>
      );
    case 'earring':
      return <circle cx="19" cy="63" r="2.6" fill={color} />;
    default:
      return null;
  }
}
