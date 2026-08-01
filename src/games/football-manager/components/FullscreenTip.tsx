'use client';

import { useEffect, useState } from 'react';
import { Icon } from './Icon';
import { getInstallPrompt, onInstallPromptReady, triggerInstallPrompt } from '@/lib/installPrompt';

const DISMISSED_KEY = 'gaffa_fullscreen_tip_dismissed';

type Platform = 'ios' | 'android' | null;

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  // iPadOS 13+ reports as a Mac in the UA string — the touch-point check is
  // the standard way to tell it apart from an actual Mac.
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isIOS) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return null;
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS's own (non-standard) way of reporting the same thing.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * A one-time tip pointing mobile players at fullscreen. Desktop and Android
 * already have a working in-page fullscreen button (FootballManagerGame's
 * header) — iOS Safari has no such API at all, so "Add to Home Screen" is
 * the only route there, and without this, nothing on screen tells a player
 * that route exists. Shown once on the main menu; dismissing it (or already
 * being installed) hides it for good via localStorage, not just this
 * session — this is a tip, not a nag.
 */
export default function FullscreenTip() {
  const [platform, setPlatform] = useState<Platform>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY) === '1') return;
    if (isStandalone()) {
      // Already installed — nothing to tell them, and no need to ask again.
      localStorage.setItem(DISMISSED_KEY, '1');
      return;
    }
    const p = detectPlatform();
    if (!p) return; // desktop: the header button is already visible and self-explanatory
    setPlatform(p);
    setVisible(true);
    setCanInstall(!!getInstallPrompt());
    return onInstallPromptReady(() => setCanInstall(true));
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
  };

  const install = async () => {
    const outcome = await triggerInstallPrompt();
    if (outcome !== 'unavailable') dismiss();
  };

  if (!visible || !platform) return null;

  return (
    <div className="fm-fs-tip" role="status">
      <button className="fm-fs-tip__close" onClick={dismiss} aria-label="Dismiss">
        <Icon name="cross" size={13} />
      </button>
      {platform === 'ios' ? (
        <>
          <p className="fm-fs-tip__title">
            <Icon name="share-ios" size={15} /> Play fullscreen
          </p>
          <p className="fm-fs-tip__body">
            Tap <strong>Share</strong>, then <strong>Add to Home Screen</strong> — Safari can&apos;t go
            fullscreen in a regular tab, but an installed Gaffa can.
          </p>
        </>
      ) : canInstall ? (
        <>
          <p className="fm-fs-tip__title">
            <Icon name="expand" size={15} /> Play fullscreen
          </p>
          <p className="fm-fs-tip__body">Add Gaffa to your home screen for the full app-like experience.</p>
          <div className="fm-fs-tip__actions">
            <button className="fm-btn fm-btn--primary fm-btn--small" onClick={install}>
              Add to Home Screen
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="fm-fs-tip__title">
            <Icon name="expand" size={15} /> Play fullscreen
          </p>
          <p className="fm-fs-tip__body">
            Tap the <Icon name="expand" size={11} style={{ display: 'inline', verticalAlign: -1 }} /> icon at
            the top of the screen any time.
          </p>
        </>
      )}
    </div>
  );
}
