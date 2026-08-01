'use client';

import type { CSSProperties } from 'react';

/** Shared line-icon sprite for Gaffa's chrome (rail, dock, card headers).
 *  Replaces the emoji this UI used to lean on — same stroke language as
 *  `docs/ballknw-hub-mockups.html`: 2px stroke, round joins, currentColor,
 *  no fill, so a single accent (--brand, --gold, --red, …) recolors an icon
 *  just by setting `color` on its wrapper. */
export function IconSprite() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <defs>
        <g id="fmi-defaults" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </defs>
      <symbol id="fmi-home" viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M5.5 9.5V20h13V9.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></symbol>
      <symbol id="fmi-inbox" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="2" /><path d="m3.5 7 8.5 6 8.5-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></symbol>
      <symbol id="fmi-squad" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.2" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M3.5 20c.9-3.6 2.9-5.5 5.5-5.5s4.6 1.9 5.5 5.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><circle cx="16.5" cy="9" r="2.4" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M15 14.3c2.3.4 3.8 2 4.5 4.7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></symbol>
      <symbol id="fmi-tactics" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M12 4v16M3 9h18" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="7.5" cy="14.5" r="1.3" fill="currentColor" stroke="none" /><circle cx="16.5" cy="14.5" r="1.3" fill="currentColor" stroke="none" /><circle cx="12" cy="16.5" r="1.3" fill="currentColor" stroke="none" /></symbol>
      <symbol id="fmi-transfers" viewBox="0 0 24 24"><path d="M4 8h13l-3-3M20 16H7l3 3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></symbol>
      <symbol id="fmi-scout" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6" fill="none" stroke="currentColor" strokeWidth="2" /><path d="m20 20-4.5-4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></symbol>
      <symbol id="fmi-table" viewBox="0 0 24 24"><path d="M4 20V4M4 20h16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="m7.5 15 3.5-4 3 2.5L20 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></symbol>
      <symbol id="fmi-fixtures" viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="2" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M3.5 10h17M8 3v4M16 3v4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></symbol>
      <symbol id="fmi-trophy" viewBox="0 0 24 24"><path d="M7 4h10v5a5 5 0 0 1-10 0Z" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M12 14v3M8.5 20h7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></symbol>
      <symbol id="fmi-training" viewBox="0 0 24 24"><path d="M4 12h2M18 12h2M6 12v-3M6 12v3M18 12v-3M18 12v3M8 12h8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></symbol>
      <symbol id="fmi-facilities" viewBox="0 0 24 24"><path d="M4 20V9l5-3 5 3v11M9 20v-6h4v6M14 20V11l6-3v12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></symbol>
      <symbol id="fmi-finances" viewBox="0 0 24 24"><path d="M3 7h15a3 3 0 0 1 3 3v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M3 7V6a2 2 0 0 1 2-2h11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><circle cx="16.5" cy="13.5" r="1.4" fill="currentColor" stroke="none" /></symbol>
      <symbol id="fmi-european" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M3.5 12h17M12 3.5c2.4 2.3 3.6 5.3 3.6 8.5s-1.2 6.2-3.6 8.5c-2.4-2.3-3.6-5.3-3.6-8.5S9.6 5.8 12 3.5Z" fill="none" stroke="currentColor" strokeWidth="2" /></symbol>
      <symbol id="fmi-club" viewBox="0 0 24 24"><path d="M4 20V8l8-4 8 4v12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M9 20v-5h6v5M9 11h.01M15 11h.01M9 14.5h.01M15 14.5h.01" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></symbol>
      <symbol id="fmi-warning" viewBox="0 0 24 24"><path d="M12 4 2.5 20h19Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M12 10v4M12 17.2v.1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></symbol>
      <symbol id="fmi-mic" viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></symbol>
      <symbol id="fmi-play" viewBox="0 0 24 24"><path d="M7 4.5 19 12 7 19.5Z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></symbol>
      <symbol id="fmi-pause" viewBox="0 0 24 24"><rect x="6" y="4.5" width="4.5" height="15" rx="1" fill="currentColor" stroke="none" /><rect x="13.5" y="4.5" width="4.5" height="15" rx="1" fill="currentColor" stroke="none" /></symbol>
      <symbol id="fmi-chevron" viewBox="0 0 24 24"><path d="m9 5 7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></symbol>
      <symbol id="fmi-more" viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none" /></symbol>
      <symbol id="fmi-arrow-up" viewBox="0 0 24 24"><path d="M12 19V5M6 11l6-6 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></symbol>
      <symbol id="fmi-arrow-down" viewBox="0 0 24 24"><path d="M12 5v14M18 13l-6 6-6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></symbol>
      <symbol id="fmi-goal" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M12 6.8 16 10l-1.5 4.7h-5L8 10Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></symbol>
      <symbol id="fmi-stat" viewBox="0 0 24 24"><path d="M5 20V10M12 20V4M19 20v-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></symbol>
      <symbol id="fmi-target" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /></symbol>
      <symbol id="fmi-injury" viewBox="0 0 24 24"><path d="M4.5 11.5 8 8a2.8 2.8 0 0 1 4 0l4 4a2.8 2.8 0 0 1 0 4l-3.5 3.5a2.8 2.8 0 0 1-4 0l-4-4a2.8 2.8 0 0 1 0-4Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M9.5 9.5l5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></symbol>
      <symbol id="fmi-balanced" viewBox="0 0 24 24"><path d="M12 3v15M12 6l-6 3 2 6h8l2-6-6-3ZM4 20h16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></symbol>
      <symbol id="fmi-attack" viewBox="0 0 24 24"><path d="M4 20 15 9M15 9H9M15 9v6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></symbol>
      <symbol id="fmi-defense" viewBox="0 0 24 24"><path d="M12 3 5 6v5c0 5 3 8.5 7 10 4-1.5 7-5 7-10V6Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></symbol>
      <symbol id="fmi-fitness" viewBox="0 0 24 24"><path d="M6.5 12h11M4 9v6M20 9v6M6.5 8v8M17.5 8v8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></symbol>
      <symbol id="fmi-net" viewBox="0 0 24 24"><path d="M4 4h16v9a8 8 0 0 1-16 0Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M4 4l16 9M20 4 4 13M9 4v6.5M15 4v9.5M4 8.5h16" fill="none" stroke="currentColor" strokeWidth="1.3" /></symbol>
      <symbol id="fmi-check" viewBox="0 0 24 24"><path d="m4.5 12.5 5 5L19.5 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></symbol>
      <symbol id="fmi-dash" viewBox="0 0 24 24"><path d="M5 12h14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></symbol>
      <symbol id="fmi-cross" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></symbol>
      <symbol id="fmi-trend" viewBox="0 0 24 24"><path d="m4 16 6-6 4 4 6-8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M15 6h5v5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></symbol>
      <symbol id="fmi-binoculars" viewBox="0 0 24 24"><path d="M7 8v11M17 8v11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><rect x="4" y="12" width="6" height="7" rx="2" fill="none" stroke="currentColor" strokeWidth="2" /><rect x="14" y="12" width="6" height="7" rx="2" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M9.5 8h5l1 4h-7Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></symbol>
      <symbol id="fmi-staff" viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M4.5 20c1.1-4.3 3.6-6.5 7.5-6.5s6.4 2.2 7.5 6.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M9 5.5V4h6v1.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></symbol>
      <symbol id="fmi-card" viewBox="0 0 24 24"><rect x="6" y="3" width="12" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="2" /></symbol>
      <symbol id="fmi-stadium" viewBox="0 0 24 24"><path d="M4 8.5C4 6 7.5 4 12 4s8 2 8 4.5V16c0 2.5-3.5 4.5-8 4.5S4 18.5 4 16Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M4 8.5C4 11 7.5 13 12 13s8-2 8-4.5" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M12 4v9" fill="none" stroke="currentColor" strokeWidth="1.6" /></symbol>
      <symbol id="fmi-document" viewBox="0 0 24 24"><path d="M6 3h9l4 4v14H6Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M15 3v4h4M9 12h6M9 16h6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></symbol>
      <symbol id="fmi-sprout" viewBox="0 0 24 24"><path d="M12 21v-8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M12 13c0-4 -3-6-7-6 0 4 3 6 7 6Zm0-3c0-4 3-7 7-7 0 4.5-3 7-7 7Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></symbol>
      <symbol id="fmi-person" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M4.5 20c1.3-4.6 3.9-7 7.5-7s6.2 2.4 7.5 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></symbol>
      <symbol id="fmi-star" viewBox="0 0 24 24"><path d="m12 3.5 2.6 5.6 6 .7-4.5 4.1 1.2 6-5.3-3-5.3 3 1.2-6-4.5-4.1 6-.7Z" fill="currentColor" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /></symbol>
      <symbol id="fmi-boot" viewBox="0 0 24 24"><path d="M6 3v8.5L3 15v3.5a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2c0-2.8-1.8-4.6-4.5-5.4L11 10.5V3Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M6 7h5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></symbol>
      <symbol id="fmi-medal" viewBox="0 0 24 24"><circle cx="12" cy="15" r="5.5" fill="none" stroke="currentColor" strokeWidth="2" /><path d="m9 3 3 8 3-8M8 3H5l3.5 8M16 3h3l-3.5 8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></symbol>
      <symbol id="fmi-chance" viewBox="0 0 24 24"><path d="M12 3.5 20.5 12 12 20.5 3.5 12Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></symbol>
      <symbol id="fmi-info" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M12 11v5.5M12 7.6v.1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></symbol>
      <symbol id="fmi-sub" viewBox="0 0 24 24"><path d="M4 8h13l-3.5-3.5M20 16H7l3.5 3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></symbol>
      <symbol id="fmi-corner" viewBox="0 0 24 24"><path d="M6 3v18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M6 4h9l-3 3.5L15 11H6Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></symbol>
      <symbol id="fmi-settings" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M12 3.5v2.4M12 18.1v2.4M20.5 12h-2.4M5.9 12H3.5M17.7 6.3l-1.7 1.7M8 16l-1.7 1.7M17.7 17.7 16 16M8 8 6.3 6.3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></symbol>
      <symbol id="fmi-flag" viewBox="0 0 24 24"><path d="M6 3v18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M6 4h12l-2.5 3.5L18 11H6Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></symbol>
      <symbol id="fmi-dice" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" stroke="none" /><circle cx="15.5" cy="8.5" r="1.2" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" /><circle cx="8.5" cy="15.5" r="1.2" fill="currentColor" stroke="none" /><circle cx="15.5" cy="15.5" r="1.2" fill="currentColor" stroke="none" /></symbol>
      <symbol id="fmi-download" viewBox="0 0 24 24"><path d="M12 3v12.5M7 12l5 5 5-5M4.5 20h15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></symbol>
      <symbol id="fmi-palette" viewBox="0 0 24 24"><path d="M12 4a8 8 0 1 0 0 16c1 0 1.8-.8 1.8-1.8 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-1 .8-1.8 1.8-1.8h2a4 4 0 0 0 4-4c0-3.3-4-6-9-6Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><circle cx="7.5" cy="10.5" r="1.1" fill="currentColor" stroke="none" /><circle cx="9.5" cy="7" r="1.1" fill="currentColor" stroke="none" /><circle cx="14.5" cy="7" r="1.1" fill="currentColor" stroke="none" /></symbol>
      <symbol id="fmi-flame" viewBox="0 0 24 24"><path d="M12 3.5c3.2 3 5.4 5.7 5.4 8.6a5.4 5.4 0 0 1-10.8 0c0-1.4.6-2.6 1.4-3.7.1 1 .6 1.7 1.3 1.7.9 0-.2-2 .3-3.6.4-1.3 1.4-2.3 2.4-3Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></symbol>
      <symbol id="fmi-movie" viewBox="0 0 24 24"><path d="M3.5 8h17v11h-17Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="m3.5 8 2-4h3l-2 4M11 8l2-4h3l-2 4M18.5 8l1-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></symbol>
      <symbol id="fmi-money-out" viewBox="0 0 24 24"><circle cx="12" cy="10" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M12 7v6M9.5 9.2c0-1 1-1.7 2.5-1.7s2.3.6 2.3 1.5c0 2.2-4.8.9-4.8 3 0 1 1 1.6 2.5 1.6s2.5-.6 2.5-1.6" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /><path d="M7 19.5 17 21M7 19.5l1.8-3M7 19.5l2 2.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></symbol>
      <symbol id="fmi-money-in" viewBox="0 0 24 24"><circle cx="12" cy="14" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M12 11v6M9.5 13.2c0-1 1-1.7 2.5-1.7s2.3.6 2.3 1.5c0 2.2-4.8.9-4.8 3 0 1 1 1.6 2.5 1.6s2.5-.6 2.5-1.6" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /><path d="M7 6.5 17 5M17 5l-1.8 3M17 5l-2-2.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></symbol>
      <symbol id="fmi-block" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M6.5 6.5l11 11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></symbol>
      <symbol id="fmi-expand" viewBox="0 0 24 24"><path d="M9 3H3v6M15 3h6v6M15 21h6v-6M9 21H3v-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></symbol>
      <symbol id="fmi-collapse" viewBox="0 0 24 24"><path d="M3 9h6V3M21 9h-6V3M21 15h-6v6M3 15h6v6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></symbol>
    </svg>
  );
}

