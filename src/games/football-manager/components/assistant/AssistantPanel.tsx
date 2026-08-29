'use client';

import { useEffect, useRef, useState } from 'react';
import type { GameState, InboxCategory } from '@/engine/types';
import { assistantTrust, bumpAssistantTrust, getAssistant, trustLabel } from '@/engine/assistant';
import { getSquad } from '@/engine/teamManagement';
import { contractMonthsLeft } from '@/engine/negotiation';
import { getIntake } from '@/engine/youthAcademy';
import { pushInbox } from '@/engine/inbox';
import { sfx } from '@/lib/sound';
import { Icon } from '../Icon';
import type { ScreenId } from '../hubNav';
import CoachPortrait, { type CoachMood } from './CoachPortrait';
import { assistantTopics, type AssistantTopic } from './tips';
import {
  answerIncomingBids, renewExpiringContracts, setLineupAndTactics, sortYouthIntake, type DelegateResult,
} from './delegate';

/**
 * The Assistant Manager, as a person rather than a settings screen.
 *
 * This used to reuse the Settings panel shell: four grey rows, a list of
 * quotes, a list of buttons. Everything in it worked and none of it suggested
 * there was anybody on the touchline.
 *
 * Now: he has a face (procedural, from his coach id — no art assets), he says
 * one thing at a time and types it out, you pick what to ask him, and handing
 * him a job is a card that visibly runs and stamps itself done. The trust
 * meter is the thread through it — it rises when you ask him for a read or
 * hand him work, and it's shown because a relationship you can see moving is
 * a reason to come back to the screen.
 */

type TaskId = 'renew' | 'lineup' | 'youth' | 'bids';
type TaskState = 'idle' | 'running' | 'done';

const TASKS: {
  id: TaskId;
  label: string;
  sub: string;
  category: InboxCategory;
  run: (s: GameState) => DelegateResult;
}[] = [
  { id: 'renew', label: 'Renew contracts', sub: 'expiring deals', category: 'contract', run: renewExpiringContracts },
  { id: 'lineup', label: 'Set lineup & tactics', sub: 'strongest available XI', category: 'club', run: setLineupAndTactics },
  { id: 'youth', label: 'Sort youth intake', sub: 'this year’s trialists', category: 'youth', run: sortYouthIntake },
  { id: 'bids', label: 'Answer incoming bids', sub: 'offers on the table', category: 'transfer', run: answerIncomingBids },
];

/** Roughly how long the "he's doing it" beat runs, in ms. */
const RUN_MS = 1100;

