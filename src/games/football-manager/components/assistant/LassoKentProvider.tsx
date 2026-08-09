'use client';

/**
 * Mount this once, around your app (or around the game screen). It owns the
 * machine, injects the stylesheet, and renders the floating icon + chat.
 *
 * The two props are the whole integration surface:
 *
 *   <LassoKentProvider
 *     snapshot={{ morale: team.morale, fitness: avgFitness, rating: avgRating }}
 *     onEffects={(fx) => applyToMyGameState(fx)}
 *   >
 *     {children}
 *   </LassoKentProvider>
 *
 * Anywhere inside, `const assistant = useAssistant()` gives you
 * `assistant.trigger('lineup', { youngster, veteran })` and the rest.
 */

import { useEffect, type ReactNode } from 'react';
import {
  LassoKentContext,
  useLassoKentMachine,
  type AssistantSnapshot,
  type UseLassoKentOptions,
} from '../../hooks/useLassoKentAssistant';
import { LASSO_KENT_CSS } from './lassoKentStyles';
import LassoKentChat from './LassoKentChat';
import LassoKentFloatingIcon from './LassoKentFloatingIcon';

export interface LassoKentProviderProps extends UseLassoKentOptions {
  children?: ReactNode;
  /** Hide the built-in icon if you'd rather summon them from your own UI. */
  showFloatingIcon?: boolean;
}

export function LassoKentProvider({
  children,
  snapshot,
  onEffects,
  showFloatingIcon = true,
}: LassoKentProviderProps) {
  const api = useLassoKentMachine({ snapshot, onEffects });

  // Inject the keyframes once per document. Cheaper than a CSS module for a
  // self-contained feature, and it keeps the whole thing drop-in.
  useEffect(() => {
    const ID = 'lasso-kent-styles';
    if (document.getElementById(ID)) return;
    const el = document.createElement('style');
    el.id = ID;
    el.textContent = LASSO_KENT_CSS;
    document.head.appendChild(el);
  }, []);

  return (
    <LassoKentContext.Provider value={api}>
      {children}
      {showFloatingIcon && (
        <LassoKentFloatingIcon
          onClick={() => api.setOpen(!api.open)}
          // Pulses whenever something happened behind a closed window — an
          // unanswered question, or an auto-pilot resolution nobody watched
          // (see `unseen` on the machine) — so "do it for me" mode never
          // resolves in total silence.
          attention={!api.open && (api.state === 'QUESTION' || api.unseen)}
          offline={api.royOffline}
        />
      )}
      <LassoKentChat />
    </LassoKentContext.Provider>
  );
}

export type { AssistantSnapshot };
export default LassoKentProvider;