export type IconName =
  | 'home' | 'inbox' | 'squad' | 'tactics' | 'transfers' | 'scout' | 'table'
  | 'fixtures' | 'trophy' | 'training' | 'facilities' | 'finances' | 'european'
  | 'club' | 'warning' | 'mic' | 'play' | 'pause' | 'chevron' | 'more'
  | 'arrow-up' | 'arrow-down' | 'goal' | 'stat' | 'target' | 'injury'
  | 'balanced' | 'attack' | 'defense' | 'fitness'
  | 'net' | 'check' | 'dash' | 'cross' | 'trend' | 'binoculars' | 'staff' | 'card'
  | 'stadium' | 'document' | 'sprout' | 'person' | 'star' | 'boot' | 'medal'
  | 'chance' | 'info' | 'sub' | 'corner'
  | 'settings' | 'flag' | 'dice' | 'download' | 'palette' | 'flame'
  | 'movie' | 'money-out' | 'money-in' | 'block'
  | 'expand' | 'collapse';

export function Icon({
  name,
  size = 18,
  className,
  style,
}: {
  name: IconName;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      className={className}
      style={{ flexShrink: 0, ...style }}
      aria-hidden="true"
      focusable="false"
    >
      <use href={`#fmi-${name}`} />
    </svg>
  );
}
