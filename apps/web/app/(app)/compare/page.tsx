"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { compareRuns, getRuns } from "@/lib/api";
import type { CompareResult, CompareSpanPair, Run } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { CodeBlock } from "@/components/ui/code-block";

function DiffValue({
  left,
  right,
  label,
}: {
  left: unknown;
  right: unknown;
  label: string;
}) {
  const equal = JSON.stringify(left) === JSON.stringify(right);
  return (
    <div className="space-y-2">
      <p className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted">
        {label}
        {!equal && (
          <span className="font-mono text-[10px] text-data-failure">
            different
          </span>
        )}
      </p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <p className="mb-1 font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted">
            Run A
          </p>
          <CodeBlock
            code={left ? JSON.stringify(left, null, 2) : "null"}
            language="json"
          />
        </div>
        <div>
          <p className="mb-1 font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted">
            Run B
          </p>
          <CodeBlock
            code={right ? JSON.stringify(right, null, 2) : "null"}
            language="json"
          />
        </div>
      </div>
    </div>
  );
}

function RetrievedDocDiff({ pair }: { pair: CompareSpanPair }) {
  const leftDocs = pair.left?.retrieved_documents || [];
  const rightDocs = pair.right?.retrieved_documents || [];

  if (leftDocs.length === 0 && rightDocs.length === 0) return null;

  const rightNames = new Set(rightDocs.map((d) => d.source_name));
  const leftNames = new Set(leftDocs.map((d) => d.source_name));

  return (
    <div className="mt-3 space-y-2 rounded-md border border-border bg-background p-3 text-sm">
      <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted">
        Retrieved documents
      </p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-2">
          {leftDocs.map((doc) => {
            const changed = !rightNames.has(doc.source_name);
            return (
              <div
                key={doc.id}
                className={`rounded-md border p-2 text-xs ${
                  changed
                    ? "border-data-failure/30 bg-data-failure-soft"
                    : "border-border bg-surface"
                }`}
              >
                <p className="font-medium">{doc.source_name}</p>
                {doc.score !== undefined && (
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted">
                    Score: {Math.round(doc.score * 100)}%
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <div className="space-y-2">
          {rightDocs.map((doc) => {
            const changed = !leftNames.has(doc.source_name);
            return (
              <div
                key={doc.id}
                className={`rounded-md border p-2 text-xs ${
                  changed
                    ? "border-data-failure/30 bg-data-failure-soft"
                    : "border-border bg-surface"
                }`}
              >
                <p className="font-medium">{doc.source_name}</p>
                {doc.score !== undefined && (
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted">
                    Score: {Math.round(doc.score * 100)}%
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SpanPair({ pair }: { pair: CompareSpanPair }) {
  const hasDivergence =
    pair.divergences.length > 0 && pair.match_state === "both";

  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm transition-[transform,box-shadow] duration-150 ease-out ${
        hasDivergence
          ? "border-data-failure/30 bg-data-failure/15"
          : "border-border bg-surface"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold tracking-tight">
            {pair.left?.name || pair.right?.name || "Span"} ·{" "}
            {pair.left?.span_type || pair.right?.span_type}
          </p>
          <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted">
            Match: {pair.match_state}
          </p>
        </div>
        <div className="flex max-w-md flex-wrap justify-end gap-2">
          {pair.divergences.map((d) => (
            <span
              key={d}
              className="rounded-full bg-data-failure-soft px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-data-failure"
            >
              {d}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-4 font-mono text-xs text-muted md:grid-cols-2">
        <div className="space-y-1">
          <p>Duration: {pair.left?.duration_ms ?? "—"}ms</p>
          <p>Model: {pair.left?.model_name || "—"}</p>
          <p>Temperature: {pair.left?.temperature ?? "—"}</p>
          <p>Tool: {pair.left?.tool_name || "—"}</p>
        </div>
        <div className="space-y-1">
          <p>Duration: {pair.right?.duration_ms ?? "—"}ms</p>
          <p>Model: {pair.right?.model_name || "—"}</p>
          <p>Temperature: {pair.right?.temperature ?? "—"}</p>
          <p>Tool: {pair.right?.tool_name || "—"}</p>
        </div>
      </div>

      <div className="mt-3 space-y-3">
        <DiffValue
          left={pair.left?.input_payload}
          right={pair.right?.input_payload}
          label="Input / prompt"
        />
        <DiffValue
          left={pair.left?.output_payload}
          right={pair.right?.output_payload}
          label="Output"
        />
        <RetrievedDocDiff pair={pair} />
      </div>
    </div>
  );
}

function CompareBanner() {
  return (
    <div className="relative h-[180px] md:h-[220px] overflow-hidden bg-canvas">
      <img
        src="https://picsum.photos/seed/agentpatch-control-room/1200/300"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-surface/60 via-surface/55 to-surface" />
    </div>
  );
}

export default function ComparePage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [left, setLeft] = useState<string>("");
  const [right, setRight] = useState<string>("");
  const [result, setResult] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getRuns().then((data) => {
      if (cancelled) return;
      setRuns(data);
      setInitialLoading(false);

      // Deep-link support: /compare?a=<run_id>&b=<run_id> auto-selects
      // both runs and immediately triggers the comparison so the page
      // lands in the diff state on first paint. Useful for portfolio
      // screenshots and for sharing a specific diff with teammates.
      const params = new URLSearchParams(window.location.search);
      const a = params.get("a");
      const b = params.get("b");
      if (
        a &&
        b &&
        data.some((r) => r.id === a) &&
        data.some((r) => r.id === b)
      ) {
        setLeft(a);
        setRight(b);
        setLoading(true);
        compareRuns(a, b)
          .then((res) => {
            if (!cancelled) setResult(res);
          })
          .catch(() => {
            // Swallow: the form remains usable even if the deep link
            // resolves to a run the backend no longer has.
          })
          .finally(() => {
            if (!cancelled) setLoading(false);
          });
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCompare() {
    if (!left || !right) return;
    setLoading(true);
    try {
      const data = await compareRuns(left, right);
      setResult(data);
    } finally {
      setLoading(false);
    }
  }

  const fieldClass =
    "rounded-md border border-border bg-surface px-3 py-2 text-sm transition-colors duration-150 ease-out focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/40";

  // Wave D: there used to be two stacked `if (initialLoading) return ...`
  // blocks. The second (more-complete) one won; the first skeleton is gone.
  if (initialLoading) {
    return (
      <>
        <CompareBanner />
        <div className="space-y-6 px-8 py-8 md:px-12 md:py-10" aria-hidden>
          <div className="space-y-2">
            <div className="h-7 w-48 rounded bg-surface-soft" />
            <div className="h-4 w-96 max-w-full rounded bg-surface-soft" />
          </div>
          <div className="rounded-2xl border border-border bg-surface/50 h-32" />
          <div className="rounded-2xl border border-border bg-surface/50 h-48" />
        </div>
      </>
    );
  }

  return (
    <>
      <CompareBanner />
      <div className="space-y-6 px-8 py-8 md:px-12 md:py-10">
        <header className="flex items-end justify-between gap-6 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Compare runs
            </h1>
            <p className="mt-2 max-w-[55ch] text-sm text-muted leading-relaxed">
              Select two runs to see where they diverge — input, output,
              retrieval, span sequence, and timing.
            </p>
          </div>
          <Link
            href="/runs"
            className="text-sm font-medium text-accent transition-transform duration-150 ease-out hover:translate-x-0.5 hover:text-accent-hover focus:outline-none focus:ring-2 focus:ring-accent/40 rounded-sm"
          >
            Open runs explorer →
          </Link>
        </header>

        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5 min-w-[200px] flex-1">
              <label
                htmlFor="compare-left"
                className="block font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted"
              >
                Run A
              </label>
              <select
                id="compare-left"
                name="compare-left"
                className={`${fieldClass} w-full`}
                value={left}
                onChange={(e) => setLeft(e.target.value)}
              >
                <option value="">Select run A</option>
                {runs.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.id.slice(0, 8)} — {r.user_query || "no query"}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5 min-w-[200px] flex-1">
              <label
                htmlFor="compare-right"
                className="block font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted"
              >
                Run B
              </label>
              <select
                id="compare-right"
                name="compare-right"
                className={`${fieldClass} w-full`}
                value={right}
                onChange={(e) => setRight(e.target.value)}
              >
                <option value="">Select run B</option>
                {runs.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.id.slice(0, 8)} — {r.user_query || "no query"}
                  </option>
                ))}
              </select>
            </div>
            <Button onClick={handleCompare} disabled={!left || !right || loading}>
              {loading ? "Comparing..." : "Compare"}
            </Button>
          </div>
        </div>

        {result && (
          <div className="space-y-6">
            <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
                <h3 className="text-base font-semibold tracking-tight">Run A</h3>
                <p className="mt-1 font-mono text-xs text-muted">
                  {result.left_run_id}
                </p>
                <div className="mt-3">
                  <StatusBadge status={result.left_status} />
                </div>
                <p className="mt-3 font-mono text-sm tabular-nums text-muted">
                  Duration: {result.left_duration_ms ?? "—"}ms
                </p>
                <p className="font-mono text-sm tabular-nums text-muted">
                  Cost: $
                  {result.left.estimated_cost_usd?.toFixed(4) ?? "—"}
                </p>
                <p className="font-mono text-sm tabular-nums text-muted">
                  Tokens: {result.left.total_tokens ?? "—"}
                </p>
                {result.left.failure_type && (
                  <p className="mt-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-data-failure">
                    Failure: {result.left.failure_type}
                  </p>
                )}
              </div>
              <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
                <h3 className="text-base font-semibold tracking-tight">Run B</h3>
                <p className="mt-1 font-mono text-xs text-muted">
                  {result.right_run_id}
                </p>
                <div className="mt-3">
                  <StatusBadge status={result.right_status} />
                </div>
                <p className="mt-3 font-mono text-sm tabular-nums text-muted">
                  Duration: {result.right_duration_ms ?? "—"}ms
                </p>
                <p className="font-mono text-sm tabular-nums text-muted">
                  Cost: $
                  {result.right.estimated_cost_usd?.toFixed(4) ?? "—"}
                </p>
                <p className="font-mono text-sm tabular-nums text-muted">
                  Tokens: {result.right.total_tokens ?? "—"}
                </p>
                {result.right.failure_type && (
                  <p className="mt-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-data-failure">
                    Failure: {result.right.failure_type}
                  </p>
                )}
              </div>
            </section>

            {result.divergences.length > 0 && (
              <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
                <h3 className="text-base font-semibold tracking-tight">
                  Divergence summary
                </h3>
                <div className="mt-3 space-y-2">
                  {result.divergences.map((d, i) => (
                    <div
                      key={i}
                      className="rounded-md border border-data-failure/30 bg-data-failure-soft p-3 text-sm"
                    >
                      <p className="font-medium text-data-failure">{d.type}</p>
                      <p className="mt-1 text-xs text-data-failure/80">{d.reason}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm space-y-4">
              <h3 className="text-base font-semibold tracking-tight">
                Final output diff
              </h3>
              <DiffValue
                left={result.left.final_output}
                right={result.right.final_output}
                label="Final output"
              />
            </section>

            <section className="space-y-3">
              <h3 className="text-base font-semibold tracking-tight">
                Span comparison
              </h3>
              <div className="space-y-3">
                {result.span_pairs.map((pair, i) => (
                  <SpanPair key={i} pair={pair} />
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </>
  );
}
