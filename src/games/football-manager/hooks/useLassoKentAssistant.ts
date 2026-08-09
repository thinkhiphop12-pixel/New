'use client';

/**
 * The brains of the Lasso/Kent assistant: a small finite state machine, the
 * grudge-tracking memory, the auto-pilot ("let them handle it") mode, and
 * the React context the UI reads from. No JSX lives here on purpose — the
 * machine is testable without rendering anything.
 *
 * FSM: IDLE ──trigger()──▶ QUESTION ──choose()──▶ REACTION ──▶ AFTERMATH ──▶ IDLE
 *
 * Everything that touches YOUR game state goes through two props on the
 * provider — `snapshot` (what they can see) and `onEffects` (what they can
 * change) — so this file never imports your engine.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import {
  GAMBLE_LOSS_EFFECTS,
  GAMBLE_RESULT_LINES,
  GAMBLE_WIN_EFFECTS,
  HANDOVER_LINES,
  IDLE_LINES,
  IGNORE_STREAK_LIMIT,
  ROY_PUB_COOLDOWN_MS,
  ROY_PUB_LINE,
  TED_FORGIVENESS_EFFECTS,
  TED_FORGIVENESS_LINE,
  fillTokens,
  scenarioFor,
  type AssistantEffects,
  type AssistantPage,
  type ChoiceId,
  type Persona,
  type Scenario,
} from '../data/lassoKentDialogues';

// ── Public types ────────────────────────────────────────────────────────

export type MachineState = 'IDLE' | 'QUESTION' | 'REACTION' | 'AFTERMATH';

/** What the user picked in the header toggle. `surprise` re-rolls a persona
 *  for every new scenario, which is where most of the fun lives. */
export type AssistantMode = Persona | 'surprise';

/**
 * The "do it for you" setting. `off` = you always press the buttons.
 * `roy` / `ted` = that man decides every scenario for you and you just read
 * the fallout. `active` = whoever is currently on screen decides.
 */
export type AutoPilot = 'off' | 'active' | Persona;

/** Free-form context you hand in with a trigger; used to fill `{{tokens}}`
 *  and shown back to the user in the question card. */
export interface TriggerData {
  youngster?: string;
  veteran?: string;
  target?: string;
  opponent?: string;
  club?: string;
  /** Match-day only: the minute the first goal actually lands (null = none
   *  yet). Pass it later via `resolveGamble` if you don't know it up front. */
  firstGoalMinute?: number | null;
  [key: string]: string | number | null | undefined;
}

/** A read-only view of your squad, so the pair can say something specific.
 *  Map your own types onto this once, in the provider. */
export interface AssistantSnapshot {
  /** Team morale, 0–100. */
  morale: number;
  /** Average squad fitness, 0–100. */
  fitness: number;
  /** Average squad rating, 0–100. */
  rating: number;
  /** Minutes played in the current match, or null when not playing. */
  matchMinute?: number | null;
}

export interface ChatMessage {
  id: number;
  /** `null` for the user's own lines and for system beats. */
  persona: Persona | null;
  kind: 'say' | 'you' | 'system';
  text: string;
}

export interface AssistantApi {
  // — presentation —
  open: boolean;
  setOpen(open: boolean): void;
  mode: AssistantMode;
  setMode(mode: AssistantMode): void;
  /** The persona actually on screen right now (never `'surprise'`). */
  persona: Persona;
  state: MachineState;
  messages: ChatMessage[];
  /** True while Roy is in the pub. The UI greys out and disables input. */
  royOffline: boolean;
  /** ms remaining on Roy's sulk, for the countdown pill. */
  royOfflineMs: number;

  // — the current question —
  scenario: Scenario | null;
  data: TriggerData;
  /** Choice labels with `{{tokens}}` already filled in. */
  choices: { id: ChoiceId; label: string; hint: string }[];