export default function AssistantPanel({
  state,
  route,
  onClose,
  onRoute,
  onChange,
  onShowTour,
  onOpenSettings,
  firstMeeting = false,
}: {
  state: GameState;
  route: ScreenId;
  onClose: () => void;
  onRoute: (id: ScreenId) => void;
  onChange: (next: GameState) => void;
  onShowTour: () => void;
  onOpenSettings: () => void;
  /** True when a brand-new career opened this panel on its own, rather than
   *  the player summoning him. Changes his opening line, nothing else. */
  firstMeeting?: boolean;
}) {
  const assistant = getAssistant(state);
  const name = assistant?.name ?? 'Your assistant';
  const club = state.clubs.find((c) => c.id === state.userClubId);
  const topics = assistantTopics(state, route);

  const [topicId, setTopicId] = useState<string>(topics[0]?.id ?? '');
  const [taskStates, setTaskStates] = useState<Partial<Record<TaskId, TaskState>>>({});
  const [report, setReport] = useState<{ title: string; lines: string[] } | null>(null);
  const [typed, setTyped] = useState('');
  const [asked, setAsked] = useState<Set<string>>(new Set());

  const topic = topics.find((t) => t.id === topicId) ?? topics[0];
  // A new career opens this panel automatically (FootballManagerGame), and
  // walking in on your number two mid-squad-report — "nobody hot, nobody
  // cold" — is a strange way to meet him. On the first opening of a save he
  // says who he is and what he is for; every opening after that goes
  // straight to the topic, as before. `intro` clears the moment you ask him
  // anything, so it never sits in the way of a real answer.
  const [intro, setIntro] = useState(firstMeeting);
  const introLine = club
    ? `${name}, gaffer — assistant manager here at ${club.name}. I watch the squad and the paperwork, so ask me anything, or hand me a job and consider it done.`
    : `${name}, gaffer — your assistant. Ask me anything, or hand me a job and consider it done.`;
  const line = intro ? introLine : (topic?.line ?? `Nothing pressing, gaffer. Shout if you need me.`);
  const mood: CoachMood = topic?.urgent ? 'concerned' : topic?.good ? 'happy' : 'neutral';
  const trust = assistantTrust(state);

  const squad = getSquad(state, state.userClubId);

  const pending: Record<TaskId, boolean> = {
    renew: squad.some((p) => contractMonthsLeft(p, state) <= 12),
    lineup: true,
    youth: getIntake(state).length > 0,
    bids: (state.negotiations ?? []).some((n) => n.type === 'incoming' && n.awaiting === 'user'),
  };

  /* --- Escape closes him, like every other overlay in the game ----------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  /* --- The line types itself out ---------------------------------------- */
  const timerRef = useRef<number | null>(null);
  const reduceMotion = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    if (reduceMotion) { setTyped(line); return; }
    setTyped('');
    let i = 0;
    const step = () => {
      i += 1;
      setTyped(line.slice(0, i));
      if (i < line.length) timerRef.current = window.setTimeout(step, 16);
    };
    timerRef.current = window.setTimeout(step, 16);
    return () => { if (timerRef.current) window.clearTimeout(timerRef.current); };
  }, [line, reduceMotion]);

  /* --- Asking him something --------------------------------------------- */
  const ask = (t: AssistantTopic) => {
    sfx.click();
    setIntro(false);
    setTopicId(t.id);
    // Trust rises the first time you ask about a given thing, not every time
    // you click back and forth between two chips.
    if (!asked.has(t.id)) {
      setAsked(new Set(asked).add(t.id));
      onChange(bumpAssistantTrust(state, 1));
    }
  };

  /* --- Handing him a job ------------------------------------------------- */
  const runTask = (task: (typeof TASKS)[number]) => {
    if (taskStates[task.id]) return;
    sfx.click();
    setTaskStates((s) => ({ ...s, [task.id]: 'running' }));

    window.setTimeout(() => {
      const { state: next, report: lines } = task.run(state);
      // Defensive shallow-clone of `inbox` — some delegate helpers (e.g.
      // setLineupAndTactics) only shallow-clone the state they return, so its
      // `inbox` array may still be the same reference as the state we're
      // leaving behind. Mutating that in place via pushInbox would corrupt the
      // previous snapshot too.
      const withReport: GameState = { ...next, inbox: [...next.inbox] };
      pushInbox(withReport, {
        category: task.category,
        title: `${name} handled it: ${task.label}`,
        body: lines.join('\n'),
      });
      onChange(bumpAssistantTrust(withReport, 4));
      setTaskStates((s) => ({ ...s, [task.id]: 'done' }));
      setReport({ title: task.label, lines });
      sfx.notify();
    }, reduceMotion ? 0 : RUN_MS);
  };

  return (
    <div className="fm-assistant-overlay" onClick={onClose}>
      <div
        className="fm-assistant"
        role="dialog"
        aria-modal="true"
        aria-label={assistant ? `${assistant.name}, assistant manager` : 'Assistant Manager'}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="fm-assistant__close" onClick={onClose} aria-label="Close">
          <Icon name="cross" size={16} />
        </button>

        <div className="fm-assistant__body">
          {/* --- Who he is ------------------------------------------------ */}
          <div className="fm-assistant__who">
            <div className="fm-assistant__frame">
              {assistant ? (
                <CoachPortrait coachId={assistant.id} clubColor={club?.color} mood={mood} />
              ) : (
                <span className="fm-assistant__vacant"><Icon name="staff" size={40} /></span>
              )}
            </div>
            <p className="fm-assistant__name">{assistant ? assistant.name : 'No assistant'}</p>
            <p className="fm-assistant__role">
              {assistant ? `Assistant · ${assistant.quality}` : 'Position vacant'}
            </p>

            {assistant && (
              <div className="fm-trust">
                <div className="fm-trust__head">
                  <span>Trust</span>
                  <b>{trust}</b>
                </div>
                <div className="fm-trust__track">
                  <i className="fm-trust__fill" style={{ width: `${trust}%` }} />
                </div>
                <p className="fm-trust__label">{trustLabel(trust)}</p>
              </div>
            )}
          </div>

          {/* --- What he says --------------------------------------------- */}
          <div className="fm-assistant__talk">
            <div className={`fm-bubble${topic?.urgent ? ' fm-bubble--urgent' : ''}`} aria-live="polite">
              &ldquo;{typed}
              {typed.length < line.length && <i className="fm-bubble__caret" aria-hidden="true" />}
              {typed.length >= line.length && '”'}
            </div>

            <div className="fm-asks">
              {topics.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`fm-ask${t.urgent ? ' fm-ask--urgent' : ''}`}
                  aria-pressed={t.id === topicId}
                  onClick={() => ask(t)}
                >
                  <span className="fm-ask__key">{t.urgent ? '!' : t.key}</span>
                  {t.ask}
                </button>
              ))}
              <button
                type="button"
                className="fm-ask"
                onClick={() => { onShowTour(); onClose(); }}
              >
                <span className="fm-ask__key">?</span>
                Show me around
              </button>
            </div>

            {topic?.route && (
              <button
                className="fm-btn fm-btn--primary fm-btn--small fm-assistant__goto"
                onClick={() => { onRoute(topic.route!); onClose(); }}
              >
                Take me there <Icon name="chevron" size={13} />
              </button>
            )}

            {/* --- What he'll do for you --------------------------------- */}
            {assistant && (
              <>
                <p className="fm-label fm-assistant__seclabel">Hand it to him</p>
                <div className="fm-jobs">
                  {TASKS.map((task) => {
                    const st = taskStates[task.id] ?? 'idle';
                    const off = !pending[task.id] && st === 'idle';
                    return (
                      <button
                        key={task.id}
                        type="button"
                        className={`fm-job${st === 'running' ? ' running' : ''}${st === 'done' ? ' done' : ''}`}
                        onClick={() => runTask(task)}
                        disabled={off || st !== 'idle'}
                      >
                        <span className="fm-job__top">
                          <i className="fm-job__led" />
                          <span className="fm-job__label">{task.label}</span>
                        </span>
                        <span className="fm-job__sub">{off ? 'nothing pending' : task.sub}</span>
                        <i className="fm-job__bar" style={{ transitionDuration: `${RUN_MS}ms` }} />
                        <span className="fm-job__stamp"><span>DONE</span></span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {report && (
              <div className="fm-jobreport">
                <p className="fm-jobreport__title">{report.title}</p>
                {report.lines.map((l, i) => <p key={i}>{l}</p>)}
              </div>
            )}

            {assistant && (
              <button
                type="button"
                className="fm-btn fm-btn--ghost fm-btn--small fm-btn--full"
                onClick={() => { onOpenSettings(); onClose(); }}
              >
                Standing instructions →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
