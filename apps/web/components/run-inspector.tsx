"use client";

import { useState } from "react";
import type { Run, Span } from "@/lib/types";
import { createAnnotation, summarizeRun } from "@/lib/api";
import { Artifacts } from "./artifacts";
import { RetrievedDocuments } from "./retrieved-documents";
import { StatusBadge } from "./status-badge";
import { Button } from "./ui/button";
import { CodeBlock } from "./ui/code-block";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "retrieved", label: "Retrieved" },
  { key: "artifacts", label: "Artifacts" },
  { key: "annotations", label: "Annotations" },
  { key: "output", label: "Run Output" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h4 className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted">
        {title}
      </h4>
      <div className="text-sm">{children}</div>
    </div>
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
      role="tab"
      aria-selected={active}
      className={`border-b-2 px-3 py-2 text-xs font-medium transition-colors duration-150 ease-out focus:outline-none focus:ring-2 focus:ring-accent/40 ${
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

  const fieldClass =
    "w-full rounded-md border border-border bg-background px-3 py-2 text-sm transition-colors duration-150 ease-out focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/40";

  return (
    <div className="space-y-5 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
          {failureType && (
            <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.18em] text-data-failure">
              Failure: {failureType}
            </p>
          )}
        </div>
        <StatusBadge status={status} />
      </div>

      {!span && run.user_query && (
        <div className="rounded-md border border-border bg-surface p-3 text-sm">
          <p className="mb-1 font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted">
            User query
          </p>
          <p className="font-medium">{run.user_query}</p>
        </div>
      )}

      <div className="flex flex-wrap border-b border-border" role="tablist">
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
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Stat
                  label="Duration"
                  value={run.duration_ms ? `${run.duration_ms}ms` : "—"}
                />
                <Stat label="Spans" value={String(run.spans?.length || 0)} />
                <Stat
                  label="Input tokens"
                  value={String(run.total_input_tokens ?? "—")}
                />
                <Stat
                  label="Output tokens"
                  value={String(run.total_output_tokens ?? "—")}
                />
              </div>
              <Section title="Run summary">
                <p className="text-sm text-muted">
                  {analysis.summary ||
                    "No summary yet. Click Analyze to generate one."}
                </p>
                {analysis.suggested_failure_type && (
                  <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.18em] text-data-failure">
                    Suggested root cause: {analysis.suggested_failure_type}
                  </p>
                )}
                {analysis.analyzed_at && (
                  <p className="mt-1 text-xs text-muted">
                    Analyzed at {new Date(analysis.analyzed_at).toLocaleString()}
                  </p>
                )}
                {analysisError && (
                  <div className="mt-2 rounded-md border border-data-failure/30 bg-data-failure-soft p-2 text-xs text-data-failure">
                    Error: {analysisError}
                  </div>
                )}
                {(analysis.failure_explanation || analysis.patch_suggestion) && (
                  <div className="mt-2 space-y-2">
                    {analysis.failure_explanation && (
                      <div className="rounded-md border border-data-failure/30 bg-data-failure-soft p-2 text-xs text-data-failure">
                        <strong>Failure explanation:</strong>{" "}
                        {analysis.failure_explanation}
                      </div>
                    )}
                    {analysis.patch_suggestion && (
                      <div className="rounded-md border border-data-success/30 bg-data-success-soft p-2 text-xs text-data-success">
                        <strong>Patch suggestion:</strong>{" "}
                        {analysis.patch_suggestion}
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
                        failure_explanation:
                          result.failure_explanation ?? undefined,
                        patch_suggestion: result.patch_suggestion ?? undefined,
                        suggested_failure_type:
                          result.suggested_failure_type ?? undefined,
                        analyzed_at: result.analyzed_at ?? undefined,
                      });
                    } catch (err) {
                      setAnalysisError(
                        err instanceof Error
                          ? err.message
                          : "Analysis failed",
                      );
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
              <Section title="Final output">
                <CodeBlock code={JSON.stringify(run.final_output ?? null, null, 2)} language="json" />
              </Section>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Stat label="Type" value={span.span_type} />
                <Stat
                  label="Duration"
                  value={span.duration_ms ? `${span.duration_ms}ms` : "—"}
                />
                <Stat
                  label="Input tokens"
                  value={String(span.input_tokens ?? "—")}
                />
                <Stat
                  label="Output tokens"
                  value={String(span.output_tokens ?? "—")}
                />
                {span.model_name && <Stat label="Model" value={span.model_name} />}
                {span.tool_name && <Stat label="Tool" value={span.tool_name} />}
              </div>
              <Section title="Input payload">
                <CodeBlock
                  code={JSON.stringify(span.input_payload ?? null, null, 2)}
                  language="json"
                />
              </Section>
              <Section title="Output payload">
                <CodeBlock
                  code={JSON.stringify(span.output_payload ?? null, null, 2)}
                  language="json"
                />
              </Section>
            </>
          )}
        </div>
      )}

      {tab === "retrieved" && (
        <Section title="Retrieved documents">
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
              <p className="text-xs text-muted">
                Add a root-cause label or reviewer note.
              </p>
              <input
                type="text"
                placeholder="Label (e.g. stale_source)"
                value={annotation.label}
                onChange={(e) =>
                  setAnnotation({ ...annotation, label: e.target.value })
                }
                className={fieldClass}
              />
              <textarea
                placeholder="Note"
                value={annotation.note}
                onChange={(e) =>
                  setAnnotation({ ...annotation, note: e.target.value })
                }
                className={`${fieldClass} min-h-[80px]`}
              />
              <div className="flex items-center gap-3">
                <Button
                  type="submit"
                  disabled={saving || !annotation.label.trim()}
                >
                  {saving ? "Saving..." : "Add annotation"}
                </Button>
                {saved && (
                  // Form-validation feedback ACK ("Saved" after a user-initiated
                  // save action) -- legacy semantic kept per globals.css header.
                  // role="status" + aria-live="polite" announces the save to
                  // screen-reader users since the visual tag auto-clears at 3s.
                  <span
                    role="status"
                    aria-live="polite"
                    className="font-mono text-xs text-success"
                  >
                    Saved
                  </span>
                )}
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
                    {a.note && (
                      <p className="mt-1 text-xs text-muted">{a.note}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Section>
      )}

      {tab === "output" && (
        <Section title="Run output">
          <CodeBlock
            code={JSON.stringify(run.final_output ?? null, null, 2)}
            language="json"
          />
        </Section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background px-3 py-2">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
        {label}
      </p>
      <p className="mt-0.5 font-mono text-sm font-medium tabular-nums text-foreground">
        {value}
      </p>
    </div>
  );
}
