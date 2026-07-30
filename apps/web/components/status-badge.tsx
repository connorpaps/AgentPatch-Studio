import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

/**
 * StatusBadge -- colored status pill for run + span rows.
 *
 * Rebound to the calibrated --data-* palette so the visual hue
 * carries the actual state (success=emerald, failure=rose,
 * running=sky, retry/queued=amber), instead of the older Tailwind
 * raw colors that drifted out of sync with the tokens.
 *
 * Three-tier pattern (per globals.css "data-" section):
 *   tag bg     -> bg-data-{name}-soft  (a pastel wash)
 *   tag text   -> text-data-{name}     (mid saturation)
 *   ring halo  -> ring-data-{name}/20  (same hue at 20% for the 1px ring)
 *
 * Cancelled falls back to the stone neutral; unknown statuses use the
 * same fallback so a feed of unexpected strings still reads as calm.
 */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalized = status?.toLowerCase() || "unknown";

  /* Status variants -- rebound to the calibrated --data-* palette.
     Add explicit entries only when a backend lookup confirms a string
     flows through; everything else falls back to the neutral. The
     defensive "ok"/"error" aliases stay since they short-circuit common
     status payloads. */
  const variants: Record<string, string> = {
    success: "bg-data-success-soft text-data-success ring-data-success/20",
    failure: "bg-data-failure-soft text-data-failure ring-data-failure/20",
    error: "bg-data-failure-soft text-data-failure ring-data-failure/20",
    ok: "bg-data-success-soft text-data-success ring-data-success/20",
    running: "bg-data-latency-soft text-data-latency ring-data-latency/20",
    warning: "bg-data-retry-soft text-data-retry ring-data-retry/20",
    cancelled: "bg-surface-soft text-muted ring-border",
    unknown: "bg-surface-soft text-muted ring-border",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1",
        variants[normalized] || variants.unknown,
        className,
      )}
    >
      {status}
    </span>
  );
}
