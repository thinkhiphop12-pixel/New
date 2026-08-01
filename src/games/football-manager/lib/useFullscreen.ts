import { useCallback, useEffect, useState } from 'react';

/**
 * Wraps the Fullscreen API. Not supported at all in an iOS Safari browser
 * tab (only once the page is installed to the home screen, where the web
 * manifest's `display: standalone` already achieves fullscreen without
 * this) — `supported` reflects that so callers can hide the toggle rather
 * than show one that silently does nothing.
 */
export function useFullscreen() {
  const [supported, setSupported] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    setSupported(!!document.fullscreenEnabled);
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    onChange();
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggle = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }, []);

  return { supported, isFullscreen, toggle };
}
