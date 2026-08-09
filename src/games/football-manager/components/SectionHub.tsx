'use client';

import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

/**
 * The shared furniture for a group's landing screen (Team → Overview,
 * Market → Overview, Club → Overview, and anything added later).
 *
 * Every group used to open on its heaviest screen — Market dropped you
 * straight into the 850-line Transfers table, Club into an eight-tab strip
 * with no orientation. These four pieces are deliberately the *opposite* of
 * those screens: numbers not sentences, one line per idea, and every block
 * a link to the tab that acts on it. Nothing here owns state or mutates the
 * game; a section hub reads `state`, renders, and routes.
 *
 * Tone is the only styling decision a caller makes. It maps to the same
 * green / gold / red the rest of the UI uses for good / watch / bad, so a
 * player can read a whole section at a glance without reading a word.
 */

export type Tone = 'plain' | 'green' | 'gold' | 'red';

/** Threshold helper so callers stop hand-rolling ternaries. Pass the value
 *  and the two boundaries; below `bad` is red, above `good` is green. */
export function toneFor(value: number, bad: number, good: number): Tone {
  if (value < bad) return 'red';
  if (value < good) return 'gold';
  return 'green';
}

/* ------------------------------------------------------------------ pulse */

export type PulseItem = {
  icon: IconName;
  /** Short — two words at most. It sits under a large number. */
  label: string;
  value: string;
  tone?: Tone;
  /** 0–1. Draws a hairline meter under the value; omit for bare numbers. */
  meter?: number;
};

/** The top strip: three or four big numbers that answer "how are we doing
 *  in this section" before the player reads anything. */
export function Pulse({ items }: { items: PulseItem[] }) {
  return (
    <div className="fm-pulse">
      {items.map((it) => (
        <div key={it.label} className={`fm-pulse__cell fm-tone-${it.tone ?? 'plain'}`}>
          <span className="fm-pulse__icon"><Icon name={it.icon} size={15} /></span>
          <span className="fm-pulse__val">{it.value}</span>
          <span className="fm-pulse__lbl">{it.label}</span>
          {it.meter != null && (
            <span className="fm-pulse__track">
              <span
                className="fm-pulse__fill"
                style={{ width: `${Math.max(0, Math.min(1, it.meter)) * 100}%` }}
              />
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------- attention */

export type TodoItem = {
  icon: IconName;
  /** One line, imperative where possible: "Fix your lineup", not a paragraph. */
  label: string;
  tone?: Tone;
  /** Where the fix lives. The whole row is the button. */
  onGo: () => void;
  /** Verb on the right, e.g. "Pick", "Reply". Defaults to "Open". */
  cta?: string;
};

/** "Needs you" — renders nothing at all when the list is empty, which is the
 *  point: a quiet section should look quiet, not show an empty panel. */
export function Todos({ items }: { items: TodoItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="fm-todos">
      <p className="fm-todos__head">
        <Icon name="warning" size={12} /> Needs you
        <span className="fm-todos__count">{items.length}</span>
      </p>
      {items.map((it) => (
        <button
          key={it.label}
          type="button"
          className={`fm-todo fm-tone-${it.tone ?? 'gold'}`}
          onClick={it.onGo}
        >
          <span className="fm-todo__icon"><Icon name={it.icon} size={14} /></span>
          <span className="fm-todo__label">{it.label}</span>
          <span className="fm-todo__cta">{it.cta ?? 'Open'}</span>
          <Icon name="chevron" size={13} />
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------- jump */

export type JumpItem = {
  icon: IconName;
  label: string;
  /** A live number or two. This is what makes a tile worth looking at
   *  rather than a relabelled tab. */
  value: string;
  badge?: number;
  onGo: () => void;
};

/** The section's own navigation: big thumb-sized tiles for the sibling
 *  screens, each carrying a live figure. Duplicating the sub-tab strip is
 *  deliberate — the strip is a thin row of small text, and on Club it holds
 *  eight entries. This is the version you can actually aim at. */
export function JumpGrid({ items }: { items: JumpItem[] }) {
  return (
    <div className="fm-jumps">
      {items.map((it) => (
        <button key={it.label} type="button" className="fm-jump" onClick={it.onGo}>
          <span className="fm-jump__icon"><Icon name={it.icon} size={18} /></span>
          <span className="fm-jump__label">{it.label}</span>
          <span className="fm-jump__value">{it.value}</span>
          {it.badge != null && it.badge > 0 && (
            <span className="fm-jump__badge">
              {it.badge}
              <span className="fm-u-sr"> needing attention</span>
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ cards */

/** A titled block for the one or two places a section really does need a
 *  list (top earners, latest leads). Header doubles as a link. */
export function HubCard({
  title,
  icon,
  onGo,
  children,
}: {
  title: string;
  icon: IconName;
  onGo?: () => void;
  children: ReactNode;
}) {
  return (
    <section className="fm-hubcard">
      {onGo ? (
        <button type="button" className="fm-hubcard__head" onClick={onGo}>
          <Icon name={icon} size={13} />
          <span>{title}</span>
          <Icon name="chevron" size={13} />
        </button>
      ) : (
        <p className="fm-hubcard__head fm-hubcard__head--static">
          <Icon name={icon} size={13} />
          <span>{title}</span>
        </p>
      )}
      <div className="fm-hubcard__body">{children}</div>
    </section>
  );
}

/** One line inside a HubCard: name on the left, figure on the right. Used
 *  instead of prose everywhere a section wants to say "these five things". */
export function MiniRow({
  left,
  right,
  sub,
  tone = 'plain',
}: {
  left: ReactNode;
  right: ReactNode;
  sub?: string;
  tone?: Tone;
}) {
  return (
    <div className="fm-minirow">
      <span className="fm-minirow__main">
        <span className="fm-minirow__left">{left}</span>
        {sub && <span className="fm-minirow__sub">{sub}</span>}
      </span>
      <span className={`fm-minirow__right fm-tone-${tone}`}>{right}</span>
    </div>
  );
}

/** Empty state that reads as a nudge rather than a dead end. */
export function Empty({ text }: { text: string }) {
  return <p className="fm-hubcard__empty">{text}</p>;
}
