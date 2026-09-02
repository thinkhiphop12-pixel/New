'use client';

import type { ReactNode } from 'react';

/**
 * The title block every hub screen opens with: what this screen is, and one
 * plain sentence saying what you do here.
 *
 * The game had no such thing. A screen started at its first module, whose
 * heading was an 11px all-caps label — so Training, Transfers and Squad all
 * began the same way, with no statement of where you are or what the screen
 * is for, and the eye landed on whatever module happened to be first.
 *
 * `aside` is for the one number or control that belongs beside the title
 * rather than inside the screen (squad fatigue, the transfer kitty).
 */
export default function ScreenHead({
  title,
  sub,
  aside,
}: {
  title: string;
  sub?: string;
  aside?: ReactNode;
}) {
  return (
    <header className="fm-screenhead">
      <div className="fm-screenhead__text">
        <h2 className="fm-screenhead__title">{title}</h2>
        {sub && <p className="fm-screenhead__sub">{sub}</p>}
      </div>
      {aside && <div className="fm-screenhead__aside">{aside}</div>}
    </header>
  );
}
