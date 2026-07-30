"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

interface CountUpProps {
  value: number;
  /** Animation duration in seconds. Default 0.6s. */
  duration?: number;
  /** Optional formatter. Receives the animated numeric value; returns string. */
  format?: (n: number) => string;
  className?: string;
}

/**
 * CountUp -- RAF-driven number ticker. Designed for KPI values on the
 * dashboard hero tile.
 *
 * Reduced-motion => render the final value immediately so the SSR /
 * first-paint layout never shows an incorrect partial number. The
 * motion gate is at the consumer (useReducedMotion) so we don't have
 * to re-check prefers-reduced-motion here.
 *
 * Cubic ease-out: 1 - (1-t)^3. Feels confident without bounce. Duration
 * deliberately short (default 0.6s) so the KPI "lands" quickly and the
 * user can read it -- longer than 1s reads as laggy on real-time data.
 */
export function CountUp({ value, duration = 0.6, format, className }: CountUpProps) {
  const reduce = useReducedMotion();
  // Seed the animated count: reduced motion jumps straight to the final
  // value so the very first frame already shows the correct number; the
  // animated path starts from 0 and ticks toward `value` inside the effect.
  // Lazy initializer avoids ever calling setState synchronously inside the
  // effect body (cascading-render lint rule).
  const [display, setDisplay] = useState(() => (reduce ? value : 0));

  useEffect(() => {
    if (reduce) return;
    let rafId = 0;
    const start = performance.now();

    function step(now: number) {
      const elapsed = now - start;
      const t = Math.min(elapsed / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(value * eased));
      if (t < 1) rafId = requestAnimationFrame(step);
    }

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [value, duration, reduce]);

  const rendered = format ? format(display) : display.toString();
  return <span className={cn("tabular-nums", className)}>{rendered}</span>;
}
