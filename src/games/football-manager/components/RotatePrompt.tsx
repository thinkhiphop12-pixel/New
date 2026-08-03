'use client';

import { useEffect, useState } from 'react';

/**
 * Displays a full-screen rotate prompt when the match screen is viewed in
 * portrait orientation on mobile devices. Uses window.matchMedia to listen
 * for orientation changes (iOS 14+ and Android). The user can dismiss and
 * play in portrait anyway; the flag persists for the session via sessionStorage.
 */
export function RotatePrompt() {
  const [isPortrait, setIsPortrait] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);

    // Check sessionStorage to see if the user dismissed this before
    const wasDismissed = sessionStorage.getItem('rotate-prompt-dismissed') === 'true';
    setDismissed(wasDismissed);

    // Listen for orientation changes
    if (typeof window !== 'undefined' && window.matchMedia) {
      const portraitQuery = window.matchMedia('(orientation: portrait)');

      // Set initial state
      setIsPortrait(portraitQuery.matches);

      // Create listener
      const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
        setIsPortrait(e.matches);
      };

      // Modern listener API (iOS 14+, Android)
      portraitQuery.addEventListener('change', handleChange);

      return () => portraitQuery.removeEventListener('change', handleChange);
    }
  }, []);

  // Don't render until client-side (SSR safety for static export)
  if (!isClient || !isPortrait || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    sessionStorage.setItem('rotate-prompt-dismissed', 'true');
    setDismissed(true);
  };

  // Respect prefers-reduced-motion for the icon animation
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div className="fm-rotate-overlay">
      <div className="fm-rotate-panel">
        <div
          className="fm-rotate-icon"
          style={{
            animation: prefersReducedMotion ? 'none' : 'fm-rotate-pulse 2s ease-in-out infinite',
          }}
        >
          📱
        </div>
        <h2 className="fm-rotate-title">Rotate Your Device</h2>
        <p className="fm-rotate-text">
          The match view works best in landscape orientation for the full pitch and tactics bar.
        </p>
        <button className="fm-btn fm-btn--primary" disabled>
          Rotate to Play
        </button>
        <button className="fm-btn fm-btn--ghost" onClick={handleDismiss}>
          Play in Portrait Anyway
        </button>
      </div>
    </div>
  );
}
