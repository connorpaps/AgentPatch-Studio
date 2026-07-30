"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  createEvalFromRun,
  getEvals,
  getEvalResults,
  getRuns,
  rerunEval,
} from "@/lib/api";
import type { EvalCase, EvalResult, Run } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";

function ScoreTrend({ results }: { results: EvalResult[] }) {
  if (results.length < 2) return null;
  const width = 120;
  const height = 24;
  const scores = results.map((r) => r.score ?? 0).reverse();
  const maxScore = Math.max(...scores, 1);
  const minScore = Math.min(...scores, 0);
  const stepX = width / (scores.length - 1);
  const points = scores
    .map((s, i) => {
      const x = i * stepX;
      const y = height - ((s - minScore) / (maxScore - minScore || 1)) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        points={points}
        className="text-accent"
      />
      {scores.map((s, i) => (
        <circle
          key={i}
          cx={i * stepX}
          cy={height - ((s - minScore) / (maxScore - minScore || 1)) * height}
          r={2}
          className="fill-accent"
        />
      ))}
    </svg>
  );
}

const labelClass =
  "block font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted";
const fieldClass =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm transition-colors duration-150 ease-out focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/40";

function EvalsBanner() {
  return (
    <div className="relative h-[180px] md:h-[220px] overflow-hidden bg-canvas">
      <img
        src="https://picsum.photos/seed/agentpatch-lab-scale/1200/300"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-surface/60 via-surface/55 to-surface"
      />
    </div>
  );
}

export default function EvalsPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [evals, setEvals] = useState<EvalCase[]>([]);
  const [resultsByCase, setResultsByCase] = useState<
    Record<string, EvalResult[]>
  >({});
  const [selectedRun, setSelectedRun] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [rerunOptions, setRerunOptions] = useState<
    Record<
      string,
      {
        prompt_version?: string;
        model_name?: string;
        temperature?: string;
        workflow_version?: string;
      }
    >
  >({});
  const [initialLoading, setInitialLoading] = useState(true);

  async function refreshData() {
    const [r, e] = await Promise.all([getRuns(), getEvals()]);
    setRuns(r);
    setEvals(e);
  }

  useEffect(() => {
    let cancelled = false;
    Promise.all([getRuns(), getEvals()]).then(([r, e]) => {
      if (!cancelled) {
        setRuns(r);
        setEvals(e);
        setInitialLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggleExpand(evalCase: EvalCase) {
    const next = { ...expanded, [evalCase.id]: !expanded[evalCase.id] };
    setExpanded(next);
    if (!resultsByCase[evalCase.id]) {
      const results = await getEvalResults(evalCase.id);
      setResultsByCase((prev) => ({ ...prev, [evalCase.id]: results }));
    }
  }

  async function handleCreate() {
    if (!selectedRun) return;
    await createEvalFromRun(selectedRun);
    setMessage("Eval case created");
    setSelectedRun("");
    await refreshData();
  }

  async function handleRerun(evalId: string) {
    const opts = rerunOptions[evalId] || {};
    const payload = {
      prompt_version: opts.prompt_version || undefined,
      model_name: opts.model_name || undefined,
      temperature: opts.temperature ? parseFloat(opts.temperature) : undefined,
      workflow_version: opts.workflow_version || undefined,
    };
    await rerunEval(evalId, payload);
    setMessage("Eval rerun complete");
    const results = await getEvalResults(evalId);
    setResultsByCase((prev) => ({ ...prev, [evalId]: results }));
    await refreshData();
  }

  if (initialLoading) {
    return (
      <>
        <EvalsBanner />
        <div
          className="space-y-6 px-8 py-8 md:px-12 md:py-10"
          aria-hidden
        >
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
      <EvalsBanner />
      <div className="space-y-6 px-8 py-8 md:px-12 md:py-10">
        <header className="flex items-end justify-between gap-6 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Eval Lab
            </h1>
            <p className="mt-2 max-w-[55ch] text-sm text-muted leading-relaxed">
              Generate regression tests from production failures and watch the
              trend chart prove each patch held.
            </p>
          </div>
          <Link
            href="/runs"
            className="text-sm font-medium text-accent transition-transform duration-150 ease-out hover:translate-x-0.5 hover:text-accent-hover focus:outline-none focus:ring-2 focus:ring-accent/40 rounded-sm"
          >
            Open runs explorer →
          </Link>
        </header>

        <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm space-y-4">
          <h2 className="text-base font-semibold tracking-tight">
            Create eval from run
          </h2>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5 min-w-[280px] flex-1">
              <label htmlFor="eval-run" className={labelClass}>
                Source run
              </label>
              <select
                id="eval-run"
                name="eval-run"
                className={fieldClass}
                value={selectedRun}
                onChange={(e) => setSelectedRun(e.target.value)}
              >
                <option value="">Select a run</option>
                {runs.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.id.slice(0, 8)} — {r.user_query || "no query"}
                  </option>
                ))}
              </select>
            </div>
            <Button onClick={handleCreate} disabled={!selectedRun}>
              Create Eval
            </Button>
          </div>
          {message && (
            <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-success">
              {message}
            </p>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-soft">
                <th
                  scope="col"
                  className="px-5 py-3 font-mono text-[10.5px] font-medium uppercase tracking-[0.18em] text-muted"
                >
                  Name
                </th>
                <th
                  scope="col"
                  className="px-5 py-3 font-mono text-[10.5px] font-medium uppercase tracking-[0.18em] text-muted"
                >
                  Expected
                </th>
                <th
                  scope="col"
                  className="px-5 py-3 font-mono text-[10.5px] font-medium uppercase tracking-[0.18em] text-muted"
                >
                  Latest score
                </th>
                <th
                  scope="col"
                  className="px-5 py-3 font-mono text-[10.5px] font-medium uppercase tracking-[0.18em] text-muted"
                >
                  Trend
                </th>
                <th
                  scope="col"
                  className="px-5 py-3 font-mono text-[10.5px] font-medium uppercase tracking-[0.18em] text-muted"
                >
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {evals.map((e) => {
                const results = resultsByCase[e.id] || [];
                const latest = results[0];
                return (
                  <React.Fragment key={e.id}>
                    <tr className="border-b border-border last:border-b-0 transition-colors duration-150 ease-out hover:bg-surface-soft">
                      <td className="px-5 py-3.5 font-medium">{e.name}</td>
                      <td className="max-w-md truncate px-5 py-3.5 text-muted">
                        {e.expected_behavior}
                      </td>
                      <td className="px-5 py-3.5">
                        {latest ? (
                          <span className="inline-flex items-center gap-2">
                            <StatusBadge
                              status={latest.passed ? "success" : "failure"}
                            />
                            <span className="font-mono text-xs tabular-nums text-muted">
                              {(latest.score ?? 0).toFixed(2)}
                            </span>
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <ScoreTrend results={results} />
                      </td>
                      <td className="px-5 py-3.5">
                        <Button variant="outline" onClick={() => toggleExpand(e)}>
                          {expanded[e.id] ? "Collapse" : "Expand"}
                        </Button>
                      </td>
                    </tr>
                    {expanded[e.id] && (
                      <tr key={`${e.id}-details`} className="bg-surface-soft/40">
                        <td colSpan={5} className="px-5 py-5">
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                              <div className="space-y-1.5">
                                <label className={labelClass}>
                                  Prompt version
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g. v3"
                                  className={fieldClass}
                                  value={rerunOptions[e.id]?.prompt_version || ""}
                                  onChange={(ev) =>
                                    setRerunOptions((prev) => ({
                                      ...prev,
                                      [e.id]: {
                                        ...prev[e.id],
                                        prompt_version: ev.target.value,
                                      },
                                    }))
                                  }
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className={labelClass}>Model</label>
                                <input
                                  type="text"
                                  placeholder="e.g. gpt-5"
                                  className={fieldClass}
                                  value={rerunOptions[e.id]?.model_name || ""}
                                  onChange={(ev) =>
                                    setRerunOptions((prev) => ({
                                      ...prev,
                                      [e.id]: {
                                        ...prev[e.id],
                                        model_name: ev.target.value,
                                      },
                                    }))
                                  }
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className={labelClass}>Temperature</label>
                                <input
                                  type="number"
                                  step="0.1"
                                  min={0}
                                  max={2}
                                  placeholder="0.2"
                                  className={fieldClass}
                                  value={rerunOptions[e.id]?.temperature || ""}
                                  onChange={(ev) =>
                                    setRerunOptions((prev) => ({
                                      ...prev,
                                      [e.id]: {
                                        ...prev[e.id],
                                        temperature: ev.target.value,
                                      },
                                    }))
                                  }
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className={labelClass}>
                                  Workflow version
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g. v2"
                                  className={fieldClass}
                                  value={
                                    rerunOptions[e.id]?.workflow_version || ""
                                  }
                                  onChange={(ev) =>
                                    setRerunOptions((prev) => ({
                                      ...prev,
                                      [e.id]: {
                                        ...prev[e.id],
                                        workflow_version: ev.target.value,
                                      },
                                    }))
                                  }
                                />
                              </div>
                            </div>
                            <Button onClick={() => handleRerun(e.id)}>
                              Rerun with patch
                            </Button>

                            <h4 className="text-sm font-semibold tracking-tight">
                              Result history
                            </h4>
                            {results.length === 0 && (
                              <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted">
                                No reruns yet.
                              </p>
                            )}
                            <div className="space-y-2">
                              {results.map((result) => (
                                <div
                                  key={result.id}
                                  className="rounded-md border border-border bg-background p-3 text-xs space-y-1"
                                >
                                  <div className="flex items-center gap-2">
                                    <StatusBadge
                                      status={result.passed ? "success" : "failure"}
                                    />
                                    <span className="font-mono tabular-nums text-muted">
                                      {new Date(result.created_at).toLocaleString()}
                                    </span>
                                  </div>
                                  <p className="font-mono tabular-nums">
                                    Score: {(result.score ?? 0).toFixed(2)}
                                  </p>
                                  {result.model_name && (
                                    <p className="font-mono">Model: {result.model_name}</p>
                                  )}
                                  {result.temperature !== undefined && (
                                    <p className="font-mono tabular-nums">
                                      Temperature: {result.temperature}
                                    </p>
                                  )}
                                  {result.prompt_version && (
                                    <p className="font-mono">
                                      Prompt: {result.prompt_version}
                                    </p>
                                  )}
                                  {result.workflow_version && (
                                    <p className="font-mono">
                                      Workflow: {result.workflow_version}
                                    </p>
                                  )}
                                  <p className="text-muted">{result.judge_reason}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
          {evals.length === 0 && (
            <div className="px-5 py-12 text-center">
              <p className="text-sm font-medium text-foreground">No eval cases yet</p>
              <p className="mt-1 text-xs text-muted">
                Create one from a failed run above to lock the fix in as a
                regression case.
              </p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