  // — actions —
  /** Summon them about a page. Call this from anywhere. */
  trigger(page: AssistantPage, data?: TriggerData): void;
  /** Answer the open question. */
  choose(id: ChoiceId): void;
  /** "Simulate" — let the assistant make the call for you and apply it. */
  simulate(): void;
  /** Resolve an outstanding Gaffer's Gamble. Pass the minute of the first
   *  goal, or `null` if the half finished goalless. Omit to simulate. */
  resolveGamble(firstGoalMinute?: number | null): void;
  dismiss(): void;

  // — settings & memory —
  autoPilot: AutoPilot;
  setAutoPilot(value: AutoPilot): void;
  memory: Memory;
}

export interface Memory {
  /** Consecutive times each man's advice was waved away. Resets on agree. */
  royStreak: number;
  tedStreak: number;
  /** Lifetime totals, handy for achievements or end-of-season stats. */
  royIgnoredTotal: number;
  tedIgnoredTotal: number;
  /** Epoch ms until which Roy is in the pub; 0 = he's here. */
  royPubUntil: number;
}

const EMPTY_MEMORY: Memory = {
  royStreak: 0,
  tedStreak: 0,
  royIgnoredTotal: 0,
  tedIgnoredTotal: 0,
  royPubUntil: 0,
};

// ── Reducer ─────────────────────────────────────────────────────────────

interface State {
  open: boolean;
  mode: AssistantMode;
  /** Resolved persona for the current exchange (re-rolled in surprise mode). */
  persona: Persona;
  machine: MachineState;
  scenario: Scenario | null;
  data: TriggerData;
  messages: ChatMessage[];
  memory: Memory;
  autoPilot: AutoPilot;
  /** Set once a gamble choice is locked in and awaiting a result. */
  pendingGamble: ChoiceId | null;
  seq: number;
}

type Action =
  | { type: 'setOpen'; open: boolean }
  | { type: 'setMode'; mode: AssistantMode }
  | { type: 'setAutoPilot'; value: AutoPilot }
  | { type: 'say'; persona: Persona | null; kind: ChatMessage['kind']; text: string }
  | { type: 'trigger'; scenario: Scenario; data: TriggerData; persona: Persona }
  | { type: 'answer'; choice: ChoiceId; memory: Memory; pendingGamble: ChoiceId | null }
  | { type: 'advance'; machine: MachineState }
  | { type: 'reset' }
  | { type: 'hydrate'; memory: Memory; mode: AssistantMode; autoPilot: AutoPilot };

function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

function rollPersona(mode: AssistantMode, memory: Memory): Persona {
  // Roy can't appear while he's in the pub, whatever the toggle says.
  const royAvailable = memory.royPubUntil <= Date.now();
  if (mode === 'roy') return royAvailable ? 'roy' : 'ted';
  if (mode === 'ted') return 'ted';
  if (!royAvailable) return 'ted';
  return Math.random() < 0.5 ? 'roy' : 'ted';
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'setOpen':
      return { ...state, open: action.open };

    case 'setMode': {
      if (action.mode === state.mode) return state;
      const persona = rollPersona(action.mode, state.memory);
      return { ...state, mode: action.mode, persona };
    }

    case 'setAutoPilot':
      return { ...state, autoPilot: action.value };

    case 'say': {
      const msg: ChatMessage = {
        id: state.seq + 1,
        persona: action.persona,
        kind: action.kind,
        text: action.text,
      };
      // Keep the transcript bounded — this is a chat toy, not an archive.
      const messages = [...state.messages, msg].slice(-40);
      return { ...state, messages, seq: state.seq + 1 };
    }

    case 'trigger':
      return {
        ...state,
        machine: 'QUESTION',
        scenario: action.scenario,
        data: action.data,
        persona: action.persona,
        pendingGamble: null,
      };

    case 'answer':
      return {
        ...state,
        machine: 'REACTION',
        memory: action.memory,
        pendingGamble: action.pendingGamble,
      };

    case 'advance':
      return { ...state, machine: action.machine };

    case 'reset':
      return { ...state, machine: 'IDLE', scenario: null, pendingGamble: null };

    case 'hydrate':
      return {
        ...state,
        memory: action.memory,
        mode: action.mode,
        autoPilot: action.autoPilot,
        persona: rollPersona(action.mode, action.memory),
      };

    default:
      return state;
  }
}

