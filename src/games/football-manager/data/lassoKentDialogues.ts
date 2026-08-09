/**
 * Every word Roy and Ted say lives here — the components and the state
 * machine contain no copy at all. That split is deliberate: writing new
 * scenarios (or localising, or A/B testing the jokes) should never mean
 * touching React.
 *
 * Two modelling notes worth knowing before you add scenarios:
 *
 * 1. Consequences hang off *whose advice you took*, not off which button
 *    you pressed. Each persona `favors` one option; taking it applies that
 *    persona's `follow` effects, and not taking it applies their `ignore`
 *    effects and ticks their ignore streak. This means Roy and Ted are
 *    allowed to agree (they do, on the lineup) without the scenario
 *    breaking — a consensus call just pays out both bonuses.
 * 2. Lines are templated with `{{token}}` placeholders filled from the
 *    `TriggerData` you pass to `assistant.trigger(page, data)`. Missing
 *    tokens fall back to a generic word rather than rendering "{{veteran}}".
 */

export type Persona = 'roy' | 'ted';

/** The pages that can summon an opinion. Extend freely — the machine keys
 *  purely off this union and the scenarios declared below. */
export type AssistantPage = 'lineup' | 'transfer' | 'tactics' | 'matchday';

export type ChoiceId = 'A' | 'B';

/**
 * Generic football-shaped effects. Map these onto your own game state in
 * one place (the provider's `onEffects` callback) — nothing else in the
 * feature knows what your `GameState` looks like.
 */
export interface AssistantEffects {
  /** Squad-wide morale delta, in morale points. */
  morale?: number;
  /** Team aggression / bite delta. */
  aggression?: number;
  /** Defensive shape & discipline delta. */
  defensiveDiscipline?: number;
  /** Transfer cash delta (negative = you spent more). */
  cash?: number;
  /** 0–1 added chance the target rejects your approach. */
  rejectionRisk?: number;
  /** Squad-wide morale delta expressed as a fraction (0.05 = +5%). */
  moralePct?: number;
}

export interface DialogueChoice {
  id: ChoiceId;
  label: string;
  /** Short line shown under the button, so the trade-off is legible. */
  hint: string;
}

export interface Scenario {
  id: string;
  page: AssistantPage;
  /** `'advice'` runs IDLE → QUESTION → REACTION → AFTERMATH.
   *  `'gamble'` is the same loop but the outcome is resolved later by the
   *  match clock rather than immediately by which button was pressed. */
  kind: 'advice' | 'gamble';
  /** Headline shown at the top of the question card. */
  title: string;
  /** The opening pitch, per persona. Supports `{{token}}` placeholders. */
  lines: Record<Persona, string>;
  choices: [DialogueChoice, DialogueChoice];
  /** Which option each persona is lobbying for. */
  favors: Record<Persona, ChoiceId>;
  /** Applied when you take that persona's advice. */
  follow: Record<Persona, AssistantEffects>;
  /** Applied when you don't. */
  ignore: Record<Persona, AssistantEffects>;
  /** REACTION lines. `good` = you agreed with them, `bad` = you didn't. */
  reactions: {
    good: Record<Persona, string[]>;
    bad: Record<Persona, string[]>;
  };
  /** AFTERMATH line — the muttered last word before returning to IDLE. */
  aftermath: Record<Persona, string[]>;
}

/** Filled in from `TriggerData`; every token has a safe generic fallback. */
export const TOKEN_FALLBACKS: Record<string, string> = {
  youngster: 'the kid',
  veteran: 'the old boy',
  target: 'him',
  opponent: 'this lot',
  club: 'the club',
};

export function fillTokens(line: string, data: Record<string, string | undefined> = {}): string {
  return line.replace(/\{\{(\w+)\}\}/g, (_m, key: string) =>
    data[key] || TOKEN_FALLBACKS[key] || key,
  );
}

