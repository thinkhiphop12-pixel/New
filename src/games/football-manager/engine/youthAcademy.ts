import type { AcademyTrialist, Coach, GameState, Player, Position } from './types';
import { MAX_SQUAD_SIZE } from './gameRules';
import { pushInbox } from './inbox';
import {
  contractEndFor, clamp, marketValue, pickRandom, rollRetireAge, weeklyWage,
} from './utils';

const YOUTH_FIRST = ['James', 'David', 'Michael', 'Robert', 'William', 'Richard', 'Thomas', 'Charles', 'Daniel', 'Matthew', 'Jose', 'Luis', 'Juan', 'Carlos', 'Francisco', 'Antonio', 'Manuel', 'Pedro', 'Miguel', 'Angel'];
const YOUTH_LAST = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];

/**
 * The academy intake.
 *
 * Every pre-season the academy puts six or seven kids in front of the
 * manager and he decides which of them the club signs. Nothing is signed for
 * him: the old intake dropped one or two finished players into the youth
 * squad with their exact potential printed next to their name, which is a
 * notification, not a decision.
 *
 * What the manager gets instead is a *read*: a predicted potential band and
 * the assistant manager's verdict. Both are deliberately imperfect. The band
 * narrows and the assistant gets more reliable as the academy's reputation
 * and the assistant's own quality rise, so investing in either buys better
 * information rather than better dice.
 *
 * Everything here works on the game's own 1-99 rating scale — the same scale
 * `makeYouthPlayer` and every other player in the save uses.
 */

/** How many kids come through in a given year. */
const INTAKE_MIN = 6;
const INTAKE_MAX = 7;

/** Positions an intake is built from, sampled without replacement so a class
 *  always has a keeper and never seven strikers. */
const INTAKE_SPREAD: Position[] = ['GK', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'FWD', 'FWD'];

function roleFor(pos: Position): string {
  return pos === 'GK' ? 'GK' : pos === 'DEF' ? 'DF' : pos === 'MID' ? 'MF' : 'FW';
}

/** Star band from a predicted potential, 1-5. Only ever shown for the
 *  *prediction*, never for the real number. */
export function starsForPotential(potential: number): number {
  if (potential >= 84) return 5;
  if (potential >= 76) return 4;
  if (potential >= 68) return 3;
  if (potential >= 60) return 2;
  return 1;
}

function assistantQuality(state: GameState): number {
  const assistant: Coach | undefined = state.facilities?.coaches.find((c) => c.role === 'assistant');
  // No assistant at all still gets you an opinion — the youth coach's — it
  // is just a much worse one.
  return assistant?.quality ?? 25;
}

/**
 * Build one prospect. Current ability is deliberately low (these are kids),
 * potential is what the decision is actually about, and both scale with the
 * academy the club has paid for.
 */
function makeTrialist(state: GameState, id: number, pos: Position, wageScale: number): Player {
  const rep = state.facilities?.academyReputation ?? 20;
  const level = state.academyLevel ?? 1;

  // Ceiling: the club's reputation opens the door to better kids, but the
  // spread is wide — the point of the screen is that you can't be sure.
  const potential = clamp(
    Math.round(52 + rep * 0.22 + level * 3 + (Math.random() + Math.random() - 1) * 20),
    48, 92,
  );
  // Where he is today: a long way short of it, further short the higher the
  // ceiling, so a five-star kid is not also immediately useful.
  const rating = clamp(Math.round(potential - (8 + Math.random() * 14)), 38, 68);
  const age = 16 + Math.floor(Math.random() * 3);
  const stat = () => clamp(rating - 8 + Math.floor(Math.random() * 17), 25, 85);
  const value = marketValue(rating, age);

  return {
    id,
    name: `${pickRandom(YOUTH_FIRST)} ${pickRandom(YOUTH_LAST)}`,
    nat: 'Academy',
    pos,
    role: roleFor(pos),
    rating,
    potential,
    pac: stat(), sho: stat(), pas: stat(), dri: stat(), def: stat(), phy: stat(),
    gkReflexes: pos === 'GK' ? stat() : 5 + Math.floor(Math.random() * 15),
    gkPositioning: pos === 'GK' ? stat() : 5 + Math.floor(Math.random() * 15),
    height: pos === 'GK' ? 185 + Math.floor(Math.random() * 15) : 168 + Math.floor(Math.random() * 24),
    altPos: [],
    age,
    value,
    wage: Math.round(weeklyWage(value, rating) * wageScale),
    // Unattached until the manager signs him — a trialist is not on the books.
    clubId: 0,
    // ...but not a free agent either: `onTrial` keeps rival clubs from signing
    // him out from under the manager before he has made his call.
    onTrial: true,
    form: 1,
    injuryWeeks: 0,
    injuryDays: 0,
    injuryType: null,
    contractYears: 0,
    contractEnd: contractEndFor(state.seasonYear, 0),
    releaseClause: 0,
    loyal: true,
    transferListed: false,
    wantsMove: false,
    promisedStatus: null,
    retireAge: rollRetireAge(pos === 'GK'),
    morale: 70 + Math.floor(Math.random() * 20),
    fitness: 90 + Math.floor(Math.random() * 11),
    sharpness: 50 + Math.floor(Math.random() * 20),
    chem: 60 + Math.floor(Math.random() * 20),
    apps: 0, goals: 0, assists: 0, cleanSheets: 0, saves: 0,
    lgApps: 0, lgGoals: 0,
    career: [],
  } as Player;
}

