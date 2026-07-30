import Link from "next/link";
import { cn } from "@/lib/utils";

import { AgentPatchMark } from "./agentpatch-mark";

/**
 * AgentPatchWordmark -- the canonical mark + 'AgentPatch' wordmark pair.
 * Used across the Avionics sidebar chrome (dark), /demo, /404, /login
 * (light surfaces).
 *
 * Shape Consistency Lock: pill on hover is not added unless absolutely
 * needed -- wordmark stays calm in chrome.
 *
 * The `tone` prop lets the same component render correctly on the
 * always-dark Avionics sidebar (tone="light") or on the light
 * /demo, /404, /login surfaces (tone="auto" or tone="dark").
 *
 * Note: the prior `text-chrome-fg` token did not exist in globals.css;
 * legacy memory only. Replaced with `text-background` (the light page
 * bg token) for dark-surface legibility.
 */
export function AgentPatchWordmark({
  size = 24,
  href,
  className,
  inverted,
  tone = "auto",
}: {
  size?: number;
  href?: string;
  className?: string;
  /** When true, treat as inverted-on-dark mark (drops the 'text-accent' tint). */
  inverted?: boolean;
  /**
   * Visual tone of the surrounding surface.
   * - "light" -> render label in chrome-fg (warm off-white) for dark surfaces
   * - "dark"  -> force label in foreground for a known light surface
   * - "auto"  -> inherit theme tokens (default; pick if medium-dependent)
   */
  tone?: "auto" | "light" | "dark";
}) {
  const mark = (
    <AgentPatchMark
      size={size}
      className={cn(
        "transition-transform duration-200 ease-out group-hover:scale-[1.06]",
        inverted && "text-foreground",
      )}
    />
  );

  const labelColor =
    tone === "light"
      ? "text-background"
      : tone === "dark"
        ? "text-foreground"
        : "text-foreground";

  const label = (
    <span
      className={cn(
        "font-mono text-sm font-semibold uppercase tracking-[0.18em]",
        labelColor,
      )}
    >
      AgentPatch
    </span>
  );

  if (!href) {
    return (
      <div className={cn("flex items-center gap-2.5 group", className)}>
        {mark}
        {label}
      </div>
    );
  }

  return (
    <Link href={href} className={cn("flex items-center gap-2.5 group", className)}>
      {mark}
      {label}
    </Link>
  );
}