const INITIAL: State = {
  open: false,
  mode: 'surprise',
  persona: 'ted',
  machine: 'IDLE',
  scenario: null,
  data: {},
  messages: [],
  memory: EMPTY_MEMORY,
  autoPilot: 'off',
  pendingGamble: null,
  seq: 0,
};

// ── Persistence ─────────────────────────────────────────────────────────

const STORAGE_KEY = 'lassoKent.assistant.v1';

interface Persisted {
  memory: Memory;
  mode: AssistantMode;
  autoPilot: AutoPilot;
}

function loadPersisted(): Persisted | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    return {
      memory: { ...EMPTY_MEMORY, ...(parsed.memory ?? {}) },
      mode: parsed.mode ?? 'surprise',
      autoPilot: parsed.autoPilot ?? 'off',
    };
  } catch {
    return null; // Corrupt or blocked storage just means a fresh grudge.
  }
}

// ── Timings (exported so the UI can match its animations) ───────────────

export const REACTION_MS = 2200;
export const AFTERMATH_MS = 2400;
/** How long the "…thinking" beat runs when the assistant plays for you. */
export const SIMULATE_THINKING_MS = 900;

// ── Provider hook ───────────────────────────────────────────────────────

export interface UseLassoKentOptions {
  /** A live read-only view of your team. */
  snapshot?: AssistantSnapshot;
  /** Apply the consequences to your game state. Called once per resolution. */
  onEffects?(effects: AssistantEffects, meta: { persona: Persona; scenarioId: string }): void;
}

/**
 * Owns the machine. Mounted once by `LassoKentProvider`; everything else
 * consumes the returned API through `useAssistant()`.
 */
