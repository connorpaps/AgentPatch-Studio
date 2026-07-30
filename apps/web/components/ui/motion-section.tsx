"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";

interface MotionSectionProps {
  children: React.ReactNode;
  className?: string;
  /** Distance in px the section travels during its fade-up. Default 8. */
  distance?: number;
}

/**
 * MotionSection -- a "use client" wrapper that renders a <section>
 * whose content fades up from a small offset on mount.
 *
 * Each MotionSection is independent (no parent-stagger coupling) so
 * each surface can be used standalone without coordinating with a
 * parent variant -- a deliberate choice over the welcome-hero's
 * parent-variant pattern because the dashboard has heterogeneous
 * section sizes and we don't want one slow section to delay the
 * others' reveal.
 *
 * Reduced-motion gate: prefers-reduced-motion users see content
 * instantly. `[0.16, 1, 0.3, 1]` is the welcome-hero cadence -- a
 * confident ease-out without bounce.
 */
export function MotionSection({ children, className, distance = 8 }: MotionSectionProps) {
  const reduce = useReducedMotion();

  const variants: Variants = {
    hidden: { opacity: 0, y: distance },
    show: {
      opacity: 1,
      y: 0,
      transition: reduce ? { duration: 0 } : { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
    },
  };

  return (
    <motion.section
      initial={reduce ? false : "hidden"}
      animate="show"
      variants={variants}
      className={className}
    >
      {children}
    </motion.section>
  );
}
