import type { ScreenId } from '../hubNav';

/**
 * What the assistant manager points at, screen by screen.
 *
 * One tour per section rather than one tour for the whole game: a seven-card
 * "here is everything" overlay is read once and forgotten, whereas a
 * three-step walkthrough of the screen you are actually standing on can be
 * replayed from the assistant panel the moment you get stuck. Every tour is
 * reachable from "Explain this section", so none of this is one-shot.
 *
 * `target` names a `data-tour` attribute on a real element. A step with no
 * target is a plain centred card — used for openers and sign-offs, where
 * there is nothing to point at yet.
 *
 * Steps deliberately answer the two questions the game was never answering:
 * *what does this control do* and *how long does it take*. Durations quoted
 * here are the engine's own (see engine/facilities.ts `assignmentDuration`,
 * engine/scouting.ts `expectedLeadWeeks`, engine/training.ts).
 */
export interface TourStep {
  /** `data-tour` value of the element to spotlight, or undefined to centre. */
  target?: string;
  title: string;
  body: string;
}

export interface Tour {
  id: string;
  /** Hub screen this tour runs on. The controller routes there first. */
  screen: ScreenId;
  /** Short name for the section, used in the assistant panel's button. */
  label: string;
  steps: TourStep[];
}

/**
 * The very first thing a new manager is asked to do, walked through rather
 * than described. Two steps, both pointing at the one card that matters, so
 * the appointment cannot be missed on a screen of eight identical-looking
 * coaching posts.
 */
export const HIRE_ASSISTANT_TOUR: Tour = {
  id: 'hire-assistant',
  screen: 'staff',
  label: 'Your first job',
  steps: [
    {
      target: 'staff-assistant',
      title: 'This one, first',
      body:
        'Eight coaching posts, and this is the one to fill before any of them. Press "Ask the board" and the chairman answers on the spot — he decides what quality of coach he will pay for.',
    },
    {
      target: 'staff-assistant',
      title: 'Then appoint him',
      body:
        'A yes turns into an "Appoint" button on this same card, with the wage on it. Press that and he starts straight away — no waiting, no transfer window.',
    },
  ],
};

/** The first walk round the building, once an assistant is in post. */
export const ORIENTATION_TOUR: Tour = {
  id: 'orientation',
  screen: 'overview',
  label: 'The basics',
  steps: [
    {
      target: 'rail',
      title: 'Six sections, that is the lot',
      body:
        'Home, Squad, Training, Market, Club and League. Every screen in the game sits under one of these six — nothing is hidden behind a menu. A number on a section means something there is waiting on you.',
    },
    {
      target: 'subnav',
      title: 'Screens within a section',
      body:
        'Open a section and its screens appear along here. You can also move between them with the left and right arrow keys.',
    },
    {
      target: 'dock-date',
      title: 'Today',
      body:
        "Nothing in this game happens until you advance time, and this is where you see how far you've got: the date, the week, and the season.",
    },
    {
      target: 'dock-cta',
      title: 'This is how time moves',
      body:
        "Next Event skips through the quiet days on its own and stops the moment something needs you — a bid arrives, a player asks for a word, or it's matchday. You never have to click through empty days one at a time.",
    },
    {
      target: 'assistant-fab',
      title: "And that's me",
      body:
        "I'm on every screen. Tap me for what I think you should do next, to have me handle a job for you, or to have this section explained again — I don't mind repeating myself.",
    },
  ],
};