export const SCENARIOS: Scenario[] = [
  // ── LINEUP ────────────────────────────────────────────────────────────
  {
    id: 'lineup-youth-vs-experience',
    page: 'lineup',
    kind: 'advice',
    title: 'Team sheet',
    lines: {
      roy: 'Put {{youngster}} in. {{veteran}} is weak. Do it. Now.',
      ted:
        "Howdy! I reckon {{veteran}} needs a rest. Let's give that kid a shot! " +
        'I believe in him. Plus, I brought biscuits for the bench.',
    },
    choices: [
      { id: 'A', label: 'Pick {{youngster}}', hint: 'Fresh legs, no fear, no idea where to stand.' },
      { id: 'B', label: 'Keep {{veteran}}', hint: 'Safe hands, tired hands.' },
    ],
    // Both of them want the kid in — a rare moment of agreement, and the
    // effects model handles it without special-casing.
    favors: { roy: 'A', ted: 'A' },
    follow: {
      roy: { aggression: 2 },
      ted: { morale: 2 },
    },
    ignore: {
      roy: { morale: -2 },
      ted: { defensiveDiscipline: -2 },
    },
    reactions: {
      good: {
        roy: ['Fine.', "Don't get used to it.", 'Right. Good.'],
        ted: ["I believe! That's what makes us great!", 'Now THAT is a barbecue sauce decision.'],
      },
      bad: {
        roy: ["F---ing hell, boss. I'm going to the pub.", 'Unbelievable. Un-be-lievable.'],
        ted: [
          "You miss 100% of the shots you don't take. We'll get 'em next time, partner!",
          "That's alright, coach. Even a broken clock throws a heck of a party twice a day.",
        ],
      },
    },
    aftermath: {
      roy: ['Whatever.', "I'll be over there. Not smiling."],
      ted: ['Biscuit?', "I left you a biscuit on the desk. Don't tell Roy."],
    },
  },

  // ── TRANSFER MARKET ───────────────────────────────────────────────────
  {
    id: 'transfer-lowball-vs-fair',
    page: 'transfer',
    kind: 'advice',
    title: 'Opening offer for {{target}}',
    lines: {
      roy: "Sign him. He's got bite. If he asks for more cash, tell him to f--- off.",
      ted:
        "Partner, let's be curious, not judgmental. Offer him a fair deal and a box of " +
        "biscuits. Money isn't everything.",
    },
    choices: [
      { id: 'A', label: 'Aggressive lowball', hint: 'Cheap. Might blow the whole deal up.' },
      { id: 'B', label: 'Fair offer', hint: 'Costs more. He walks in happy.' },
    ],
    favors: { roy: 'A', ted: 'B' },
    follow: {
      roy: { cash: 1_500_000, rejectionRisk: 0.25 },
      ted: { cash: -1_000_000, morale: 3 },
    },
    ignore: {
      roy: { morale: -2 },
      ted: { defensiveDiscipline: -2 },
    },
    reactions: {
      good: {
        roy: ['Fine.', "Don't get used to it.", 'He can cry about it in the car.'],
        ted: ["I believe! That's what makes us great!", 'Fair deal, full heart. Love it, coach.'],
      },
      bad: {
        roy: ["F---ing hell, boss. I'm going to the pub.", 'You just paid extra to be liked. Great.'],
        ted: [
          "You miss 100% of the shots you don't take. We'll get 'em next time, partner!",
          "No harm done, partner. Negotiating's just talkin' with a calculator.",
        ],
      },
    },
    aftermath: {
      roy: ['Oi. Next one, listen.', 'Pub.'],
      ted: ['Biscuit?', "I'll have the paperwork on your desk. And a biscuit."],
    },
  },

  // ── TACTICS ───────────────────────────────────────────────────────────
  {
    id: 'tactics-bus-vs-attack',
    page: 'tactics',
    kind: 'advice',
    title: 'Shape against {{opponent}}',
    lines: {
      roy: 'Park the bus. 5 at the back. Smash their strikers. Simple.',
      ted: "Let's run a false nine! Or a true twelve! I dunno, just outscore 'em! Have fun!",
    },
    choices: [
      { id: 'A', label: 'Defensive 5-4-1', hint: 'Two banks, zero joy, clean sheet odds up.' },
      { id: 'B', label: 'Attacking 4-3-3', hint: 'Front foot, open back door.' },
    ],
    favors: { roy: 'A', ted: 'B' },
    follow: {
      roy: { defensiveDiscipline: 3, aggression: 2 },
      ted: { morale: 3 },
    },
    ignore: {
      roy: { morale: -2 },
      ted: { defensiveDiscipline: -2 },
    },
    reactions: {
      good: {
        roy: ['Fine.', "Don't get used to it.", 'Five at the back. Beautiful.'],
        ted: ["I believe! That's what makes us great!", "Let's go score a bunch, partner!"],
      },
      bad: {
        roy: ["F---ing hell, boss. I'm going to the pub.", "It's a back four. Against them. Sure."],
        ted: [
          "You miss 100% of the shots you don't take. We'll get 'em next time, partner!",
          'Defence is just offence wearing a raincoat, I guess!',
        ],
      },
    },
    aftermath: {
      roy: ['Just win.', "Don't come crying at half time."],
      ted: ['Biscuit?', "I'll be on the touchline. Believing."],
    },
  },

  // ── MATCH DAY: THE GAFFER'S GAMBLE ────────────────────────────────────
  {
    id: 'matchday-gaffers-gamble',
    page: 'matchday',
    kind: 'gamble',
    title: "The Gaffer's Gamble",
    lines: {
      roy: "They'll score in 15 mins. Bet against me if you're stupid.",
      ted:
        "I got a good feeling! I say no goals till halftime. But heck, I once bet a horse " +
        'could talk.',
    },
    choices: [
      { id: 'A', label: 'UNDER 30 mins', hint: 'First goal comes early.' },
      { id: 'B', label: 'OVER 30 mins', hint: 'Tight, cagey, nothing doing.' },
    ],
    favors: { roy: 'A', ted: 'B' },
    // The gamble pays out on the result, not on whose side you took, so the
    // follow/ignore tables are empty — `resolveGamble` supplies the effects.
    follow: { roy: {}, ted: {} },
    ignore: { roy: {}, ted: {} },
    reactions: {
      good: {
        roy: ['Fine. Watch the clock.', "Don't get used to being right."],
        ted: ["Ooh, I like your gut, coach!", "I believe! That's what makes us great!"],
      },
      bad: {
        roy: ['Your funeral.', 'Bet against me then, genius.'],
        ted: ["That's the fun of it, partner!", 'A hunch is just a hope with shoes on!'],
      },
    },
    aftermath: {
      roy: ['Told you.', 'Kick off. Shut up. Watch.'],
      ted: ['Well, shoot.', "Win or lose, we got biscuits."],
    },
  },
];

