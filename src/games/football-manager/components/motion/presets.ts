import type { Transition, Variants } from 'motion/react';

/**
 * Shared motion vocabulary for the game, ported from the patterns in
 * ibelick/motion-primitives (AnimatedGroup's preset variants and its
 * spring-based container transition) rather than pulled in as a dependency —
 * the library is a copy-in component set, and only these two shapes are
 * actually used here.
 *
 * One place for the numbers so a Home module, a squad row and a modal all
 * move at the same speed. Anything faster than ~0.25s reads as a glitch on
 * a 60Hz laptop; anything slower gets in the way of a player clicking
 * through fifteen screens a minute.
 */

/** Container: children play in sequence rather than all at once. */
export const staggerContainer = (stagger = 0.045): Variants => ({
  hidden: {},
  visible: { transition: { staggerChildren: stagger } },
});

/** The child variants. `fade` for text-ish rows, `rise` for cards. */
export const fadeItem: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25, ease: 'easeOut' } },
};

export const riseItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', bounce: 0.18, duration: 0.42 },
  },
};

/** Screen swap — the same 6px lift the CSS `.fm-screen-slide` used. */
export const screenSwap: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' } },
};

/** Modal/sheet entrance, matching `.fm-modal-pop`'s overshoot. */
export const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring', bounce: 0.32, duration: 0.3 },
  },
};

/** Reduced-motion fallback: state still changes, nothing travels. */
export const instant: Transition = { duration: 0 };
