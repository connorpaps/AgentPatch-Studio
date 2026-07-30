"use client";

import { useMemo, useState } from "react";
import { Cpu } from "lucide-react";
import type { Run, Span } from "@/lib/types";
import { cn } from "@/lib/utils";
import { RunInspector } from "./run-inspector";
import { SpanRow } from "./span-row";

function buildTree(spans: Span[]) {
  const byParent: Record<string, Span[]> = {};
  const roots: Span[] = [];

  spans.forEach((span) => {
    if (span.parent_span_id) {
      byParent[span.parent_span_id] = byParent[span.parent_span_id] || [];
      byParent[span.parent_span_id].push(span);
    } else {
      roots.push(span);
    }
  });

  return { roots, byParent };
}

/**
 * SpanTimeline -- the surgical-lightbox's centerpiece. Two-pane layout
 * (timeline left, inspector right). Per Shape Consistency Lock: container
 * is rounded-2xl, not a pill or input radius. Per Tonal Depth Over
 * Shadows: the inspector pane sits on surface-soft so the two panes
 * read as one tool without shadow stacking.
 */
export function SpanTimeline({ run }: { run: Run }) {
  const [selected, setSelected] = useState<string | null>(null);
  const spans = useMemo(() => run.spans || [], [run.spans]);
  const { roots, byParent } = useMemo(() => buildTree(spans), [spans]);

  const selectedSpan = useMemo(() => {
    if (selected === null) return undefined;
    return spans.find((s) => s.id === selected);
  }, [spans, selected]);

  const runStartMs = useMemo(() => {
    if (spans.length === 0) return new Date(run.started_at).getTime();
    return Math.min(...spans.map((s) => new Date(s.started_at).getTime()));
  }, [spans, run.started_at]);

  const runEndMs = useMemo(() => {
    if (spans.length === 0) return new Date(run.started_at).getTime();
    return Math.max(
      ...spans.map((s) => {
        const start = new Date(s.started_at).getTime();
        return s.ended_at ? new Date(s.ended_at).getTime() : start + (s.duration_ms || 0);
      })
    );
  }, [spans, run.started_at]);

  const runDurationMs = Math.max(runEndMs - runStartMs, 1);

  function renderSpan(span: Span, depth: number) {
    const children = byParent[span.id] || [];
    const hasChildren = children.length > 0;

    return (
      <div key={span.id}>
        <SpanRow
          span={span}
          depth={depth}
          selected={selected === span.id}
          onClick={() => setSelected(span.id)}
          runDurationMs={runDurationMs}
          runStartMs={runStartMs}
          hasChildren={hasChildren}
        />
        {hasChildren && (
          <div>{children.map((child) => renderSpan(child, depth + 1))}</div>
        )}
      </div>
    );
  }

  const totalTokens = spans.reduce(
    (sum, s) => sum + (s.input_tokens || 0) + (s.output_tokens || 0),
    0,
  );

  return (
    <div className="grid h-full grid-cols-1 lg:grid-cols-3 overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <div className="lg:col-span-2 overflow-auto">
        <div className="sticky top-0 z-10 border-b border-border bg-surface-soft/95 px-5 py-3 backdrop-blur-sm">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted">
            Trace timeline
          </p>
        </div>

        <button
          onClick={() => setSelected(null)}
          className={cn(
            "w-full border-b border-border text-left outline-none transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset",
            selected === null ? "bg-accent-subtle/60" : "hover:bg-surface-soft",
          )}
        >
          <div className="flex items-center gap-3 px-5 py-3">
            <Cpu className="h-4 w-4 shrink-0 text-accent" aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">Run overview</div>
              <div className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted">
                {spans.length} span{spans.length !== 1 ? "s" : ""} · {totalTokens} tok
              </div>
            </div>
            <div className="shrink-0 font-mono text-xs tabular-nums text-muted">
              {run.duration_ms ? `${run.duration_ms}ms` : "—"}
            </div>
          </div>
        </button>

        {roots.length === 0 && (
          <div className="p-8 text-sm text-muted">
            No spans recorded for this run.
          </div>
        )}
        {roots.map((span) => renderSpan(span, 0))}
      </div>
      <div className="min-h-[300px] overflow-auto bg-surface-soft/40">
        <RunInspector span={selectedSpan} run={run} />
      </div>
    </div>
  );
}