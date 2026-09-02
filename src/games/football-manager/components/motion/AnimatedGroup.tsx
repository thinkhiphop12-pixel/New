'use client';

import { motion } from 'motion/react';
import type { ComponentProps } from 'react';
import { riseItem, staggerContainer } from './presets';

/**
 * Container half of the AnimatedGroup pattern from
 * ibelick/motion-primitives: its children play in one after another instead
 * of all landing at once.
 *
 * Deliberately container-only. The library's version wraps every child in a
 * motion element of its own, which would insert a div between
 * `.fm-hub-grid` and the `.fm-mod` cards it lays out — the wrapper would
 * become the grid item and the layout would come apart. Here the real
 * elements carry the variant themselves (`<Reveal>` below, or any
 * `motion.*` with `variants`), so the DOM is exactly what it was.
 *
 * Reduced motion is handled globally by <MotionConfig reducedMotion="user">
 * in FootballManagerGame, which strips transforms from every animation in
 * the tree — no per-component check needed.
 */
export function AnimatedGroup({
  stagger = 0.045,
  ...rest
}: ComponentProps<typeof motion.div> & { stagger?: number }) {
  return (
    <motion.div
      variants={staggerContainer(stagger)}
      initial="hidden"
      animate="visible"
      {...rest}
    />
  );
}

/** A child of AnimatedGroup: rises into place when its turn comes. */
export function Reveal(props: ComponentProps<typeof motion.div>) {
  return <motion.div variants={riseItem} {...props} />;
}