/**
 * The scouting report on a prospect: a band around his true potential, a
 * star rating from the middle of that band, and the assistant's call.
 *
 * The band's half-width runs from ±11 (no academy to speak of, no assistant)
 * down to ±3 (a well-funded academy and a top assistant), and the band is
 * *offset* as well as widened — a bad read can be wrong in either direction,
 * which is what makes a two-star kid occasionally worth a punt.
 */
function scoutTrialist(state: GameState, p: Player): AcademyTrialist {
  const rep = state.facilities?.academyReputation ?? 20;
  const q = assistantQuality(state);
  const accuracy = clamp((rep / 100) * 0.45 + (q / 100) * 0.55, 0, 1);
  const halfWidth = Math.round(11 - accuracy * 8);
  // How far the read is off-centre — never further than the band is wide, so
  // the true value always sits somewhere inside the bracket the manager sees.
  const bias = Math.round((Math.random() * 2 - 1) * halfWidth * (1 - accuracy));
  const centre = clamp(p.potential + bias, 45, 95);
  const potentialLow = clamp(centre - halfWidth, 40, 99);
  const potentialHigh = clamp(centre + halfWidth, 42, 99);
  const stars = starsForPotential(centre);

  // The verdict is the assistant's, so it reads off the same imperfect
  // centre he quoted, not the real number.
  const headroom = centre - p.rating;
  const verdict: AcademyTrialist['verdict'] =
    centre >= 76 || (centre >= 70 && headroom >= 18) ? 'sign'
      : centre >= 64 ? 'maybe'
        : 'pass';

  const note =
    verdict === 'sign'
      ? pickRandom([
        `Best of this year's group. I'd take him now.`,
        `Real ceiling on this one — sign him before someone else does.`,
        `He's the one I'd fight you over. Take him.`,
      ])
      : verdict === 'maybe'
        ? pickRandom([
          `Decent lad. Worth a place if you've got room.`,
          `Might make a squad player. No more than that.`,
          `I'd keep him around and look again in a year.`,
        ])
        : pickRandom([
          `Honestly? He's not going to make it here.`,
          `Nothing there for me. Let him find a level.`,
          `I'd pass. We can do better than this.`,
        ]);

  return { playerId: p.id, pos: p.pos, stars, potentialLow, potentialHigh, verdict, note };
}

/**
 * Roll a fresh intake onto `state.academyIntake`, replacing anything that
 * was still sitting there. Called once per season from the rollover in
 * `endSeason`, and once for a brand-new career so the very first pre-season
 * has a class to look at.
 *
 * Mutates and returns a clone, matching the rest of the engine's convention.
 */
export function generateYouthIntake(state: GameState, wageScale = 1): GameState {
  const s: GameState = structuredClone(state);
  const userClub = s.clubs.find((c) => c.id === s.userClubId);
  if (!userClub) return state;

  // Anyone left unsigned from last year's class goes with them. Guard on the
  // trial flag rather than deleting the id outright: a player who has picked up
  // a club since the class was rolled is somebody's squad member now, and
  // dropping his record would leave a dangling id behind in that squad.
  for (const old of s.academyIntake ?? []) {
    const p = s.players[old.playerId];
    if (p?.onTrial) delete s.players[old.playerId];
  }

  const count = INTAKE_MIN + Math.floor(Math.random() * (INTAKE_MAX - INTAKE_MIN + 1));
  const pool = [...INTAKE_SPREAD];
  const intake: AcademyTrialist[] = [];
  for (let i = 0; i < count; i++) {
    // Guarantee the keeper, then draw the rest without replacement.
    const idx = i === 0 ? pool.indexOf('GK') : Math.floor(Math.random() * pool.length);
    const pos = pool.splice(idx >= 0 ? idx : 0, 1)[0] ?? 'MID';
    const player = makeTrialist(s, s.nextPlayerId++, pos, wageScale);
    s.players[player.id] = player;
    intake.push(scoutTrialist(s, player));
  }

  s.academyIntake = intake;
  s.academyIntakeYear = s.seasonYear;

  const recommended = intake.filter((t) => t.verdict === 'sign').length;
  s.news.unshift(`Academy intake: ${count} youngsters are on trial and need a decision.`);
  pushInbox(s, {
    category: 'youth',
    title: `${count} prospects arrive for pre-season trials`,
    body:
      `This year's academy class has reported for pre-season. There are ${count} of them, and none of them are ` +
      `signed yet — that's your call.\n\n` +
      (recommended > 0
        ? `Your assistant would take ${recommended} of them. `
        : `Your assistant isn't sold on any of them. `) +
      `Head to Training → Academy to look through the group. Anyone you pass on leaves the club.`,
  });
  return s;
}

