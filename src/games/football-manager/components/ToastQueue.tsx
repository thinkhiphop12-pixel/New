'use client';

/**
 * A minimal toast queue (gap 79). Deliberately a module-level pub/sub rather
 * than React context — toasts are ephemeral UI feedback, not game state, and
 * don't belong in `GameState` (which gets serialized/compressed into every
 * save). Any component can call `pushToast` without needing a provider
 * wrapped around it; `<ToastHost />` is mounted once at the app root and
 * renders whatever's currently queued.
 */
import { useEffect, useState } from 'react';

export type ToastKind = 'info' | 'success' | 'error';

export interface ToastMsg {
  id: number;
  text: string;
  kind: ToastKind;
}

let seq = 0;
let listeners: ((t: ToastMsg) => void)[] = [];

export function pushToast(text: string, kind: ToastKind = 'info'): void {
  const msg: ToastMsg = { id: ++seq, text, kind };
  for (const l of listeners) l(msg);
}

const AUTO_DISMISS_MS = 4000;

export function ToastHost() {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  useEffect(() => {
    const onMsg = (t: ToastMsg) => {
      setToasts((cur) => [...cur, t]);
      setTimeout(() => setToasts((cur) => cur.filter((x) => x.id !== t.id)), AUTO_DISMISS_MS);
    };
    listeners.push(onMsg);
    return () => {
      listeners = listeners.filter((l) => l !== onMsg);
    };
  }, []);

  if (!toasts.length) return null;

  return (
    <div className="fm-toast-stack" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`fm-toast fm-toast--${t.kind}`} onClick={() => setToasts((cur) => cur.filter((x) => x.id !== t.id))}>
          {t.text}
        </div>
      ))}
    </div>
  );
}
