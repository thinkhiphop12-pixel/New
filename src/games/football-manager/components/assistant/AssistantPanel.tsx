'use client';

import { useState } from 'react';
import type { GameState, InboxCategory } from '@/engine/types';
import { getAssistant } from '@/engine/assistant';
import { getSquad } from '@/engine/teamManagement';
import { contractMonthsLeft } from '@/engine/negotiation';
import { getIntake } from '@/engine/youthAcademy';
import { pushInbox } from '@/engine/inbox';
import { sfx } from '@/lib/sound';
import { Icon } from '../Icon';
import type { ScreenId } from '../hubNav';
import { assistantTips } from './tips';
import {
  answerIncomingBids, renewExpiringContracts, setLineupAndTactics, sortYouthIntake, type DelegateResult,
} from './delegate';

type TaskId = 'renew' | 'lineup' | 'youth' | 'bids';

const TASKS: { id: TaskId; label: string; category: InboxCategory; run: (s: GameState) => DelegateResult }[] = [
  { id: 'renew', label: 'Renew expiring contracts', category: 'contract', run: renewExpiringContracts },
  { id: 'lineup', label: 'Set my lineup & tactics', category: 'club', run: setLineupAndTactics },
  { id: 'youth', label: 'Sort youth intake', category: 'youth', run: sortYouthIntake },
  { id: 'bids', label: 'Answer incoming bids', category: 'transfer', run: answerIncomingBids },
];

export default function AssistantPanel({
  state,
  route,
  onClose,
  onRoute,
  onChange,
  onShowTour,
  onOpenSettings,
}: {
  state: GameState;
  route: ScreenId;
  onClose: () => void;
  onRoute: (id: ScreenId) => void;
  onChange: (next: GameState) => void;
  onShowTour: () => void;
  onOpenSettings: () => void;
}) {
  const [result, setResult] = useState<{ title: string; lines: string[] } | null>(null);
  const assistant = getAssistant(state);
  const name = assistant?.name ?? 'Your assistant';
  const tips = assistantTips(state, route);

  const squad = getSquad(state, state.userClubId);
  const pending: Record<TaskId, boolean> = {
    renew: squad.some((p) => contractMonthsLeft(p, state) <= 12),
    lineup: true,
    youth: getIntake(state).length > 0,
    bids: (state.negotiations ?? []).some((n) => n.type === 'incoming' && n.awaiting === 'user'),
  };

  const runTask = (task: (typeof TASKS)[number]) => {
    const { state: next, report } = task.run(state);
    // Defensive shallow-clone of `inbox` — some delegate helpers (e.g.
    // setLineupAndTactics) only shallow-clone the state they return, so
    // its `inbox` array may still be the same reference as the state
    // we're leaving behind. Mutating that in place via pushInbox would
    // corrupt the previous snapshot too.
    const withReport: GameState = { ...next, inbox: [...next.inbox] };
    pushInbox(withReport, {
      category: task.category,
      title: `${name} handled it: ${task.label}`,
      body: report.join('\n'),
    });
    onChange(withReport);
    setResult({ title: task.label, lines: report });
    sfx.notify();
  };

  return (
    <div className="fm-settings-overlay" onClick={onClose}>
      <div className="fm-settings-panel" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="fm-settings-header">
          <h2>{assistant ? assistant.name : 'Assistant Manager'}</h2>
          <button className="fm-settings-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>
        <div className="fm-settings-body">
          <div className="fm-setgroup">
            <p className="fm-setgroup__title">What now?</p>
            {tips.map((tip, i) => (
              <div key={i} className="fm-settings-row">
                <div className="fm-settings-row__head">
                  <div>
                    <div className="fm-settings-desc" style={{ textAlign: 'left' }}>&ldquo;{tip.text}&rdquo;</div>
                  </div>
                </div>
                {tip.route && (
                  <button
                    className="fm-btn fm-btn--ghost fm-btn--small"
                    onClick={() => {
                      onRoute(tip.route!);
                      onClose();
                    }}
                  >
                    Take me there
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="fm-setgroup">
            <p className="fm-setgroup__title">Guide</p>
            <button
              type="button"
              className="fm-btn fm-btn--secondary fm-btn--full"
              onClick={() => {
                onShowTour();
                onClose();
              }}
            >
              <Icon name="info" size={14} /> Show me around
            </button>
          </div>

          <div className="fm-setgroup">
            <p className="fm-setgroup__title">Handle it for me</p>
            {TASKS.map((task) => (
              <button
                key={task.id}
                type="button"
                className="fm-menurow"
                onClick={() => runTask(task)}
                disabled={!pending[task.id]}
              >
                <span className="fm-menurow__main">
                  <span className="fm-menurow__label">{task.label}</span>
                  {!pending[task.id] && <span className="fm-menurow__value">(nothing pending)</span>}
                </span>
              </button>
            ))}

            {result && (
              <div className="fm-panel" style={{ marginTop: 10 }}>
                <p className="fm-label" style={{ margin: '0 0 6px' }}>{result.title}</p>
                {result.lines.map((line, i) => (
                  <p key={i} className="fm-hint" style={{ textAlign: 'left', margin: '2px 0' }}>{line}</p>
                ))}
              </div>
            )}
          </div>

          <div className="fm-setgroup">
            <button
              type="button"
              className="fm-btn fm-btn--ghost fm-btn--full"
              onClick={() => {
                onOpenSettings();
                onClose();
              }}
            >
              Standing instructions →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
