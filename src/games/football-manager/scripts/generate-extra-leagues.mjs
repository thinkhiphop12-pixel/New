/**
 * Adds four leagues to fc26-source.json that the original FC 26 export never
 * covered: Belgian Pro League, Brazilian Série A, MLS, and the Danish
 * Superliga. Club names are real top-flight clubs; player names/ratings are
 * procedurally generated (nationality-appropriate name pools, rating bands
 * tuned to each league's real-world relative strength) since no scraped
 * roster export exists for these leagues — this is clearly different from
 * the rest of fc26-source.json, which carries scraped real squads.
 *
 * Run once, then `node build-gamedata.mjs` to fold the result into gamedata.json.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, 'fc26-source.json');

let _seed = 0x1234abcd;
function rnd() {
  _seed |= 0;
  _seed = (_seed + 0x6d2b79f5) | 0;
  let t = Math.imul(_seed ^ (_seed >>> 15), 1 | _seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const rand = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
const pick = (arr) => arr[rand(0, arr.length - 1)];

const ROLE_POOL = {
  GK: ['GK'],
  DEF: ['CB', 'CB', 'RB', 'LB'],
  MID: ['CDM', 'CM', 'CM', 'CAM', 'RM', 'LM'],
  FWD: ['ST', 'ST', 'LW', 'RW'],
};
const SQUAD_SHAPE = [
  ['GK', 3], ['DEF', 8], ['MID', 8], ['FWD', 5],
];

function statsFor(pos, rating) {
  const jitter = () => rand(-10, 8);
  const base = { pac: rating, sho: rating, pas: rating, dri: rating, def: rating, phy: rating };
  if (pos === 'GK') return { pac: rand(30, 55), sho: 25, pas: rand(45, rating), dri: rand(45, rating), def: rand(45, rating), phy: rand(rating - 5, rating + 5) };
  if (pos === 'DEF') return { pac: rating + jitter(), sho: rand(25, rating - 10), pas: rating + jitter(), dri: rating + jitter(), def: rating + rand(0, 8), phy: rating + rand(-2, 10) };
  if (pos === 'MID') return { pac: rating + jitter(), sho: rating + jitter(), pas: rating + rand(0, 8), dri: rating + rand(-2, 6), def: rating + jitter(), phy: rating + jitter() };
  return { pac: rating + rand(-2, 10), sho: rating + rand(0, 8), pas: rating + jitter(), dri: rating + rand(-2, 8), def: rand(20, rating - 20), phy: rating + jitter() };
}
function clamp(n) { return Math.max(20, Math.min(94, n)); }

function marketValue(rating, age) {
  const base = 30_000 * Math.pow(1.13, rating - 50);
  const ageMult = age <= 23 ? 1.3 : age <= 28 ? 1.05 : age <= 31 ? 0.75 : 0.45;
  const v = base * ageMult;
  const step = v > 20e6 ? 1e6 : v > 2e6 ? 250e3 : 50e3;
  return Math.max(75_000, Math.round(v / step) * step);
}

function makePlayer(nat, pos, ratingRange, namePool, starName) {
  const role = pick(ROLE_POOL[pos]);
  const rating = clamp(rand(ratingRange[0], ratingRange[1]));
  const age = pos === 'GK' ? rand(20, 36) : rand(17, 35);
  const raw = statsFor(pos, rating);
  const stats = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, clamp(v)]));
  const name = starName ?? `${pick(namePool.initials)}. ${pick(namePool.surnames)}`;
  const value = marketValue(rating, age);
  return { name, nat, role, pos, rating, ...stats, age, value };
}

function makeClub(name, division, nat, ratingBand, namePool, stars = []) {
  const players = [];
  let starIdx = 0;
  for (const [pos, count] of SQUAD_SHAPE) {
    for (let i = 0; i < count; i++) {
      const useStar = pos !== 'GK' && starIdx < stars.length && rand(0, 2) === 0;
      const star = useStar ? stars[starIdx++] : null;
      const band = star ? [Math.max(ratingBand[1], star.rating - 3), 99] : ratingBand;
      players.push(makePlayer(star?.nat ?? nat, pos, band, namePool, star?.name));
    }
  }
  players.sort((a, b) => b.rating - a.rating);
  return { name, division, players };
}

// --- Name pools ------------------------------------------------------------
const BE = { initials: 'ABCDJKLMRTVWY'.split(''), surnames: ['De Bruyne', 'Vanhaezebrouck', 'Verschueren', 'Peeters', 'Janssens', 'Maes', 'Willems', 'Coosemans', 'Vermeulen', 'Ceulemans', 'Wouters', 'Van den Berg', 'Thys', 'Mertens', 'Van Damme', 'Lukaku', 'Bakayoko', 'Onana'] };
const BR = { initials: ['Cai', 'Gab', 'Lu', 'Ped', 'Mat', 'Jo', 'Fel', 'Vin', 'Bru', 'Ren'], surnames: ['Silva', 'Souza', 'Santos', 'Oliveira', 'Costa', 'Pereira', 'Almeida', 'Ferreira', 'Rodrigues', 'Carvalho', 'Gomes', 'Martins', 'Araujo', 'Barbosa', 'Nascimento', 'Ribeiro', 'Teixeira'] };
const US = { initials: 'ABCDJKMRTW'.split(''), surnames: ['Johnson', 'Smith', 'Rodriguez', 'Martinez', 'Anderson', 'Thompson', 'Garcia', 'Wilson', 'Robinson', 'Clark', 'Lewis', 'Walker', 'Young', 'Hall', 'Allen', 'Torres', 'Reyna', 'Pulisic', 'Adams'] };
const DK = { initials: 'ABCJKLMNOP'.split(''), surnames: ['Nielsen', 'Jensen', 'Hansen', 'Pedersen', 'Andersen', 'Christensen', 'Larsen', 'Sorensen', 'Rasmussen', 'Jorgensen', 'Petersen', 'Madsen', 'Kristensen', 'Olsen', 'Poulsen', 'Eriksen'] };

// --- Belgian Pro League (division 11) — real ratings roughly 74-84 top clubs
const belgiumClubs = [
  'Club Brugge', 'Union SG', 'Anderlecht', 'Genk', 'Gent', 'Standard Liège',
  'Antwerp', 'Cercle Brugge', 'Charleroi', 'Sint-Truiden', 'KV Kortrijk',
  'OH Leuven', 'Westerlo', 'Dender', 'Beerschot', 'RWDM',
].map((name, i) =>
  makeClub(name, 11, 'Belgium', i < 4 ? [70, 84] : i < 10 ? [65, 77] : [60, 72], BE)
);

// --- Brazilian Série A (division 12) — real ratings roughly 70-83 top clubs
const brazilClubs = [
  'Flamengo', 'Palmeiras', 'São Paulo', 'Corinthians', 'Botafogo', 'Fluminense',
  'Grêmio', 'Internacional', 'Atlético Mineiro', 'Cruzeiro', 'Bahia', 'Fortaleza',
  'Vasco da Gama', 'Santos', 'Bragantino', 'Vitória', 'Athletico Paranaense',
  'Criciúma', 'Cuiabá', 'Juventude',
].map((name, i) =>
  makeClub(name, 12, 'Brazil', i < 4 ? [70, 85] : i < 12 ? [66, 78] : [60, 73], BR)
);

// --- MLS (division 13) — real ratings roughly 68-80 top clubs
const mlsClubs = [
  'LAFC', 'LA Galaxy', 'Inter Miami CF', 'Atlanta United', 'Seattle Sounders',
  'Portland Timbers', 'New York City FC', 'New York Red Bulls', 'Columbus Crew',
  'FC Cincinnati', 'Philadelphia Union', 'Orlando City', 'Nashville SC',
  'Austin FC', 'Real Salt Lake', 'Colorado Rapids', 'Sporting KC',
  'Minnesota United', 'Chicago Fire', 'D.C. United', 'Toronto FC',
  'CF Montréal', 'Vancouver Whitecaps', 'San Jose Earthquakes',
].map((name, i) =>
  makeClub(name, 13, 'United States', i < 4 ? [68, 82] : i < 14 ? [64, 75] : [58, 70], US)
);
// Give Inter Miami its one real, already-known star (keeps the market-value
// engine sane instead of colliding two Messi entries between free agents
// and a club roster).
const miami = mlsClubs.find((c) => c.name === 'Inter Miami CF');
if (miami) {
  const messi = miami.players.find((p) => p.pos === 'FWD');
  if (messi) Object.assign(messi, { name: 'L. Messi', nat: 'Argentina', role: 'RW', rating: 86, age: 38 });
}

// --- Danish Superliga (division 14) — real ratings roughly 66-78 top clubs
const denmarkClubs = [
  'FC Copenhagen', 'FC Midtjylland', 'Brøndby', 'AGF Aarhus', 'Randers FC',
  'Silkeborg', 'Viborg', 'Vejle', 'OB Odense', 'Nordsjælland', 'Lyngby', 'Sønderjyske',
].map((name, i) =>
  makeClub(name, 14, 'Denmark', i < 3 ? [66, 79] : i < 8 ? [62, 73] : [58, 68], DK)
);

const extraClubs = [...belgiumClubs, ...brazilClubs, ...mlsClubs, ...denmarkClubs];

const raw = JSON.parse(readFileSync(SRC, 'utf8'));
raw.clubs.push(...extraClubs);
writeFileSync(SRC, JSON.stringify(raw));

const playerCount = extraClubs.reduce((sum, c) => sum + c.players.length, 0);
console.log(`Added ${extraClubs.length} clubs / ${playerCount} players across 4 leagues (divisions 11-14).`);