/** The per-section walkthroughs, keyed by the screen they run on. */
export const SECTION_TOURS: Tour[] = [
  {
    id: 'overview',
    screen: 'overview',
    label: 'Home',
    steps: [
      {
        target: 'dash-pulse',
        title: 'The club at a glance',
        body:
          'League position, board confidence, squad morale and the bank. If one of these is red, that is the thing to fix before anything else.',
      },
      {
        target: 'dash-todo',
        title: 'What needs you',
        body:
          'Anything genuinely waiting on a decision shows up here, and each row takes you to the screen that fixes it. An empty list means you are free to press on.',
      },
      {
        target: 'dock-cta',
        title: 'Then move time on',
        body:
          'When this list is clear, Next Event carries you to whatever happens next.',
      },
    ],
  },
  {
    id: 'squad',
    screen: 'squad',
    label: 'Squad',
    steps: [
      {
        target: 'squad-list',
        title: 'Your players',
        body:
          'Everyone on the books. Tap a name for his attributes, contract, form and development plan.',
      },
      {
        target: 'squad-pitch',
        title: 'The starting eleven',
        body:
          'Tap a shirt to free the slot, then tap a player to fill it. A slot that is empty or filled by an injured man will stop you at kickoff, so this is worth a look before every match.',
      },
    ],
  },
  {
    id: 'tactics',
    screen: 'tactics',
    label: 'Tactics',
    steps: [
      {
        target: 'tactics-tabs',
        title: 'Five things to set',
        body:
          'Formation, shape, defence, attack and set pieces. You do not need all five to play a match — formation and shape are enough to start.',
      },
      {
        target: 'tactics-formation',
        title: 'Shape with and without the ball',
        body:
          'Two formations: one for when you have the ball, one for when you do not. Change either and the players rearrange themselves to suit.',
      },
      {
        target: 'save-bar',
        title: 'Nothing counts until you save',
        body:
          "Changes here sit as a draft until you press Save changes — so you can try a shape, see what it does to the pitch, and back out with Discard if you don't like it.",
      },
    ],
  },
  {
    id: 'training',
    screen: 'training',
    label: 'Training',
    steps: [
      {
        target: 'training-sessions',
        title: 'Two sessions a week',
        body:
          'Pick what each one drills. Fitness and sharpness work fast; a technical drill takes weeks to show up in a player’s attributes, so pick a plan and stay with it.',
      },
      {
        target: 'training-schedule',
        title: 'The weekly plan',
        body:
          'Training days build sharpness and cost fitness; recovery days do the reverse. Six or seven training days a week will get somebody injured.',
      },
      {
        target: 'save-bar',
        title: 'Save when you are happy',
        body:
          'The week is a draft until you save it. I will tell you if I think the balance is wrong before you commit.',
      },
    ],
  },
  {
    id: 'one-to-one',
    screen: 'one-to-one',
    label: 'One-to-one',
    steps: [
      {
        target: 'o2o-slots',
        title: 'Four individual sessions',
        body:
          'Four players a week get guaranteed individual progress — no dice roll. Leaving a slot empty throws that away, which is why the tab badges when one is free.',
      },
      {
        target: 'o2o-slots',
        title: 'It takes weeks, not days',
        body:
          'Each card tells you roughly how many weeks that player needs for his next attribute point. Young players with headroom move fastest.',
      },
    ],
  },
  {
    id: 'academy',
    screen: 'academy',
    label: 'Academy',
    steps: [
      {
        target: 'academy-intake',
        title: 'This year’s trialists',
        body:
          'A handful report in every pre-season. I give each one a verdict and a ceiling — sign the ones worth keeping and release the rest.',
      },
      {
        target: 'academy-intake',
        title: 'They do not keep',
        body:
          'An intake expires at the end of the season. Anyone you have not answered by then leaves, so this is a real deadline rather than a list that will wait.',
      },
    ],
  },
  {
    id: 'transfers',
    screen: 'transfers',
    label: 'Transfers',
    steps: [
      {
        target: 'transfers-tabs',
        title: 'Four tabs, in order of use',
        body:
          'Search to find players, Shortlist to keep the ones you like, Offers Sent for deals you are chasing, Offers Received for bids that have come in for your players.',
      },
      {
        target: 'transfers-filters',
        title: 'Narrow it down first',
        body:
          'The market is thousands of players. Filter by position and what you can afford — realistic targets sort to the top, and anything marked "reputation gap" is well beyond your club for now.',
      },
      {
        target: 'transfers-loans',
        title: 'Loans, if the fee is beyond you',
        body:
          'A quick loan is an instant yes or no. Negotiating one lets you argue over wage share and playing time, and can carry an option to buy him later.',
      },
      {
        target: 'transfers-sell',
        title: 'And selling',
        body:
          'List one of yours and rival clubs will bid over the following weeks. Their offers arrive under Offers Received — they are not instant.',
      },
    ],
  },
  {
    id: 'scouting',
    screen: 'scouting',
    label: 'Scouting',
    steps: [
      {
        target: 'scouting-hire',
        title: 'Scouts on the books',
        body:
          'A hired scout works one region permanently and files a lead whenever he finds someone. A 3-star scout averages a lead every three weeks; a 5-star, every two. He is on the wage bill from the day you hire him.',
      },
      {
        target: 'scouting-assign',
        title: 'Or send one out on a job',
        body:
          'A one-off with a deadline you can see: a player search takes two weeks, a youth search three, and a report on an opponent one. The card tells you before you commit.',
      },
      {
        target: 'scouting-leads',
        title: 'What comes back',
        body:
          'Leads land here and on your shortlist, with anything that would fix your weakest position flagged. Remember none of it moves until you advance time.',
      },
    ],
  },
  {
    id: 'staff',
    screen: 'staff',
    label: 'Staff',
    steps: [
      {
        target: 'staff-grid',
        title: 'Eight jobs to fill',
        body:
          'Each coach develops one part of the squad. An empty post is not a disaster, but a filled one compounds over a season.',
      },
      {
        target: 'staff-grid',
        title: 'The board pays, so the board decides',
        body:
          'Ask, and the chairman answers on the spot with a quality he will fund — or a refusal that stands for eight weeks. Then you make the appointment against it.',
      },
    ],
  },
  {
    id: 'board',
    screen: 'board',
    label: 'Board',
    steps: [
      {
        target: 'board-objectives',
        title: 'What you were hired to do',
        body:
          'Miss the target and confidence falls; clear it and they back you. Confidence under 30 is when the job starts to look shaky.',
      },
    ],
  },
  {
    id: 'finances',
    screen: 'finances',
    label: 'Finances',
    steps: [
      {
        target: 'finances-summary',
        title: 'Money in, money out',
        body:
          'Wages leave every week whether you play well or not. The transfer budget and the wage ceiling are separate limits — a signing can clear one and be refused on the other.',
      },
    ],
  },
  {
    id: 'inbox',
    screen: 'inbox',
    label: 'Inbox',
    steps: [
      {
        target: 'inbox-list',
        title: 'Everything that happened, in order',
        body:
          'Board decisions, scouting reports, unhappy players, bids. Anything that needs an answer says so and links to the screen that gives it.',
      },
    ],
  },
  {
    id: 'calendar',
    screen: 'calendar',
    label: 'Calendar',
    steps: [
      {
        target: 'calendar-grid',
        title: 'The season ahead',
        body:
          'Fixtures, training days and deadlines. Each day offers "simulate to here", which runs time forward to that point and stops early if something needs you on the way.',
      },
    ],
  },
  {
    id: 'table',
    screen: 'table',
    label: 'League',
    steps: [
      {
        target: 'table-grid',
        title: 'Where you stand',
        body:
          'Your club is highlighted, with the promotion and relegation zones shaded. This is the number the board is judging you on.',
      },
    ],
  },
];

export function tourForScreen(screen: ScreenId): Tour | undefined {
  return SECTION_TOURS.find((t) => t.screen === screen);
}

export function tourById(id: string): Tour | undefined {
  if (id === ORIENTATION_TOUR.id) return ORIENTATION_TOUR;
  if (id === HIRE_ASSISTANT_TOUR.id) return HIRE_ASSISTANT_TOUR;
  return SECTION_TOURS.find((t) => t.id === id);
}
