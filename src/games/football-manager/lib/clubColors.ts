/** Club kit colours — the palette every crest, kit and club theme is drawn from.
 *
 *  Two rules govern what lives here:
 *
 *  1. Colours are facts about a kit, not artwork. A primary/secondary pair is
 *     safe to ship; a club's actual crest is not. Nothing in this file, or in
 *     <Crest />, reproduces anyone's badge — the crests are original geometry
 *     coloured from this table.
 *  2. Anything not listed falls back to `derivedKit()`, which picks a
 *     football-plausible pair deterministically from the club name. That keeps
 *     all ~490 clubs looking like clubs without hand-authoring every league.
 *
 *  Keys must match `name` in public/data/gamedata.json exactly.
 */

export interface ClubKit {
  /** Dominant shirt colour, #rrggbb. */
  primary: string;
  /** Trim/change colour — used for crest bands, sashes and rings. */
  secondary: string;
}

/* Named so the table below reads like a kit description rather than hex soup. */
const WHITE = '#ffffff';
const BLACK = '#111111';

const KITS: Record<string, [string, string]> = {
  /* --- Premier League --- */
  Liverpool: ['#c8102e', WHITE],
  'Manchester City': ['#6cabdd', WHITE],
  Arsenal: ['#ef0107', WHITE],
  'Newcastle United': ['#241f20', WHITE],
  'Tottenham Hotspur': [WHITE, '#132257'],
  'Aston Villa': ['#670e36', '#95bfe5'],
  Chelsea: ['#034694', WHITE],
  'Manchester United': ['#da291c', '#ffe500'],
  'Nottingham Forest': ['#dd0000', WHITE],
  'Crystal Palace': ['#1b458f', '#c4122e'],
  'Brighton & Hove Albion': ['#0057b8', WHITE],
  'AFC Bournemouth': ['#d71920', BLACK],
  Everton: ['#003399', WHITE],
  'Fulham FC': [WHITE, BLACK],
  'West Ham United': ['#7a263a', '#1bb1e7'],
  Sunderland: ['#eb172b', WHITE],
  Brentford: ['#e30613', WHITE],
  'Wolverhampton Wanderers': ['#fdb913', '#231f20'],
  'Leeds United': [WHITE, '#1d428a'],
  Burnley: ['#6c1d45', '#99d6ea'],

  /* --- Championship --- */
  'Ipswich Town': ['#0044a9', WHITE],
  'Leicester City': ['#003090', '#fdbe11'],
  'Birmingham City': ['#1a3a8f', WHITE],
  Southampton: ['#d71920', WHITE],
  'Sheffield United': ['#ee2737', WHITE],
  'Coventry City': ['#78d0f3', WHITE],
  'Norwich City': ['#fff200', '#00a650'],
  'Hull City': ['#f5a12d', BLACK],
  Middlesbrough: ['#e21c38', WHITE],
  Wrexham: ['#d0021b', WHITE],
  'Swansea City': [WHITE, BLACK],
  'Bristol City': ['#e21b23', WHITE],
  'West Bromwich Albion': ['#122f67', WHITE],
  'Queens Park Rangers': ['#1d5ba4', WHITE],
  'Derby County': [WHITE, BLACK],
  'Millwall FC': ['#001d5e', WHITE],
  'Stoke City': ['#e03a3e', WHITE],
  Watford: ['#fbee23', '#ed2127'],
  Portsmouth: ['#001489', WHITE],
  'Preston North End': [WHITE, '#00317f'],
  'Blackburn Rovers': ['#0e63ad', WHITE],
  'Oxford United': ['#003c71', '#fbe122'],
  'Sheffield Wednesday': ['#0066b3', WHITE],
  'Charlton Athletic': ['#d40000', WHITE],

  /* --- League One --- */
  'Luton Town': ['#f78f1e', WHITE],
  'Cardiff City': ['#0070b5', WHITE],
  'Blackpool FC': ['#f68712', WHITE],
  'Huddersfield Town': ['#0e63ad', WHITE],
  'Bolton Wanderers': [WHITE, '#001d5e'],
  'Plymouth Argyle': ['#007b5f', WHITE],
  'Wycombe Wanderers': ['#003865', '#a4d7f4'],
  'Reading FC': ['#004494', WHITE],
  'Rotherham United': ['#e30613', WHITE],
  'Leyton Orient': ['#cc0000', WHITE],
  'Stockport County': ['#003399', WHITE],
  Barnsley: ['#e4022d', WHITE],
  'Wigan Athletic': ['#1d67b5', WHITE],
  'Port Vale': [WHITE, BLACK],
  Stevenage: ['#cc0000', WHITE],
  'Lincoln City': ['#d5142c', WHITE],
  'Bradford City': ['#ffb400', '#6f0e19'],
  'Peterborough United': ['#0055a5', WHITE],
  'Mansfield Town': ['#f2b41f', '#003399'],
  'Exeter City': ['#d1112b', WHITE],
  'Burton Albion': ['#fdd800', BLACK],
  'Doncaster Rovers': ['#e2231a', WHITE],
  'Northampton Town': ['#7b1c2b', WHITE],
  'AFC Wimbledon': ['#003399', '#ffd600'],

  /* --- League Two --- */
  'Milton Keynes Dons': [WHITE, BLACK],
  'Salford City': ['#e4022d', WHITE],
  'Cambridge United': ['#f5b800', BLACK],
  'Bristol Rovers': ['#0033a0', WHITE],
  'Notts County': [BLACK, WHITE],
  Chesterfield: ['#003399', WHITE],
  'Fleetwood Town': ['#e4022d', WHITE],
  'Shrewsbury Town': ['#005baa', '#f8c300'],
  Gillingham: ['#003399', WHITE],
  'Colchester United': ['#0057b7', WHITE],
  Walsall: ['#e4022d', WHITE],
  Barrow: ['#0057b8', WHITE],
  'Cheltenham Town': ['#e4022d', BLACK],
  'Swindon Town': ['#e4022d', WHITE],
  'Tranmere Rovers': [WHITE, '#003399'],
  Barnet: ['#f5820b', BLACK],
  'Crawley Town': ['#e4022d', WHITE],
  'Grimsby Town': [BLACK, WHITE],
  'Crewe Alexandra': ['#e4022d', WHITE],
  Bromley: [WHITE, BLACK],
  'Harrogate Town': ['#fdd800', BLACK],
  'Oldham Athletic': ['#0057b8', WHITE],
  'Newport County': ['#f5820b', BLACK],
  'Accrington Stanley': ['#e4022d', WHITE],

  /* --- La Liga --- */
  'Real Madrid': [WHITE, '#febe10'],
  'FC Barcelona': ['#a50044', '#004d98'],
  'Atlético Madrid': ['#cb3524', '#262e62'],
  'Athletic Club': ['#ee2523', WHITE],
  'Villarreal CF': ['#ffe667', '#005187'],
  'Real Betis Balompié': ['#00954c', WHITE],
  'Real Sociedad': ['#0067b1', WHITE],
  'RC Celta': ['#8ac3ee', WHITE],
  'CA Osasuna': ['#d81920', '#0a346f'],
  'Rayo Vallecano': [WHITE, '#e53027'],
  'RCD Mallorca': ['#e20613', BLACK],
  'Girona FC': ['#d40f24', WHITE],
  'Valencia CF': [WHITE, '#f18e00'],
  'Getafe CF': ['#005999', WHITE],
  'Sevilla FC': [WHITE, '#d80028'],
  'RCD Espanyol': ['#007fc8', WHITE],
  'Deportivo Alavés': ['#0761af', WHITE],
  'Real Oviedo': ['#0055a4', WHITE],
  'Elche CF': [WHITE, '#007a33'],
  'Levante UD': ['#005ca9', '#a4142c'],

  /* --- Serie A --- */
  Inter: ['#0b1560', BLACK],
  Napoli: ['#12a0d7', WHITE],
  'AC Milan': ['#fb090b', BLACK],
  Juventus: [WHITE, BLACK],
  Roma: ['#8e1f2f', '#f0bc42'],
  Atalanta: ['#1c1c1c', '#1961ac'],
  Lazio: ['#87d8f7', WHITE],
  Fiorentina: ['#59328f', WHITE],
  Bologna: ['#a21c26', '#1a2f5a'],
  Como: ['#0b1560', WHITE],
  Torino: ['#8a1538', WHITE],
  Sassuolo: ['#00a752', BLACK],
  Cagliari: ['#a4123f', '#0b1560'],
  Genoa: ['#a21c26', '#0b1560'],
  'Hellas Verona FC': ['#f8c300', '#0b1560'],
  Parma: ['#ffe500', '#0b1560'],
  Udinese: [WHITE, BLACK],
  Cremonese: ['#b4142c', '#8b8b8b'],
  Lecce: ['#f6d200', '#d2001c'],
  Pisa: ['#0b1560', BLACK],

  /* --- Bundesliga --- */
  'FC Bayern München': ['#dc052d', '#0066b2'],
  'Borussia Dortmund': ['#fde100', BLACK],
  'Bayer 04 Leverkusen': ['#e32219', BLACK],
  'RB Leipzig': ['#dd0741', '#001f47'],
  'Eintracht Frankfurt': ['#e1000f', BLACK],
  'VfB Stuttgart': [WHITE, '#e32219'],
  'VfL Wolfsburg': ['#65b32e', WHITE],
  '1. FSV Mainz 05': ['#c3141e', WHITE],
  'SV Werder Bremen': ['#1d9053', WHITE],
  'SC Freiburg': ['#e2001a', BLACK],
  'Borussia Mönchengladbach': [WHITE, BLACK],
  'TSG 1899 Hoffenheim': ['#1c63b7', WHITE],
  'FC Augsburg': ['#c8102e', '#00714a'],
  '1. FC Union Berlin': ['#eb1923', '#ffe700'],
  '1. FC Köln': ['#ed1c24', WHITE],
  'Hamburger SV': ['#005ca9', WHITE],
  '1. FC Heidenheim 1846': ['#e2001a', '#0b3d91'],
  'FC St. Pauli': ['#614539', WHITE],

  /* --- Ligue 1 --- */
  'Paris Saint-Germain': ['#004170', '#da291c'],
  'Olympique de Marseille': [WHITE, '#2faee0'],
  'AS Monaco': ['#e63329', WHITE],
  'Olympique Lyonnais': [WHITE, '#d0021b'],
  'Lille OSC': ['#e01e13', '#0b1560'],
  'OGC Nice': ['#e4022d', BLACK],
  'Stade Rennais FC': ['#e03a3e', BLACK],
  'Paris FC': ['#0b1560', WHITE],
  'RC Strasbourg Alsace': ['#009fe3', WHITE],
  'Stade Brestois 29': ['#e4022d', WHITE],
  'RC Lens': ['#ffe500', '#e4022d'],
  'Toulouse FC': ['#6f2c91', WHITE],
  'FC Nantes': ['#fde100', '#007a33'],
  'AJ Auxerre': [WHITE, '#0b6cb7'],
  'Le Havre AC': ['#87cefa', '#0b1560'],
  'Angers SCO': [WHITE, BLACK],
  'FC Lorient': ['#f5820b', BLACK],
  'FC Metz': ['#7a263a', WHITE],

  /* --- Eredivisie --- */
  'PSV Eindhoven': ['#e30613', WHITE],
  Ajax: [WHITE, '#d2122e'],
  Feyenoord: ['#e30613', WHITE],
  'AZ Alkmaar': ['#e30613', WHITE],
  'FC Utrecht': ['#e30613', WHITE],
  'FC Twente': ['#e30613', WHITE],
  'NEC Nijmegen': ['#007a33', BLACK],
  'Go Ahead Eagles': ['#e30613', '#fde100'],
  'Sparta Rotterdam': [WHITE, '#e30613'],
  'Fortuna Sittard': ['#fde100', '#007a33'],
  'sc Heerenveen': ['#005eb8', '#e30613'],
  'PEC Zwolle': ['#005eb8', WHITE],
  'FC Groningen': ['#007a33', WHITE],
  'Heracles Almelo': [BLACK, WHITE],
  'NAC Breda': ['#fde100', BLACK],
  Excelsior: ['#e30613', BLACK],
  'FC Volendam': ['#f5820b', BLACK],
  'SC Telstar': [WHITE, '#005eb8'],

  /* --- Primeira Liga --- */
  'Sporting CP': ['#008057', WHITE],
  'SL Benfica': ['#e30613', WHITE],
  'FC Porto': ['#0b1560', WHITE],
  'SC Braga': ['#e30613', WHITE],
  'Estoril Praia': ['#005eb8', '#fde100'],
  'FC Famalicão': [WHITE, '#005eb8'],
  'CD Santa Clara': ['#e30613', WHITE],
  'Rio Ave FC': ['#007a33', WHITE],
  'Casa Pia AC': [BLACK, WHITE],
  'Vitória SC': [WHITE, BLACK],
  'Gil Vicente FC': ['#e30613', '#005eb8'],
  'Moreirense FC': ['#007a33', WHITE],
  'FC Arouca': ['#fde100', '#e30613'],
  'CD Nacional': [BLACK, WHITE],
  'AVS Futebol SAD': ['#005eb8', WHITE],
  'CD Tondela': ['#fde100', '#005eb8'],
  'CF Estrela da Amadora': ['#e30613', '#007a33'],
  'FC Alverca': ['#e30613', '#005eb8'],

  /* --- Scottish Premiership --- */
  Celtic: ['#018749', WHITE],
  Rangers: ['#1b458f', WHITE],
  Aberdeen: ['#e4022d', WHITE],
  Hibernian: ['#007a33', WHITE],
  Hearts: ['#7a263a', WHITE],
  Motherwell: ['#fdb913', '#7a263a'],
  'Dundee United': ['#f36c21', BLACK],
  Livingston: ['#fdd800', BLACK],
  Kilmarnock: ['#0b1560', '#e4022d'],
  'St. Mirren': [WHITE, BLACK],
  'Dundee FC': ['#0b1560', '#e4022d'],
  Falkirk: ['#0b1560', WHITE],
};

