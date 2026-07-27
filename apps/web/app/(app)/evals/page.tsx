"use client";

import React, { useEffect, useState } from "react";
import { createEvalFromRun, getEvals, getEvalResults, getRuns, rerunEval } from "@/lib/api";
import type { EvalCase, EvalResult, Run } from "@/lib/types";
import { Button } from "@/components/ui/button";

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

export default function EvalsPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [evals, setEvals] = useState<EvalCase[]>([]);
  const [resultsByCase, setResultsByCase] = useState<Record<string, EvalResult[]>>({});
  const [selectedRun, setSelectedRun] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [rerunOptions, setRerunOptions] = useState<Record<string, { prompt_version?: string; model_name?: string; temperature?: string; workflow_version?: string }>>({});

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

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Eval Lab</h1>
          <p className="text-sm text-muted mt-1">Generate regression tests from production failures</p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface p-5 space-y-4">
        <h2 className="text-sm font-semibold">Create eval from run</h2>
        <div className="flex items-end gap-3">
          <select
            id="eval-run"
            name="eval-run"
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
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
          <Button onClick={handleCreate} disabled={!selectedRun}>
            Create Eval
          </Button>
        </div>
        {message && <p className="text-xs text-muted">{message}</p>}
      </div>

      <div className="rounded-lg border border-border bg-surface overflow-hidden">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-stone-50 text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Expected</th>
              <th className="px-4 py-3 font-medium">Latest Score</th>
              <th className="px-4 py-3 font-medium">Trend</th>
              <th className="px-4 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {evals.map((e) => {
              const results = resultsByCase[e.id] || [];
              const latest = results[0];
              return (
                <React.Fragment key={e.id}>
                  <tr className="hover:bg-stone-50/50">
                    <td className="px-4 py-3 font-medium">{e.name}</td>
                    <td className="px-4 py-3 max-w-md truncate">{e.expected_behavior}</td>
                    <td className="px-4 py-3">
                      {latest ? (
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            latest.passed
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {latest.passed ? "Pass" : "Fail"} ({(latest.score ?? 0).toFixed(2)})
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <ScoreTrend results={results} />
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="outline" onClick={() => toggleExpand(e)}>
                        {expanded[e.id] ? "Collapse" : "Expand"}
                      </Button>
                    </td>
                  </tr>
                  {expanded[e.id] && (
                    <tr key={`${e.id}-details`}>
                      <td colSpan={5} className="px-4 py-4 bg-stone-50/30">
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <input
                              type="text"
                              placeholder="Prompt version"
                              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                              value={rerunOptions[e.id]?.prompt_version || ""}
                              onChange={(ev) =>
                                setRerunOptions((prev) => ({
                                  ...prev,
                                  [e.id]: { ...prev[e.id], prompt_version: ev.target.value },
                                }))
                              }
                            />
                            <input
                              type="text"
                              placeholder="Model name"
                              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                              value={rerunOptions[e.id]?.model_name || ""}
                              onChange={(ev) =>
                                setRerunOptions((prev) => ({
                                  ...prev,
                                  [e.id]: { ...prev[e.id], model_name: ev.target.value },
                                }))
                              }
                            />
                            <input
                              type="number"
                              step="0.1"
                              min={0}
                              max={2}
                              placeholder="Temperature"
                              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                              value={rerunOptions[e.id]?.temperature || ""}
                              onChange={(ev) =>
                                setRerunOptions((prev) => ({
                                  ...prev,
                                  [e.id]: { ...prev[e.id], temperature: ev.target.value },
                                }))
                              }
                            />
                            <input
                              type="text"
                              placeholder="Workflow version"
                              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                              value={rerunOptions[e.id]?.workflow_version || ""}
                              onChange={(ev) =>
                                setRerunOptions((prev) => ({
                                  ...prev,
                                  [e.id]: { ...prev[e.id], workflow_version: ev.target.value },
                                }))
                              }
                            />
                          </div>
                          <Button onClick={() => handleRerun(e.id)}>Rerun with patch</Button>

                          <h4 className="text-sm font-semibold">Result History</h4>
                          {results.length === 0 && <p className="text-xs text-muted">No reruns yet.</p>}
                          <div className="space-y-2">
                            {results.map((result) => (
                              <div
                                key={result.id}
                                className="rounded-md border border-border bg-background p-3 text-xs space-y-1"
                              >
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ${
                                      result.passed
                                        ? "bg-green-100 text-green-700"
                                        : "bg-red-100 text-red-700"
                                    }`}
                                  >
                                    {result.passed ? "Pass" : "Fail"}
                                  </span>
                                  <span className="text-muted">
                                    {new Date(result.created_at).toLocaleString()}
                                  </span>
                                </div>
                                <p>Score: {(result.score ?? 0).toFixed(2)}</p>
                                {result.model_name && <p>Model: {result.model_name}</p>}
                                {result.temperature !== undefined && (
                                  <p>Temperature: {result.temperature}</p>
                                )}
                                {result.prompt_version && <p>Prompt: {result.prompt_version}</p>}
                                {result.workflow_version && <p>Workflow: {result.workflow_version}</p>}
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
          <div className="px-4 py-8 text-center text-sm text-muted">No eval cases yet.</div>
        )}
      </div>
    </div>
  );
}