export function useLassoKentMachine({ snapshot, onEffects }: UseLassoKentOptions = {}): AssistantApi {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const effectsRef = useRef(onEffects);
  effectsRef.current = onEffects;

  // Keep the latest state addressable from inside timeouts without
  // re-creating every callback on each keystroke of state.
  const stateRef = useRef(state);
  stateRef.current = state;

  const later = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timers.current.push(id);
  }, []);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // Restore grudges on mount, and persist them whenever they move.
  useEffect(() => {
    const saved = loadPersisted();
    if (saved) dispatch({ type: 'hydrate', ...saved });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const payload: Persisted = {
      memory: state.memory,
      mode: state.mode,
      autoPilot: state.autoPilot,
    };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* private mode / quota — the feature still works, it just forgets. */
    }
  }, [state.memory, state.mode, state.autoPilot]);

  // Re-render once a second while Roy is sulking so the countdown ticks and
  // the window un-greys the moment he's back.
  const royOffline = state.memory.royPubUntil > Date.now();
  const [, forceTick] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    if (!royOffline) return;
    const id = setInterval(forceTick, 1000);
    return () => clearInterval(id);
  }, [royOffline]);

  const say = useCallback(
    (persona: Persona | null, text: string, kind: ChatMessage['kind'] = 'say') =>
      dispatch({ type: 'say', persona, kind, text }),
    [],
  );

  const applyEffects = useCallback((effects: AssistantEffects, persona: Persona, scenarioId: string) => {
    if (!effects || Object.keys(effects).length === 0) return;
    effectsRef.current?.(effects, { persona, scenarioId });
  }, []);

  // ── trigger ───────────────────────────────────────────────────────────
  const trigger = useCallback(
    (page: AssistantPage, data: TriggerData = {}) => {
      const scenario = scenarioFor(page);
      if (!scenario) return;
      const cur = stateRef.current;
      // Don't stomp an exchange that's already mid-flight.
      if (cur.machine !== 'IDLE') return;

      const persona = rollPersona(cur.mode, cur.memory);
      dispatch({ type: 'trigger', scenario, data, persona });
      dispatch({ type: 'setOpen', open: true });
      say(persona, fillTokens(scenario.lines[persona], data as Record<string, string>));

      // "Do it for you" — they answer their own question after a beat.
      const auto = cur.autoPilot;
      if (auto !== 'off') {
        const decider: Persona = auto === 'active' ? persona : auto;
        later(() => {
          say(null, `${decider === 'roy' ? 'Roy' : 'Ted'} is handling it…`, 'system');
          later(() => answerRef.current?.(scenario.favors[decider], true), SIMULATE_THINKING_MS);
        }, 600);
      }
    },
    [later, say],
  );

  // ── answering (manual or simulated) ──────────────────────────────────
  const answerRef = useRef<((choice: ChoiceId, simulated?: boolean) => void) | null>(null);

  const answer = useCallback(
    (choice: ChoiceId, simulated = false) => {
      const cur = stateRef.current;
      const scenario = cur.scenario;
      if (!scenario || cur.machine !== 'QUESTION') return;

      const persona = cur.persona;
      const tokens = cur.data as Record<string, string>;
      const chosen = scenario.choices.find((c) => c.id === choice)!;
      const followed = scenario.favors[persona] === choice;

      say(
        null,
        simulated
          ? `${fillTokens(chosen.label, tokens)} — decided for you.`
          : fillTokens(chosen.label, tokens),
        'you',
      );

      // Only the man in the room is being obeyed or ignored. The other one
      // wasn't asked, so he neither scores a win nor holds a grudge.
      const memory: Memory = { ...cur.memory };
      if (scenario.kind === 'advice') {
        applyEffects(
          followed ? scenario.follow[persona] : scenario.ignore[persona],
          persona,
          scenario.id,
        );
        if (followed) {
          if (persona === 'roy') memory.royStreak = 0;
          else memory.tedStreak = 0;
        } else if (persona === 'roy') {
          memory.royStreak += 1;
          memory.royIgnoredTotal += 1;
        } else {
          memory.tedStreak += 1;
          memory.tedIgnoredTotal += 1;
        }
      }

      // Streak payoffs — the memory beat that stops this feeling like a
      // tooltip that resets every page load.
      let royToPub = false;
      let tedForgives = false;
      if (memory.royStreak >= IGNORE_STREAK_LIMIT) {
        royToPub = true;
        memory.royStreak = 0;
        memory.royPubUntil = Date.now() + ROY_PUB_COOLDOWN_MS;
      }
      if (memory.tedStreak >= IGNORE_STREAK_LIMIT) {
        tedForgives = true;
        memory.tedStreak = 0;
      }

      dispatch({
        type: 'answer',
        choice,
        memory,
        pendingGamble: scenario.kind === 'gamble' ? choice : null,
      });

      // REACTION → AFTERMATH → IDLE, with the streak payoff spliced in.
      later(() => {
        say(persona, pick(followed ? scenario.reactions.good[persona] : scenario.reactions.bad[persona]));
        later(() => {
          dispatch({ type: 'advance', machine: 'AFTERMATH' });
          if (royToPub) {
            say('roy', ROY_PUB_LINE);
          } else if (tedForgives) {
            say('ted', TED_FORGIVENESS_LINE);
            applyEffects(TED_FORGIVENESS_EFFECTS, 'ted', scenario.id);
          } else if (scenario.kind !== 'gamble') {
            say(persona, pick(scenario.aftermath[persona]));
          }

          // A gamble stays "live" until the match tells us what happened;
          // everything else winds back to IDLE.
          if (scenario.kind === 'gamble') {
            const known = cur.data.firstGoalMinute;
            if (typeof known === 'number' || known === null) {
              later(() => resolveRef.current?.(known), 400);
            }
          } else {
            later(() => dispatch({ type: 'reset' }), AFTERMATH_MS);
          }
        }, REACTION_MS);
      }, 500);
    },
    [applyEffects, later, say],
  );
  answerRef.current = answer;

  // ── the Gaffer's Gamble result ───────────────────────────────────────
  const resolveRef = useRef<((minute?: number | null) => void) | null>(null);
  const resolveGamble = useCallback(
    (firstGoalMinute?: number | null) => {
      const cur = stateRef.current;
      const bet = cur.pendingGamble;
      const scenario = cur.scenario;
      if (!bet || !scenario) return;

      // No minute supplied? Simulate one — same code path the "do it for
      // you" setting uses when there's no live match to read from.
      const minute =
        firstGoalMinute === undefined
          ? Math.random() < 0.55
            ? Math.floor(Math.random() * 45) + 1
            : null
          : firstGoalMinute;

      const under = minute !== null && minute < 30;
      const won = (bet === 'A') === under;
      const persona = cur.persona;

      say(
        null,
        minute === null
          ? 'No goal before the break.'
          : `First goal: ${minute}'.`,
        'system',
      );
      say(persona, pick(won ? GAMBLE_RESULT_LINES.win[persona] : GAMBLE_RESULT_LINES.loss[persona]));
      applyEffects(won ? GAMBLE_WIN_EFFECTS : GAMBLE_LOSS_EFFECTS, persona, scenario.id);
      later(() => dispatch({ type: 'reset' }), AFTERMATH_MS);
    },
    [applyEffects, later, say],
  );
  resolveRef.current = resolveGamble;

  // ── mode toggle patter ───────────────────────────────────────────────
  const setMode = useCallback(
    (mode: AssistantMode) => {
      const cur = stateRef.current;
      if (mode === cur.mode) return;
      dispatch({ type: 'setMode', mode });
      const next = rollPersona(mode, cur.memory);
      if (next !== cur.persona) say(next, pick(HANDOVER_LINES[next]));
    },
    [say],
  );

  const setOpen = useCallback(
    (open: boolean) => {
      dispatch({ type: 'setOpen', open });
      const cur = stateRef.current;
      // Opening on an empty transcript gets a greeting rather than silence.
      if (open && cur.messages.length === 0) {
        const persona = rollPersona(cur.mode, cur.memory);
        say(persona, pick(IDLE_LINES[persona]));
      }
    },
    [say],
  );

  const choices = useMemo(() => {
    if (!state.scenario) return [];
    const tokens = state.data as Record<string, string>;
    return state.scenario.choices.map((c) => ({
      id: c.id,
      label: fillTokens(c.label, tokens),
      hint: fillTokens(c.hint, tokens),
    }));
  }, [state.scenario, state.data]);

  // `snapshot` isn't read by the machine itself yet — it's surfaced to the
  // UI (the status strip) and is the hook point for snapshot-aware lines.
  return {
    open: state.open,
    setOpen,
    mode: state.mode,
    setMode,
    persona: state.persona,
    state: state.machine,
    messages: state.messages,
    royOffline,
    royOfflineMs: Math.max(0, state.memory.royPubUntil - Date.now()),
    scenario: state.scenario,
    data: { ...state.data, ...(snapshot ? { matchMinute: snapshot.matchMinute ?? null } : {}) },
    choices,
    trigger,
    choose: (id: ChoiceId) => answer(id, false),
    simulate: () => {
      const cur = stateRef.current;
      if (!cur.scenario) return;
      answer(cur.scenario.favors[cur.persona], true);
    },
    resolveGamble,
    dismiss: () => dispatch({ type: 'reset' }),
    autoPilot: state.autoPilot,
    setAutoPilot: (value: AutoPilot) => dispatch({ type: 'setAutoPilot', value }),
    memory: state.memory,
  };
}

// ── Context ─────────────────────────────────────────────────────────────

export const LassoKentContext = createContext<AssistantApi | null>(null);

/** Read the assistant from anywhere under `<LassoKentProvider>`. */
export function useAssistant(): AssistantApi {
  const ctx = useContext(LassoKentContext);
  if (!ctx) throw new Error('useAssistant must be used inside <LassoKentProvider>');
  return ctx;
}

/** Non-throwing variant for components that may render outside the provider. */
export function useAssistantOptional(): AssistantApi | null {
  return useContext(LassoKentContext);
}
