'use client';

/**
 * The chat window. Reads everything from `useAssistant()` — it holds no
 * state of its own beyond scroll behaviour, so the machine stays the single
 * source of truth and the window can be unmounted/remounted freely.
 *
 * Layout, top to bottom:
 *   [ Ted | Roy | 🤷 Surprise ] toggle + settings cog
 *   avatar stage (big, animated during REACTION)
 *   transcript
 *   choice buttons / SIMULATE
 */

import { useEffect, useRef, useState } from 'react';
import { useAssistant } from '../../hooks/useLassoKentAssistant';
import type { AutoPilot } from '../../hooks/useLassoKentAssistant';
import RoyAvatar from './avatars/RoyAvatar';
import TedAvatar from './avatars/TedAvatar';

/** Roy's swearing arrives pre-bleeped as `F---`; we upgrade it to a proper
 *  cartoon censor bar so it reads as a joke, not as a typo. */
function CensoredText({ text }: { text: string }) {
  const parts = text.split(/(\bF---\w*)/g);
  return (
    <>
      {parts.map((part, i) =>
        /^F---/.test(part) ? (
          <span key={i} className="lk-bleep" aria-label="censored">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

const PANEL_BG = '#161a20';
const PANEL_EDGE = '#2c333d';

export function LassoKentChat() {
  const a = useAssistant();
  const [showSettings, setShowSettings] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  // Always keep the newest line in view.
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [a.messages]);

  if (!a.open) return null;

  const reacting = a.state === 'REACTION';
  const isRoy = a.persona === 'roy';
  const royIsOut = a.royOffline && isRoy;
  const secondsLeft = Math.ceil(a.royOfflineMs / 1000);

  return (
    <div
      className="lk-pop"
      role="dialog"
      aria-label="Assistant manager"
      style={{
        position: 'fixed',
        right: 18,
        bottom: 96,
        zIndex: 95,
        width: 'min(360px, calc(100vw - 36px))',
        maxHeight: 'min(560px, calc(100vh - 130px))',
        display: 'flex',
        flexDirection: 'column',
        background: PANEL_BG,
        border: `2px solid ${PANEL_EDGE}`,
        borderRadius: 18,
        boxShadow: '0 18px 44px rgba(0,0,0,0.55)',
        color: '#e7ecf2',
        fontSize: 14,
        overflow: 'hidden',
      }}
    >
      {/* ── header: persona toggle ─────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: 8,
          borderBottom: `1px solid ${PANEL_EDGE}`,
          background: '#11151a',
        }}
      >
        {(
          [
            { id: 'ted', label: 'Ted Mode' },
            { id: 'roy', label: 'Roy Mode' },
            { id: 'surprise', label: '🤷 Surprise' },
          ] as const
        ).map((opt) => {
          const active = a.mode === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => a.setMode(opt.id)}
              aria-pressed={active}
              style={{
                flex: 1,
                padding: '7px 4px',
                fontSize: 12,
                fontWeight: 700,
                borderRadius: 10,
                border: `1px solid ${active ? '#f5b942' : PANEL_EDGE}`,
                background: active ? '#f5b942' : 'transparent',
                color: active ? '#1a1205' : '#9fb0c2',
                cursor: 'pointer',
              }}
            >
              {opt.label}
            </button>
          );
        })}
        <button
          type="button"
          aria-label="Assistant settings"
          onClick={() => setShowSettings((s) => !s)}
          style={{
            border: `1px solid ${PANEL_EDGE}`,
            background: showSettings ? '#242c36' : 'transparent',
            color: '#9fb0c2',
            borderRadius: 10,
            width: 30,
            height: 30,
            cursor: 'pointer',
          }}
        >
          ⚙
        </button>
        <button
          type="button"
          aria-label="Close assistant"
          onClick={() => a.setOpen(false)}
          style={{
            border: `1px solid ${PANEL_EDGE}`,
            background: 'transparent',
            color: '#9fb0c2',
            borderRadius: 10,
            width: 30,
            height: 30,
            cursor: 'pointer',
          }}
        >
          ✕
        </button>
      </div>

      {/* ── settings: the "do it for you" panel ────────────────────────── */}
      {showSettings && <AutoPilotPanel value={a.autoPilot} onChange={a.setAutoPilot} />}

      {/* ── avatar stage ───────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 10,
          padding: '10px 12px 6px',
          background: isRoy
            ? 'linear-gradient(180deg, #1d2229 0%, #161a20 100%)'
            : 'linear-gradient(180deg, #1b2a33 0%, #161a20 100%)',
        }}
      >
        {isRoy ? (
          <RoyAvatar
            size={92}
            animate={reacting}
            offline={royIsOut}
            expression={reacting ? (lastWasGood(a) ? 'approve' : 'angry') : 'idle'}
          />
        ) : (
          <TedAvatar
            size={92}
            animate={reacting}
            expression={reacting ? (lastWasGood(a) ? 'delighted' : 'encouraging') : 'idle'}
          />
        )}
        <div style={{ paddingBottom: 8 }}>
          <div style={{ fontWeight: 800, letterSpacing: 0.3 }}>{isRoy ? 'Roy Kent' : 'Ted Lasso'}</div>
          <div style={{ fontSize: 11, color: '#8ea0b3' }}>
            {royIsOut ? `At the pub · back in ${secondsLeft}s` : isRoy ? 'Assistant Manager' : 'Head Coach'}
          </div>
          <div style={{ fontSize: 10, color: '#63758a', marginTop: 2 }}>
            {a.state} · ignored: Roy {a.memory.royIgnoredTotal} / Ted {a.memory.tedIgnoredTotal}
          </div>
        </div>
      </div>

      {/* ── transcript ─────────────────────────────────────────────────── */}
      <div
        ref={scroller}
        style={{
          flex: 1,
          minHeight: 96,
          overflowY: 'auto',
          padding: '8px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {a.messages.map((m) => (
          <div
            key={m.id}
            className="lk-msg-in"
            style={{
              alignSelf: m.kind === 'you' ? 'flex-end' : 'flex-start',
              maxWidth: '86%',
              padding: '7px 10px',
              borderRadius: 12,
              lineHeight: 1.35,
              background:
                m.kind === 'you'
                  ? '#2f6fa8'
                  : m.kind === 'system'
                    ? 'transparent'
                    : m.persona === 'roy'
                      ? '#2b3139'
                      : '#25404e',
              color: m.kind === 'system' ? '#7b8b9d' : '#eef3f8',
              fontStyle: m.kind === 'system' ? 'italic' : 'normal',
              fontSize: m.kind === 'system' ? 12 : 14,
              border: m.kind === 'system' ? '1px dashed #333c47' : 'none',
            }}
          >
            <CensoredText text={m.text} />
          </div>
        ))}
      </div>

      {/* ── choices ────────────────────────────────────────────────────── */}
      {a.state === 'QUESTION' && a.scenario && (
        <div style={{ padding: 10, borderTop: `1px solid ${PANEL_EDGE}`, background: '#11151a' }}>
          <div style={{ fontSize: 11, color: '#8ea0b3', marginBottom: 6, fontWeight: 700 }}>
            {a.scenario.title.replace(/\{\{\w+\}\}/g, '').trim() || 'Your call, boss'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {a.choices.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => a.choose(c.id)}
                style={{
                  textAlign: 'left',
                  padding: '9px 11px',
                  borderRadius: 12,
                  border: `1px solid ${PANEL_EDGE}`,
                  background: '#1c222a',
                  color: '#e7ecf2',
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                {c.label}
                <div style={{ fontWeight: 400, fontSize: 11, color: '#8ea0b3', marginTop: 2 }}>{c.hint}</div>
              </button>
            ))}
            {/* The one-tap "you decide" escape hatch. */}
            <button
              type="button"
              onClick={a.simulate}
              style={{
                padding: '9px 11px',
                borderRadius: 12,
                border: '1px solid #f5b942',
                background: 'transparent',
                color: '#f5b942',
                cursor: 'pointer',
                fontWeight: 800,
                fontSize: 12,
              }}
            >
              ⚡ SIMULATE — let {isRoy ? 'Roy' : 'Ted'} decide
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** True when the most recent reaction was a happy one — used to pick the
 *  avatar expression without threading extra state through the machine. */
function lastWasGood(a: ReturnType<typeof useAssistant>): boolean {
  const last = [...a.messages].reverse().find((m) => m.kind === 'say');
  if (!last || !a.scenario) return false;
  const good = [
    ...a.scenario.reactions.good.roy,
    ...a.scenario.reactions.good.ted,
  ];
  return good.includes(last.text);
}

function AutoPilotPanel({
  value,
  onChange,
}: {
  value: AutoPilot;
  onChange(v: AutoPilot): void;
}) {
  const options: { id: AutoPilot; label: string; blurb: string }[] = [
    { id: 'off', label: 'I decide', blurb: 'They advise, you press the buttons.' },
    { id: 'active', label: 'Whoever’s on', blurb: 'The one in the room decides for you.' },
    { id: 'roy', label: 'Always Roy', blurb: 'Bite over biscuits. Every time.' },
    { id: 'ted', label: 'Always Ted', blurb: 'Belief over bite. Every time.' },
  ];
  return (
    <div style={{ padding: 10, borderBottom: `1px solid ${PANEL_EDGE}`, background: '#0e1216' }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: '#f5b942', marginBottom: 6 }}>
        DO IT FOR ME
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {options.map((o) => {
          const active = value === o.id;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onChange(o.id)}
              aria-pressed={active}
              style={{
                textAlign: 'left',
                padding: '7px 9px',
                borderRadius: 10,
                border: `1px solid ${active ? '#f5b942' : PANEL_EDGE}`,
                background: active ? 'rgba(245,185,66,0.12)' : 'transparent',
                color: '#dbe4ee',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {o.label}
              <div style={{ fontWeight: 400, fontSize: 10, color: '#8ea0b3', marginTop: 2 }}>{o.blurb}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default LassoKentChat;