/** Payout for winning the Gaffer's Gamble: +5% squad morale. */
export const GAMBLE_WIN_EFFECTS: AssistantEffects = { moralePct: 0.05 };
export const GAMBLE_LOSS_EFFECTS: AssistantEffects = {};

export const GAMBLE_RESULT_LINES = {
  win: {
    roy: ['Lucky.', 'Fine. Good call.'],
    ted: ['WOOO! Called it, partner!', "That's what I'm talkin' about!"],
  },
  loss: {
    roy: ['Told you.', 'Told you. Pub.'],
    ted: ['Well, shoot.', "Well, shoot. Biscuit?"],
  },
} satisfies Record<'win' | 'loss', Record<Persona, string[]>>;

// ── Streak payoffs (the "memory" beat) ──────────────────────────────────

/** Ignoring the same man three times running triggers his signature move. */
export const IGNORE_STREAK_LIMIT = 3;

/** Roy sods off to the pub and the widget greys out for two minutes. */
export const ROY_PUB_COOLDOWN_MS = 2 * 60 * 1000;
export const ROY_PUB_LINE = "F--- it. I'm going to the pub.";

/** Ted is constitutionally incapable of sulking, so he tips morale anyway. */
export const TED_FORGIVENESS_LINE = "That's okay! You're the boss.";
export const TED_FORGIVENESS_EFFECTS: AssistantEffects = { morale: 1 };

/** Greetings used when the window is opened with nothing to discuss. */
export const IDLE_LINES: Record<Persona, string[]> = {
  roy: [
    'What.',
    "I'm here. Obviously.",
    "Oi. Say something or don't.",
    "Don't just stare at me, boss.",
  ],
  ted: [
    "Howdy, partner! Biscuit?",
    "Well hey there, Coach! Heck of a day for football. Soccer. Football.",
    "I brought biscuits. I always bring biscuits.",
    "You look like a fella with a plan. I love a fella with a plan.",
  ],
};

/** Said when the user flips the mode toggle. */
export const HANDOVER_LINES: Record<Persona, string[]> = {
  roy: ['Finally.', 'He talks too much.'],
  ted: ["Roy's just gone for a walk. He does that!", "Hiya, Coach! Did I miss anything fun?"],
};

export function scenarioFor(page: AssistantPage): Scenario | undefined {
  return SCENARIOS.find((s) => s.page === page);
}
