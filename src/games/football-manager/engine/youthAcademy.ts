import type { GameState, Player, Position } from './types';
import { MAX_SQUAD_SIZE } from './gameRules';
import {
  contractEndFor, marketValue, pickRandom, rollRetireAge, weeklyWage, clamp,
} from './utils';

const YOUTH_FIRST = ['James', 'David', 'Michael', 'Robert', 'William', 'Richard', 'Thomas', 'Charles', 'Daniel', 'Matthew', 'Jose', 'Luis', 'Juan', 'Carlos', 'Francisco', 'Antonio', 'Manuel', 'Pedro', 'Miguel', 'Angel'];
const YOUTH_LAST = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];

export interface TrialistPlayer extends Player {
  starRating: number; // 1-5 stars based on PA
  trialistId: string; // Temporary ID for trialist pool
}

/**
 * YOUTH INTAKE SYSTEM (Seasonal, September 25)
 *
 * Generates 8 trialist players using:
 * - Youth_Facilities (trainingLevel 1-5) for Current Ability (CA)
 * - Youth_Coaching (staff.coach 0-3 scaled to 1-5) for Potential Ability (PA)
 * - Fixed position distribution: 1 GK, 3 DEF, 3 MID, 1 FW
 *
 * Formulas:
 * - PA = Random(1, 100) + (Youth_Coaching × 20)
 * - CA = Random(1, 50) + (Youth_Facilities × 15)
 * - Stars: 1-50=1⭐, 51-90=2⭐, 91-130=3⭐, 131-170=4⭐, 171-200=5⭐
 */
export function generateYouthIntake(state: GameState): GameState {
  const s = structuredClone(state);
  const userClub = s.clubs.find((c) => c.id === s.userClubId);
  if (!userClub) return state;

  const fs = s.facilities ?? { trainingLevel: 1, academyReputation: 20 };
  const staff = s.staff ?? { coach: 1, physio: 0, scout: 0 };

  // Scale coaching (0-3) to 1-5 for consistency
  const youthCoachingMultiplier = staff.coach === 0 ? 1 : Math.min(5, staff.coach + 1);
  const youthFacilitiesMultiplier = fs.trainingLevel;

  const trialists: TrialistPlayer[] = [];
  const positions: Position[] = ['GK', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'FWD'];

  // Generate 8 trialists with fixed positions
  for (let i = 0; i < 8; i++) {
    const id = s.nextPlayerId++;
    const pos = positions[i];
    const trialistId = `trialist_${id}_${Date.now()}`;

    // PA Equation: Random(1,100) + (Youth_Coaching × 20), capped at 200
    const pa = Math.min(200, Math.floor(Math.random() * 100) + 1 + (youthCoachingMultiplier * 20));

    // CA Equation: Random(1,50) + (Youth_Facilities × 15), capped at 150
    const ca = Math.min(150, Math.floor(Math.random() * 50) + 1 + (youthFacilitiesMultiplier * 15));

    // Star rating based on PA
    const starRating = getStarRating(pa);

    // Derive stats from CA (similar to current system)
    const stat = () => clamp(ca - 6 + Math.floor(Math.random() * 14), 30, 90);

    const player: TrialistPlayer = {
      id,
      trialistId,
      name: `${pickRandom(YOUTH_FIRST)} ${pickRandom(YOUTH_LAST)}`,
      nat: 'Academy',
      pos,
      role: pos === 'GK' ? 'GK' : pos === 'DEF' ? 'DF' : pos === 'MID' ? 'MF' : 'FW',
      rating: ca,
      potential: pa,
      starRating,
      pac: stat(),
      sho: stat(),
      pas: stat(),
      dri: stat(),
      def: stat(),
      phy: stat(),
      gkReflexes: pos === 'GK' ? stat() : 5 + Math.floor(Math.random() * 15),
      gkPositioning: pos === 'GK' ? stat() : 5 + Math.floor(Math.random() * 15),
      height: pos === 'GK' ? 185 + Math.floor(Math.random() * 15) : 168 + Math.floor(Math.random() * 24),
      altPos: [],
      age: 16 + Math.floor(Math.random() * 3),
      value: marketValue(ca, 16),
      wage: weeklyWage(marketValue(ca, 16), ca),
      clubId: 0, // Trialists start unattached
      form: 1,
      injuryWeeks: 0,
      contractYears: 0,
      contractEnd: 0,
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
      apps: 0,
      goals: 0,
      assists: 0,
      cleanSheets: 0,
      saves: 0,
      lgApps: 0,
      lgGoals: 0,
      career: [],
    };

    trialists.push(player);
    s.players[id] = player;
  }

  // Store trialists in temporary state (inbox system will handle them)
  s.trialistPool = trialists.map((t) => ({
    playerId: t.id,
    trialistId: t.trialistId,
    starRating: t.starRating,
    pos: t.pos,
    ca: t.rating,
    pa: t.potential,
  }));

  return s;
}

/** Convert PA to star rating (1-5 stars) */
export function getStarRating(potential: number): number {
  if (potential <= 50) return 1;
  if (potential <= 90) return 2;
  if (potential <= 130) return 3;
  if (potential <= 170) return 4;
  return 5;
}

/** Accept a trialist into the youth squad */
export function acceptTrialist(state: GameState, playerId: number): GameState {
  const s = structuredClone(state);
  const userClub = s.clubs.find((c) => c.id === s.userClubId);
  if (!userClub) return state;

  const player = s.players[playerId];
  if (!player) return state;

  // Move player to club's youth squad
  if (!userClub.youthPlayerIds) userClub.youthPlayerIds = [];
  userClub.youthPlayerIds.push(playerId);
  player.clubId = s.userClubId;

  // Remove from trialist pool
  s.trialistPool = (s.trialistPool ?? []).filter((t) => t.playerId !== playerId);

  return s;
}

/** Reject a trialist (remove from pool) */
export function rejectTrialist(state: GameState, playerId: number): GameState {
  const s = structuredClone(state);
  s.trialistPool = (s.trialistPool ?? []).filter((t) => t.playerId !== playerId);
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
    s.news.unshift(`${player.name} is promoted from the youth academy to the first team.`);
  }
  return s;
}
