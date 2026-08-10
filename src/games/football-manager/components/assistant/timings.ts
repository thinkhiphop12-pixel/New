/**
 * "How long does everything take?", answered in one place.
 *
 * The single most repeated piece of feedback about this game is that it
 * never confirms anything and never says how long a thing will take — you
 * hire a scout and nothing visibly happens, so you cannot tell a slow system
 * from a broken one. Individual screens now quote their own durations at the
 * point of decision; this is the assistant's copy of the same answers, for
 * the player who is asking the question somewhere else.
 *
 * Every figure here is the engine's, not a guess:
 *   - scout leads          engine/scouting.ts    `expectedLeadWeeks`
 *   - scout assignments    engine/facilities.ts  `assignmentDuration`
 *   - board refusals       engine/boardRequests.ts `REJECTION_COOLDOWN_WEEKS`
 *   - negotiation replies  engine/transferMarket.ts `responseWeek = week + 1`
 *   - contract talks       engine/negotiation.ts
 *   - facility projects    engine/facilities.ts
 * Change one of those and this line has to change with it.
 */
export interface Timing {
  what: string;
  howLong: string;
  note: string;
}

export const TIMINGS: Timing[] = [
  {
    what: 'A bid you send',
    howLong: '1 week',
    note: 'The selling club replies the following week — the deal is not refused, it is just not answered yet.',
  },
  {
    what: 'A player you list',
    howLong: '1–4 weeks',
    note: 'Rival clubs bid over the following weeks. Their offers arrive under Offers Received.',
  },
  {
    what: 'A scout you hire',
    howLong: 'every 2–6 weeks',
    note: 'A rolling chance each week, better with more stars. He starts costing you wages immediately.',
  },
  {
    what: 'A scout sent on a job',
    howLong: '1–3 weeks',
    note: 'Opponent report 1, player search 2, youth search 3. The card says which before you send him.',
  },
  {
    what: 'Fitness and sharpness',
    howLong: 'days',
    note: 'The fastest thing training moves. A hard week shows up by the weekend.',
  },
  {
    what: 'An attribute point',
    howLong: 'weeks to months',
    note: 'Individual sessions are the reliable route — the one-to-one card estimates the wait per player.',
  },
  {
    what: 'A board refusal',
    howLong: '8 weeks',
    note: 'They will not hear the same request again until then, so a "no" costs you something.',
  },
  {
    what: 'A facility upgrade',
    howLong: 'weeks',
    note: 'Paid up front, delivered later. The Facilities screen shows the weeks remaining.',
  },
  {
    what: 'An injury',
    howLong: 'as diagnosed',
    note: 'The weeks are on the player. Playing someone carrying a knock is how a short one becomes a long one.',
  },
];
