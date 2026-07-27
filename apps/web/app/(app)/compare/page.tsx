"use client";

import { useEffect, useState } from "react";
import { compareRuns, getRuns } from "@/lib/api";
import type { CompareResult, CompareSpanPair, Run } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";

function CodeBlock({ data }: { data: unknown }) {
  return (
    <pre className="rounded-md border border-border bg-surface p-3 text-xs font-mono overflow-auto">
      {data ? JSON.stringify(data, null, 2) : "null"}
    </pre>
  );
}

function DiffValue({ left, right, label }: { left: unknown; right: unknown; label: string }) {
  const equal = JSON.stringify(left) === JSON.stringify(right);
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted flex items-center gap-2">
        {label}
        {!equal && <span className="text-red-600 text-[10px]">different</span>}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-muted mb-1">Run A</p>
          <CodeBlock data={left} />
        </div>
        <div>
          <p className="text-xs text-muted mb-1">Run B</p>
          <CodeBlock data={right} />
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
    <div className="mt-3 rounded-md border border-border bg-background p-3 text-sm space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Retrieved Documents</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-2">
          {leftDocs.map((doc) => {
            const changed = !rightNames.has(doc.source_name);
            return (
              <div
                key={doc.id}
                className={`rounded border p-2 text-xs ${
                  changed ? "border-red-300 bg-red-50" : "border-border"
                }`}
              >
                <p className="font-medium">{doc.source_name}</p>
                {doc.score !== undefined && <p className="text-muted">Score: {Math.round(doc.score * 100)}%</p>}
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
                className={`rounded border p-2 text-xs ${
                  changed ? "border-red-300 bg-red-50" : "border-border"
                }`}
              >
                <p className="font-medium">{doc.source_name}</p>
                {doc.score !== undefined && <p className="text-muted">Score: {Math.round(doc.score * 100)}%</p>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SpanPair({ pair }: { pair: CompareSpanPair }) {
  const hasDivergence = pair.divergences.length > 0 && pair.match_state === "both";

  return (
    <div
      className={`rounded-lg border ${
        hasDivergence ? "border-red-200 bg-red-50/30" : "border-border bg-surface"
      } p-4`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">
            {pair.left?.name || pair.right?.name || "Span"} · {pair.left?.span_type || pair.right?.span_type}
          </p>
          <p className="text-xs text-muted mt-1">Match: {pair.match_state}</p>
        </div>
        <div className="flex flex-wrap gap-2 justify-end max-w-md">
          {pair.divergences.map((d) => (
            <span
              key={d}
              className="text-xs rounded-full px-2 py-0.5 bg-red-100 text-red-700"
            >
              {d}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 text-xs text-muted">
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
        <DiffValue left={pair.left?.input_payload} right={pair.right?.input_payload} label="Input / Prompt" />
        <DiffValue left={pair.left?.output_payload} right={pair.right?.output_payload} label="Output" />
        <RetrievedDocDiff pair={pair} />
      </div>
    </div>
  );
}

export default function ComparePage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [left, setLeft] = useState<string>("");
  const [right, setRight] = useState<string>("");
  const [result, setResult] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getRuns().then((data) => {
      if (cancelled) return;
      setRuns(data);

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
    const data = await compareRuns(left, right);
    setResult(data);
    setLoading(false);
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Compare runs</h1>
        <p className="text-sm text-muted mt-1">Select two runs to see where they diverge</p>
      </div>

      <div className="flex items-end gap-4">
        <select
          id="compare-left"
          name="compare-left"
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
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
        <select
          id="compare-right"
          name="compare-right"
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
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
        <Button onClick={handleCompare} disabled={!left || !right || loading}>
          {loading ? "Comparing..." : "Compare"}
        </Button>
      </div>

      {result && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-lg border border-border bg-surface p-5">
              <h3 className="text-sm font-semibold">Run A</h3>
              <p className="text-xs text-muted mt-1 font-mono">{result.left_run_id}</p>
              <div className="mt-3">
                <StatusBadge status={result.left_status} />
              </div>
              <p className="mt-3 text-sm">Duration: {result.left_duration_ms ?? "—"}ms</p>
              <p className="text-sm">Cost: ${result.left.estimated_cost_usd?.toFixed(4) ?? "—"}</p>
              <p className="text-sm">Tokens: {result.left.total_tokens ?? "—"}</p>
              {result.left.failure_type && (
                <p className="text-sm text-red-600">Failure: {result.left.failure_type}</p>
              )}
            </div>
            <div className="rounded-lg border border-border bg-surface p-5">
              <h3 className="text-sm font-semibold">Run B</h3>
              <p className="text-xs text-muted mt-1 font-mono">{result.right_run_id}</p>
              <div className="mt-3">
                <StatusBadge status={result.right_status} />
              </div>
              <p className="mt-3 text-sm">Duration: {result.right_duration_ms ?? "—"}ms</p>
              <p className="text-sm">Cost: ${result.right.estimated_cost_usd?.toFixed(4) ?? "—"}</p>
              <p className="text-sm">Tokens: {result.right.total_tokens ?? "—"}</p>
              {result.right.failure_type && (
                <p className="text-sm text-red-600">Failure: {result.right.failure_type}</p>
              )}
            </div>
          </div>

          {result.divergences.length > 0 && (
            <div className="rounded-lg border border-border bg-surface p-5">
              <h3 className="text-sm font-semibold mb-4">Divergence Summary</h3>
              <div className="space-y-3">
                {result.divergences.map((d, i) => (
                  <div key={i} className="rounded-md bg-red-50 p-3 text-sm">
                    <p className="font-medium text-red-800">{d.type}</p>
                    <p className="text-red-700 text-xs mt-1">{d.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-lg border border-border bg-surface p-5 space-y-4">
            <h3 className="text-sm font-semibold">Final Output Diff</h3>
            <DiffValue left={result.left.final_output} right={result.right.final_output} label="Final Output" />
          </div>

          <div className="rounded-lg border border-border bg-surface p-5 space-y-4">
            <h3 className="text-sm font-semibold">Span Comparison</h3>
            <div className="space-y-4">
              {result.span_pairs.map((pair, i) => (
                <SpanPair key={i} pair={pair} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