/** The prospects still awaiting a decision, with their player records. */
export function getIntake(state: GameState): { trialist: AcademyTrialist; player: Player }[] {
  return (state.academyIntake ?? [])
    .map((t) => ({ trialist: t, player: state.players[t.playerId] }))
    .filter((e): e is { trialist: AcademyTrialist; player: Player } => Boolean(e.player));
}

/** Sign a trialist onto the youth squad. He now has a contract and a club. */
export function signTrialist(state: GameState, playerId: number): GameState {
  const entry = (state.academyIntake ?? []).find((t) => t.playerId === playerId);
  if (!entry) return state;
  const s: GameState = structuredClone(state);
  const club = s.clubs.find((c) => c.id === s.userClubId);
  const player = s.players[playerId];
  if (!club || !player) return state;

  club.youthPlayerIds = [...(club.youthPlayerIds ?? []), playerId];
  player.clubId = s.userClubId;
  // The trial is over — he is a contracted youth player from here on.
  delete player.onTrial;
  player.contractYears = 3;
  player.contractEnd = contractEndFor(s.seasonYear, 3);
  s.academyIntake = (s.academyIntake ?? []).filter((t) => t.playerId !== playerId);
  s.news.unshift(`${player.name} signs academy terms.`);
  return s;
}

/** Pass on a trialist. He leaves, and his record goes with him. */
export function releaseTrialist(state: GameState, playerId: number): GameState {
  if (!(state.academyIntake ?? []).some((t) => t.playerId === playerId)) return state;
  const s: GameState = structuredClone(state);
  const player = s.players[playerId];
  if (player) s.news.unshift(`${player.name} is released after his trial.`);
  s.academyIntake = (s.academyIntake ?? []).filter((t) => t.playerId !== playerId);
  delete s.players[playerId];
  return s;
}

/** Youth-team players for a club, most recent intake first. */
export function getYouthSquad(state: GameState, clubId: number) {
  const club = state.clubs.find((c) => c.id === clubId);
  if (!club?.youthPlayerIds) return [];
  return club.youthPlayerIds
    .map((id) => state.players[id])
    .filter((p): p is NonNullable<typeof p> => Boolean(p));
}

/**
 * Move a youth player onto the first-team roster. Fails silently (returns
 * the state unchanged) if the player isn't in the club's youth squad or the
 * first team is already at `MAX_SQUAD_SIZE`.
 */
export function promoteYouthPlayer(state: GameState, playerId: number): GameState {
  const club = state.clubs.find((c) => c.playerIds && c.youthPlayerIds?.includes(playerId));
  if (!club) return state;
  if (club.playerIds.length >= MAX_SQUAD_SIZE) return state;

  const s: GameState = structuredClone(state);
  const sClub = s.clubs.find((c) => c.id === club.id)!;
  sClub.youthPlayerIds = (sClub.youthPlayerIds ?? []).filter((id) => id !== playerId);
  sClub.playerIds.push(playerId);

  const player = s.players[playerId];
  if (player) {
    // Bug prevention (spec module "Youth Academy Flag"): a kid's contract was
    // struck the day he joined the academy, seasons before this promotion —
    // left alone it can already be down to its final year (or, on a slow
    // academy career, technically expired) the moment he steps up, which
    // would either vanish him as a free agent at the next rollover or make
    // him invisible to the renewal-window check that assumes a first-team
    // deal. Promotion always writes a fresh, fully active contract so he is
    // immediately renewable like any other first-teamer.
    player.contractYears = 3;
    player.contractEnd = contractEndFor(s.seasonYear, 3);
    player.contractWarned = false;
    s.news.unshift(`${player.name} is promoted from the youth academy to the first team.`);
  }
  return s;
}
