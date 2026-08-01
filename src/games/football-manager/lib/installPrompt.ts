/**
 * Captures Chrome/Android's `beforeinstallprompt` event at module scope, not
 * inside a component's effect. The event can fire before React even mounts,
 * and it only fires once per page load — a listener attached later (e.g. in
 * FullscreenTip's own effect) could simply miss it, silently losing the one
 * chance to offer a real one-tap install instead of manual instructions.
 * iOS has no equivalent API at all; this only ever fires on Chromium-based
 * mobile browsers.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let listeners: (() => void)[] = [];

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    for (const l of listeners) l();
  });
}

export function getInstallPrompt(): BeforeInstallPromptEvent | null {
  return deferredPrompt;
}

export function onInstallPromptReady(cb: () => void): () => void {
  listeners.push(cb);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}

export async function triggerInstallPrompt(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredPrompt) return 'unavailable';
  const prompt = deferredPrompt;
  deferredPrompt = null;
  await prompt.prompt();
  const { outcome } = await prompt.userChoice;
  return outcome;
}
