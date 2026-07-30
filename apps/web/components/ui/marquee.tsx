"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Marquee -- single kinetic typography strip. Per taste-skill Section 5,
 * max ONE per page. Rendered as a Client component (Motion runs here).
 *
 * Items are duplicated to create a seamless loop. Reduced-motion turns the
 * animation off entirely.
 *
 * The skill flags decorative dots by default; we deliberately exclude them.
 * The strip is *pure kinetic typography*, no chip, no dot, no border-bullet.
 */
export function Marquee({
  items,
  duration = 30,
  className,
}: {
  /** Strings to repeat across the roll. */
  items: string[];
  /** Seconds for one full pass. */
  duration?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  // Double the items so the translate loop is seamless.
  const all = [...items, ...items];

  return (
    <div
      className={cn(
        "overflow-hidden border-y border-hairline bg-canvas",
        className,
      )}
      aria-label="recent activity"
    >
      <motion.div
        className="flex whitespace-nowrap px-6 py-3 font-mono text-xs uppercase tracking-[0.22em] text-muted"
        animate={reduce ? undefined : { x: ["0%", "-50%"] }}
        transition={{
          repeat: Infinity,
          ease: "linear",
          duration,
        }}
      >
        {all.map((item, i) => (
          <span key={i} className="px-6">
            {item}
          </span>
        ))}
      </motion.div>
    </div>
  );
}
