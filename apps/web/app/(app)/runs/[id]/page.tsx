import Link from "next/link";
import { notFound } from "next/navigation";
import { getRun, getWorkflows } from "@/lib/api";
import { SpanTimeline } from "@/components/span-timeline";
import { StatusBadge } from "@/components/status-badge";
import { CreateEvalButton } from "@/components/create-eval-button";
import { ReplayButton } from "@/components/replay-button";
import { SimilarFailures } from "@/components/similar-failures";
import { AuditLogCard } from "@/components/audit-log-card";

export default async function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let run;
  try {
    run = await getRun(id);
  } catch {
    notFound();
  }

  // Best-effort lookup of the workflow so we can show its nice name in breadcrumbs.
  let workflow;
  try {
    const workflows = await getWorkflows();
    workflow = workflows.find((w) => w.id === run.workflow_id);
  } catch {
    workflow = undefined;
  }

  // Surface the tool names to the replay confirm dialog so users know what
  // will be re-executed in 'full' mode.
  const toolNames = Array.from(
    new Set(
      (run.spans ?? [])
        .map((span) => span.tool_name)
        .filter((name): name is string => Boolean(name)),
    ),
  );

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-8 py-6 border-b border-border bg-surface">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted">
            <Link href="/runs" className="hover:text-accent">
              Runs
            </Link>
            <span>/</span>
            {workflow ? (
              <Link href={`/runs?workflow_id=${workflow.id}`} className="hover:text-accent">
                {workflow.name}
              </Link>
            ) : (
              <span>Unknown workflow</span>
            )}
            <span>/</span>
            <span className="font-mono text-xs">{run.id.slice(0, 8)}</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight mt-1">Run detail</h1>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={run.status} />
          <ReplayButton runId={run.id} fullReplayTools={toolNames} />
          <CreateEvalButton runId={run.id} />
        </div>
      </div>
      <div className="p-8 flex-1 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
          <div className="lg:col-span-3 h-full">
            <SpanTimeline run={run} />
          </div>
          <div className="space-y-4 overflow-auto pr-1">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
                Similar Failures
              </h2>
              <div className="mt-2">
                <SimilarFailures runId={run.id} />
              </div>
            </div>
            <AuditLogCard projectId={workflow?.project_id ?? null} runId={run.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
