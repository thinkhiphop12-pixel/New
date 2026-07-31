'use client';

import type { MatchEvent } from '@/engine/types';
import { Icon, type IconName } from './Icon';

const ICONS: Record<MatchEvent['type'], IconName> = {
  goal: 'goal',
  chance: 'chance',
  card: 'card',
  injury: 'injury',
  info: 'info',
};

export default function MatchHighlights({ events }: { events: MatchEvent[] }) {
  if (!events.length) return null;
  return (
    <div className="fm-panel fm-highlights">
      <p className="fm-label" style={{ marginTop: 0 }}>
        Match highlights
      </p>
      <ul className="fm-highlights__list">
        {events.map((e, i) => (
          <li key={i} className={`fm-highlights__item fm-highlights__item--${e.type}`}>
            <span className="fm-highlights__icon"><Icon name={ICONS[e.type]} size={15} /></span>
            <span className="min">{e.minute}&apos;</span>
            <span>{e.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
