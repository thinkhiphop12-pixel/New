import type { Player, Pool, Position, Squad } from './types';

/** Size of the curated "Classic Legends" pool. */
const LEGENDS_COUNT = 34;

/**
 * Narrows the full squad list to the chosen pool:
 *  - legends: the 34 strongest, most iconic squads
 *  - history: every squad in the dataset
 *  - england: every England squad, tournament by tournament
 */
export function squadsForPool(squads: Squad[], pool: Pool): Squad[] {
  if (pool === 'england') {
    return squads
      .filter((s) => s.countryName === 'England')
      .sort((a, b) => a.tournamentYear - b.tournamentYear);
  }
  if (pool === 'legends') {
    return [...squads].sort((a, b) => b.strength - a.strength).slice(0, LEGENDS_COUNT);
  }
  return squads;
}

interface RawPlayer {
  n: string;
  country: string;
  year: number;
  o: number;
  p?: string[];
}

interface RawBundle {
  players: RawPlayer[];
}

/**
 * Raw country values in the dataset mix full names with historic/ISO codes
 * (e.g. both "USA" and "United States", or defunct states like "YUG").
 * This maps every distinct raw value to a display name + flag emoji.
 */
const COUNTRY_INFO: Record<string, { name: string; flag: string }> = {
  Algeria: { name: 'Algeria', flag: '🇩🇿' },
  Angola: { name: 'Angola', flag: '🇦🇴' },
  Argentina: { name: 'Argentina', flag: '🇦🇷' },
  Australia: { name: 'Australia', flag: '🇦🇺' },
  Austria: { name: 'Austria', flag: '🇦🇹' },
  BOL: { name: 'Bolivia', flag: '🇧🇴' },
  Belgium: { name: 'Belgium', flag: '🇧🇪' },
  'Bosnia and Herzegovina': { name: 'Bosnia and Herzegovina', flag: '🇧🇦' },
  Brazil: { name: 'Brazil', flag: '🇧🇷' },
  CUB: { name: 'Cuba', flag: '🇨🇺' },
  Cameroon: { name: 'Cameroon', flag: '🇨🇲' },
  Canada: { name: 'Canada', flag: '🇨🇦' },
  'Cape Verde': { name: 'Cape Verde', flag: '🇨🇻' },
  Chile: { name: 'Chile', flag: '🇨🇱' },
  'China PR': { name: 'China', flag: '🇨🇳' },
  Colombia: { name: 'Colombia', flag: '🇨🇴' },
  'Costa Rica': { name: 'Costa Rica', flag: '🇨🇷' },
  Croatia: { name: 'Croatia', flag: '🇭🇷' },
  Curacao: { name: 'Curaçao', flag: '🇨🇼' },
  'Czech Republic': { name: 'Czech Republic', flag: '🇨🇿' },
  "Côte d'Ivoire": { name: "Côte d'Ivoire", flag: '🇨🇮' },
  'DR Congo': { name: 'DR Congo', flag: '🇨🇩' },
  Denmark: { name: 'Denmark', flag: '🇩🇰' },
  Ecuador: { name: 'Ecuador', flag: '🇪🇨' },
  Egypt: { name: 'Egypt', flag: '🇪🇬' },
  England: { name: 'England', flag: '🏴' },
  FRG: { name: 'West Germany', flag: '🇩🇪' },
  France: { name: 'France', flag: '🇫🇷' },
  Germany: { name: 'Germany', flag: '🇩🇪' },
  Ghana: { name: 'Ghana', flag: '🇬🇭' },
  Greece: { name: 'Greece', flag: '🇬🇷' },
  Haiti: { name: 'Haiti', flag: '🇭🇹' },
  Honduras: { name: 'Honduras', flag: '🇭🇳' },
  Hungary: { name: 'Hungary', flag: '🇭🇺' },
  INH: { name: 'Dutch East Indies', flag: '🏳️' },
  Iceland: { name: 'Iceland', flag: '🇮🇸' },
  Iran: { name: 'Iran', flag: '🇮🇷' },
  Iraq: { name: 'Iraq', flag: '🇮🇶' },
  Italy: { name: 'Italy', flag: '🇮🇹' },
  Japan: { name: 'Japan', flag: '🇯🇵' },
  Jordan: { name: 'Jordan', flag: '🇯🇴' },
  Mexico: { name: 'Mexico', flag: '🇲🇽' },
  Morocco: { name: 'Morocco', flag: '🇲🇦' },
  NIR: { name: 'Northern Ireland', flag: '🇬🇧' },
  Netherlands: { name: 'Netherlands', flag: '🇳🇱' },
  'New Zealand': { name: 'New Zealand', flag: '🇳🇿' },
  Nigeria: { name: 'Nigeria', flag: '🇳🇬' },
  'North Korea': { name: 'North Korea', flag: '🇰🇵' },
  Norway: { name: 'Norway', flag: '🇳🇴' },
  Panama: { name: 'Panama', flag: '🇵🇦' },
  Paraguay: { name: 'Paraguay', flag: '🇵🇾' },
  Peru: { name: 'Peru', flag: '🇵🇪' },
  Poland: { name: 'Poland', flag: '🇵🇱' },
  Portugal: { name: 'Portugal', flag: '🇵🇹' },
  Qatar: { name: 'Qatar', flag: '🇶🇦' },
  ROU: { name: 'Romania', flag: '🇷🇴' },
  'Republic of Ireland': { name: 'Republic of Ireland', flag: '🇮🇪' },
  Russia: { name: 'Russia', flag: '🇷🇺' },
  'Saudi Arabia': { name: 'Saudi Arabia', flag: '🇸🇦' },
  Scotland: { name: 'Scotland', flag: '🏴' },
  Senegal: { name: 'Senegal', flag: '🇸🇳' },
  Serbia: { name: 'Serbia', flag: '🇷🇸' },
  'Serbia and Montenegro': { name: 'Serbia and Montenegro', flag: '🇷🇸' },
  Slovakia: { name: 'Slovakia', flag: '🇸🇰' },
  Slovenia: { name: 'Slovenia', flag: '🇸🇮' },
  'South Africa': { name: 'South Africa', flag: '🇿🇦' },
  'South Korea': { name: 'South Korea', flag: '🇰🇷' },
  'Soviet Union': { name: 'Soviet Union', flag: '🏳️' },
  Spain: { name: 'Spain', flag: '🇪🇸' },
  Sweden: { name: 'Sweden', flag: '🇸🇪' },
  Switzerland: { name: 'Switzerland', flag: '🇨🇭' },
  TCH: { name: 'Czechoslovakia', flag: '🏳️' },
  Togo: { name: 'Togo', flag: '🇹🇬' },
  'Trinidad and Tobago': { name: 'Trinidad and Tobago', flag: '🇹🇹' },
  Tunisia: { name: 'Tunisia', flag: '🇹🇳' },
  Turkey: { name: 'Turkey', flag: '🇹🇷' },
  URU: { name: 'Uruguay', flag: '🇺🇾' },
  USA: { name: 'United States', flag: '🇺🇸' },
  Ukraine: { name: 'Ukraine', flag: '🇺🇦' },
  'United States': { name: 'United States', flag: '🇺🇸' },
  Uruguay: { name: 'Uruguay', flag: '🇺🇾' },
  Uzbekistan: { name: 'Uzbekistan', flag: '🇺🇿' },
  Wales: { name: 'Wales', flag: '🏴' },
  YUG: { name: 'Yugoslavia', flag: '🏳️' },
};