/** Kit pairs a club with no table entry can be given. Every pair is a
 *  combination football actually wears, so a derived club still reads as a
 *  club rather than as a random swatch. */
const FALLBACK_KITS: ReadonlyArray<readonly [string, string]> = [
  ['#c8102e', WHITE], // red / white
  ['#0b1560', WHITE], // navy / white
  ['#0057b8', WHITE], // royal / white
  ['#007a33', WHITE], // green / white
  ['#7a263a', '#9ec8e8'], // claret / sky
  [BLACK, WHITE], // black / white
  ['#fdb913', BLACK], // amber / black
  ['#6cabdd', '#0b1560'], // sky / navy
  ['#f5820b', BLACK], // orange / black
  ['#59328f', WHITE], // purple / white
  [WHITE, '#c8102e'], // white / red
  ['#00954c', BLACK], // emerald / black
  ['#8a1538', WHITE], // maroon / white
  ['#005ca9', '#fdd800'], // blue / yellow
  [WHITE, '#0b1560'], // white / navy
  ['#e30613', BLACK], // red / black
];

/** FNV-1a. Stable across runs and platforms, which matters because a club's
 *  derived kit and crest shape must not change between sessions. */
export function hashName(name: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Kit for a club with no table entry, chosen deterministically by name. */
function derivedKit(name: string): ClubKit {
  const [primary, secondary] = FALLBACK_KITS[hashName(name) % FALLBACK_KITS.length];
  return { primary, secondary };
}

/** The kit for a club. Curated where we have one, derived otherwise. */
export function clubKit(name: string | undefined): ClubKit {
  if (!name) return { primary: '#4b5563', secondary: WHITE };
  const entry = KITS[name];
  if (entry) return { primary: entry[0], secondary: entry[1] };
  return derivedKit(name);
}

/** True when the club has a hand-authored kit rather than a derived one. */
export function hasCuratedKit(name: string): boolean {
  return name in KITS;
}

/* ------------------------------------------------------------------ *
 * Kit clashes
 *
 * Two clubs in red is the same problem real football has, and it has the
 * same solution: the away side changes. `matchKits` picks that change kit,
 * so nothing downstream has to think about it.
 * ------------------------------------------------------------------ */

function rgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [128, 128, 128];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Perceived brightness, 0–1. */
export function kitLuminance(hex: string): number {
  const [r, g, b] = rgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/** Rough perceptual distance between two colours, 0 (identical) upward.
 *  Weighted toward red/green because that is where a shirt-vs-shirt or
 *  shirt-vs-grass confusion actually happens on a small screen. */
export function colorDistance(a: string, b: string): number {
  const [r1, g1, b1] = rgb(a);
  const [r2, g2, b2] = rgb(b);
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db);
}

/** Below this the two shirts read as "both red" at token size. */
const CLASH_THRESHOLD = 150;

/** The pitch. An away kit has to clear the grass as well as the home shirt,
 *  or a green change strip vanishes into the turf. */
const PITCH_GREEN = '#2f7a3e';

/** Neutral change strips, tried in order once a club's own two colours are
 *  both unusable. Between them these clear anything: a light side, a dark
 *  side, and a high-visibility side for the mid-tone kits. */
const CHANGE_KITS = ['#f4f4f4', '#1b1b1b', '#e8ff3a', '#2b2f8f', '#ff8a1f'];

/** Does this candidate away shirt read clearly against the home shirt (and
 *  against the grass)? */
function isDistinct(candidate: string, homeShirt: string): boolean {
  return (
    colorDistance(candidate, homeShirt) >= CLASH_THRESHOLD &&
    colorDistance(candidate, PITCH_GREEN) >= CLASH_THRESHOLD
  );
}

export interface MatchKits {
  /** Home shirt — always the club's first-choice colour. */
  home: string;
  /** Away shirt — first choice unless it clashes, then a change strip. */
  away: string;
  /** True when the away side had to change, so the UI can say so. */
  awayChanged: boolean;
}

/**
 * Resolve the two shirt colours for a fixture.
 *
 * Home keeps its first choice, as in the real game. Away tries, in order:
 * its own first choice, its own second colour, then the neutral change
 * strips — taking the first that is clearly distinguishable. If somehow
 * nothing qualifies (it cannot, given the change list, but the fallback
 * keeps this total) it takes whichever candidate is furthest away.
 */
export function matchKits(homeName: string | undefined, awayName: string | undefined): MatchKits {
  const homeKit = clubKit(homeName);
  const awayKit = clubKit(awayName);
  const home = homeKit.primary;

  const candidates = [awayKit.primary, awayKit.secondary, ...CHANGE_KITS];
  const pick = candidates.find((c) => isDistinct(c, home));
  if (pick) return { home, away: pick, awayChanged: pick !== awayKit.primary };

  let best = candidates[0];
  let bestDist = -1;
  for (const c of candidates) {
    const d = colorDistance(c, home);
    if (d > bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return { home, away: best, awayChanged: best !== awayKit.primary };
}
