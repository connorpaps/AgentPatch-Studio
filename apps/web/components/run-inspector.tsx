"use client";

import { useState } from "react";
import type { Run, Span } from "@/lib/types";
import { createAnnotation, summarizeRun } from "@/lib/api";
import { Artifacts } from "./artifacts";
import { RetrievedDocuments } from "./retrieved-documents";
import { StatusBadge } from "./status-badge";
import { Button } from "./ui/button";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "retrieved", label: "Retrieved" },
  { key: "artifacts", label: "Artifacts" },
  { key: "annotations", label: "Annotations" },
  { key: "output", label: "Run Output" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</h4>
      <div className="text-sm">{children}</div>
    </div>
  );
}

function CodeBlock({ data }: { data: unknown }) {
  return (
    <pre className="rounded-md border border-border bg-surface p-3 text-xs font-mono overflow-auto max-h-96">
      {data ? JSON.stringify(data, null, 2) : "null"}
    </pre>
  );
}

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 text-xs font-medium transition-colors border-b-2 ${
        active
          ? "border-accent text-accent"
          : "border-transparent text-muted hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

interface RunInspectorProps {
  span: Span | undefined;
  run: Run;
}

export function RunInspector({ span, run }: RunInspectorProps) {
  const [tab, setTab] = useState<TabKey>("overview");
  const [annotation, setAnnotation] = useState({ label: "", note: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState({
    summary: run.summary,
    failure_explanation: run.failure_explanation,
    patch_suggestion: run.patch_suggestion,
    suggested_failure_type: run.suggested_failure_type,
    analyzed_at: run.analyzed_at,
  });

  const [localAnnotations, setLocalAnnotations] = useState(run.annotations || []);
  const runAnnotations = localAnnotations;

  async function handleAnnotationSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!annotation.label.trim()) return;
    setSaving(true);
    try {
      const created = await createAnnotation(run.id, {
        label: annotation.label,
        note: annotation.note,
        span_id: span?.id,
      });
      setLocalAnnotations((prev) => [
        ...prev,
        {
          id: created.annotation_id,
          run_id: run.id,
          span_id: span?.id || null,
          label: annotation.label,
          note: annotation.note,
          created_at: new Date().toISOString(),
        },
      ]);
      setSaved(true);
      setAnnotation({ label: "", note: "" });
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  const title = span ? span.name : "Run overview";
  const status = span ? span.status : run.status;
  const failureType = span ? undefined : run.failure_type;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-sm">{title}</h3>
          {failureType && <p className="text-xs text-red-600 mt-0.5">Failure: {failureType}</p>}
        </div>
        <StatusBadge status={status} />
      </div>

      {!span && run.user_query && (
        <div className="rounded-md border border-border bg-surface p-3 text-sm">
          <p className="text-xs text-muted mb-1">User query</p>
          <p className="font-medium">{run.user_query}</p>
        </div>
      )}

      <div className="flex flex-wrap border-b border-border">
        {TABS.map((t) => (
          <TabButton
            key={t.key}
            active={tab === t.key}
            label={t.label}
            onClick={() => setTab(t.key)}
          />
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-4">
          {!span ? (
            <>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-md border border-border p-2 bg-surface">
                  <p className="text-muted">Duration</p>
                  <p className="font-medium">{run.duration_ms ? `${run.duration_ms}ms` : "—"}</p>
                </div>
                <div className="rounded-md border border-border p-2 bg-surface">
                  <p className="text-muted">Spans</p>
                  <p className="font-medium">{run.spans?.length || 0}</p>
                </div>
                <div className="rounded-md border border-border p-2 bg-surface">
                  <p className="text-muted">Input Tokens</p>
                  <p className="font-medium">{run.total_input_tokens ?? "—"}</p>
                </div>
                <div className="rounded-md border border-border p-2 bg-surface">
                  <p className="text-muted">Output Tokens</p>
                  <p className="font-medium">{run.total_output_tokens ?? "—"}</p>
                </div>
              </div>
              <Section title="Run Summary">
                <p className="text-sm text-muted">
                  {analysis.summary || "No summary yet. Click Analyze to generate one."}
                </p>
                {analysis.suggested_failure_type && (
                  <p className="text-xs text-red-600 mt-1">
                    Suggested root cause: {analysis.suggested_failure_type}
                  </p>
                )}
                {analysis.analyzed_at && (
                  <p className="text-xs text-muted mt-1">
                    Analyzed at {new Date(analysis.analyzed_at).toLocaleString()}
                  </p>
                )}
                {analysisError && (
                  <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800">
                    Error: {analysisError}
                  </div>
                )}
                {(analysis.failure_explanation || analysis.patch_suggestion) && (
                  <div className="mt-2 space-y-2">
                    {analysis.failure_explanation && (
                      <div className="rounded-md border border-red-100 bg-red-50 p-2 text-xs text-red-800">
                        <strong>Failure explanation:</strong> {analysis.failure_explanation}
                      </div>
                    )}
                    {analysis.patch_suggestion && (
                      <div className="rounded-md border border-green-100 bg-green-50 p-2 text-xs text-green-800">
                        <strong>Patch suggestion:</strong> {analysis.patch_suggestion}
                      </div>
                    )}
                  </div>
                )}
                <Button
                  onClick={async () => {
                    setAnalyzing(true);
                    setAnalysisError(null);
                    try {
                      const result = await summarizeRun(run.id);
                      setAnalysis({
                        summary: result.summary ?? undefined,
                        failure_explanation: result.failure_explanation ?? undefined,
                        patch_suggestion: result.patch_suggestion ?? undefined,
                        suggested_failure_type: result.suggested_failure_type ?? undefined,
                        analyzed_at: result.analyzed_at ?? undefined,
                      });
                    } catch (err) {
                      setAnalysisError(err instanceof Error ? err.message : "Analysis failed");
                    } finally {
                      setAnalyzing(false);
                    }
                  }}
                  disabled={analyzing}
                  className="mt-3"
                >
                  {analyzing ? "Analyzing..." : "Analyze run"}
                </Button>
              </Section>
              <Section title="Final Output">
                <CodeBlock data={run.final_output} />
              </Section>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-md border border-border p-2 bg-surface">
                  <p className="text-muted">Type</p>
                  <p className="font-medium">{span.span_type}</p>
                </div>
                <div className="rounded-md border border-border p-2 bg-surface">
                  <p className="text-muted">Duration</p>
                  <p className="font-medium">{span.duration_ms ? `${span.duration_ms}ms` : "—"}</p>
                </div>
                <div className="rounded-md border border-border p-2 bg-surface">
                  <p className="text-muted">Input Tokens</p>
                  <p className="font-medium">{span.input_tokens ?? "—"}</p>
                </div>
                <div className="rounded-md border border-border p-2 bg-surface">
                  <p className="text-muted">Output Tokens</p>
                  <p className="font-medium">{span.output_tokens ?? "—"}</p>
                </div>
                {span.model_name && (
                  <div className="rounded-md border border-border p-2 bg-surface">
                    <p className="text-muted">Model</p>
                    <p className="font-medium">{span.model_name}</p>
                  </div>
                )}
                {span.tool_name && (
                  <div className="rounded-md border border-border p-2 bg-surface">
                    <p className="text-muted">Tool</p>
                    <p className="font-medium">{span.tool_name}</p>
                  </div>
                )}
              </div>
              <Section title="Input Payload">
                <CodeBlock data={span.input_payload} />
              </Section>
              <Section title="Output Payload">
                <CodeBlock data={span.output_payload} />
              </Section>
            </>
          )}
        </div>
      )}

      {tab === "retrieved" && (
        <Section title="Retrieved Documents">
          <RetrievedDocuments documents={span?.retrieved_documents} />
        </Section>
      )}

      {tab === "artifacts" && (
        <Section title="Artifacts">
          <Artifacts artifacts={span?.artifacts} />
        </Section>
      )}

      {tab === "annotations" && (
        <Section title="Annotations">
          <div className="space-y-4">
            <form onSubmit={handleAnnotationSubmit} className="space-y-3">
              <p className="text-xs text-muted">Add a root-cause label or reviewer note.</p>
              <input
                type="text"
                placeholder="Label (e.g. stale_source)"
                value={annotation.label}
                onChange={(e) => setAnnotation({ ...annotation, label: e.target.value })}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              />
              <textarea
                placeholder="Note"
                value={annotation.note}
                onChange={(e) => setAnnotation({ ...annotation, note: e.target.value })}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm min-h-[80px]"
              />
              <div className="flex items-center gap-3">
                <Button type="submit" disabled={saving || !annotation.label.trim()}>
                  {saving ? "Saving..." : "Add annotation"}
                </Button>
                {saved && <span className="text-xs text-green-600">Saved</span>}
              </div>
            </form>

            {runAnnotations.length === 0 ? (
              <p className="text-sm text-muted">No annotations yet.</p>
            ) : (
              <div className="space-y-2">
                {runAnnotations.map((a) => (
                  <div
                    key={a.id}
                    className="rounded-md border border-border bg-surface p-3 text-sm"
                  >
                    <p className="font-medium">{a.label}</p>
                    {a.note && <p className="text-muted text-xs mt-1">{a.note}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Section>
      )}

      {tab === "output" && (
        <Section title="Run Output">
          <CodeBlock data={run.final_output} />
        </Section>
      )}
    </div>
  );
}