function infoFor(country: string): { name: string; flag: string } {
  return COUNTRY_INFO[country] ?? { name: country, flag: '🏳️' };
}

function toPosition(raw?: string[]): Position {
  const tag = raw?.[0];
  if (tag === 'GK') return 'GK';
  if (tag === 'DF') return 'DEF';
  if (tag === 'MF') return 'MID';
  return 'FWD';
}

function tierFromPct(pct: number): Squad['tier'] {
  if (pct >= 0.75) return 'legendary';
  if (pct >= 0.5) return 'strong';
  if (pct >= 0.25) return 'medium';
  return 'weak';
}

let cache: Squad[] | null = null;

/** Loads the shared World Cup player dataset and groups it into squads. */
export async function loadSquads(): Promise<Squad[]> {
  if (cache) return cache;

  const res = await fetch('/data/players.json');
  if (!res.ok) throw new Error(`Failed to load player data: ${res.status}`);
  const raw: RawBundle = await res.json();

  const bySquad = new Map<string, { country: string; year: number; players: RawPlayer[] }>();
  for (const p of raw.players) {
    const id = `${p.country}|${p.year}`;
    const entry = bySquad.get(id) ?? { country: p.country, year: p.year, players: [] };
    entry.players.push(p);
    bySquad.set(id, entry);
  }

  const strengths = [...bySquad.values()].map(
    ({ players }) => players.reduce((sum, p) => sum + p.o, 0) / players.length
  );
  const minS = Math.min(...strengths);
  const maxS = Math.max(...strengths);
  const range = maxS - minS || 1;

  const squads: Squad[] = [];
  for (const [id, { country, year, players: rawPlayers }] of bySquad) {
    const avg = rawPlayers.reduce((sum, p) => sum + p.o, 0) / rawPlayers.length;
    const strengthPct = (avg - minS) / range;
    const { name: countryName, flag } = infoFor(country);

    const players: Player[] = rawPlayers
      .slice()
      .sort((a, b) => b.o - a.o)
      .map((p) => ({
        id: `${id}__${p.n}`,
        name: p.n,
        position: toPosition(p.p),
        rating: p.o,
        squadId: id,
      }));

    squads.push({
      id,
      countryName,
      tournamentYear: year,
      flag,
      strength: Math.round(avg),
      strengthPct,
      tier: tierFromPct(strengthPct),
      players,
    });
  }

  cache = squads;
  return squads;
}
