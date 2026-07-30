"use client";

import {
  ChevronRight,
  Cpu,
  FileSearch,
  MessageSquare,
  Terminal,
} from "lucide-react";
import type { Span } from "@/lib/types";
import { cn } from "@/lib/utils";
import { StatusBadge } from "./status-badge";

const typeIcons: Record<string, typeof Cpu> = {
  model_call: MessageSquare,
  tool_call: Terminal,
  retrieval: FileSearch,
  chain: Cpu,
  guardrail: Cpu,
  output: MessageSquare,
  human_review: MessageSquare,
};

interface SpanRowProps {
  span: Span;
  depth?: number;
  selected: boolean;
  onClick: () => void;
  runDurationMs?: number;
  runStartMs?: number;
  hasChildren?: boolean;
  /** Total tokens across the run, used to weight the secondary token bar. */
  runTotalTokens?: number;
}

/**
 * SpanRow -- one row in the parent/child trace tree.
 *
 * Light/modern baseline:
 *   - Latency bar is a 2-layer fade (accent-subtle wash + saturated
 *     accent). The saturated layer swaps to the data-failure hue when
 *     a span is critical, and there is no Avionics halo anywhere.
 *   - Selection adds a 1px accent inset ring inside the bar track;
 *     the row bg is the teal wash. StatusBadge carries the per-status
 *     red/green/sky/amber colour via the new --data-* palette.
 *
 * Authoritative signal: span.status === "error". The share-of-run
 * heuristic is gated by a 1s duration floor so short runs do not
 * mass-flag red on trivial spans.
 */
export function SpanRow({
  span,
  depth = 0,
  selected,
  onClick,
  runDurationMs = 0,
  runStartMs = 0,
  hasChildren = false,
  runTotalTokens = 0,
}: SpanRowProps) {
  const Icon = typeIcons[span.span_type] || Cpu;

  const spanStart = new Date(span.started_at).getTime();
  const spanEnd = span.ended_at
    ? new Date(span.ended_at).getTime()
    : spanStart + (span.duration_ms || 0);
  const duration = spanEnd - spanStart;

  const barLeft =
    runDurationMs > 0 ? ((spanStart - runStartMs) / runDurationMs) * 100 : 0;
  const barWidth = runDurationMs > 0 ? (duration / runDurationMs) * 100 : 0;

  const totalTokens = (span.input_tokens || 0) + (span.output_tokens || 0);
  const tokenShare =
    runTotalTokens > 0
      ? Math.min((totalTokens / runTotalTokens) * 100, 100)
      : 0;

  const shareOfRun =
    runDurationMs > 0 ? (duration / runDurationMs) * 100 : 0;
  const isCritical =
    span.status === "error" || (shareOfRun > 50 && duration > 1000);

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative w-full border-b border-border text-left transition-colors duration-150 ease-out outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset",
        selected ? "bg-accent-subtle/60" : "hover:bg-surface-soft",
      )}
      aria-current={selected ? "true" : undefined}
    >
      <div
        className="flex items-center gap-3 px-5 py-3 transition-[padding] duration-150 ease-out"
        style={{ paddingLeft: 16 + depth * 28 }}
      >
        <span
          className={cn(
            "flex h-4 w-4 items-center justify-center text-muted transition-transform duration-150",
            hasChildren && selected && "rotate-90",
          )}
        >
          {hasChildren ? <ChevronRight className="h-4 w-4" /> : null}
        </span>
        <Icon className="h-4 w-4 shrink-0 text-accent" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="truncate text-sm font-medium">{span.name}</span>
            <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted">
              {span.span_type}
            </span>
            {span.model_name && (
              <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted">
                · {span.model_name}
              </span>
            )}
            {span.tool_name && (
              <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted">
                · {span.tool_name}
              </span>
            )}
          </div>
          <div
            className={cn(
              "relative mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-soft",
              selected && "shadow-[inset_0_0_0_1px_var(--accent)]",
            )}
            aria-hidden
          >
            <div
              className="absolute top-0 h-1.5 rounded-full bg-accent-subtle transition-[width,left] duration-300 ease-out"
              style={{
                left: `${barLeft}%`,
                width: `${Math.max(barWidth, 1)}%`,
              }}
            />
            <div
              className={cn(
                "absolute top-0 h-1.5 rounded-full transition-[width,left,background-color] duration-300 ease-out",
                isCritical ? "bg-data-failure" : "bg-accent",
              )}
              style={{
                left: `${barLeft}%`,
                width: `${Math.max(barWidth * (0.6 + tokenShare / 200), 1)}%`,
              }}
            />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3 font-mono text-xs tabular-nums text-muted">
          <span>{span.duration_ms ? `${span.duration_ms}ms` : "—"}</span>
          {totalTokens > 0 && (
            <span className="rounded bg-surface-soft px-1.5 py-0.5">
              {totalTokens} tok
            </span>
          )}
          <StatusBadge status={span.status} />
        </div>
      </div>
    </button>
  );
}
