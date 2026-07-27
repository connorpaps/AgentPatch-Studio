import Link from "next/link";
import { ArrowRight, GitBranch } from "lucide-react";
import { getRuns, getWorkflows, getAnalytics } from "@/lib/api";
import { Sparkline } from "@/components/sparkline";

export default async function WorkflowsPage() {
  const [runs, workflows, analytics] = await Promise.all([
    getRuns(),
    getWorkflows(),
    getAnalytics().catch(() => ({ costs: [], slowSpans: [], tokenSpans: [] })),
  ]);

  return (
    <div className="p-8 space-y-8">
      <header>
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted">
          <GitBranch className="h-3.5 w-3.5 text-accent" />
          <span>Library</span>
        </div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Workflows</h1>
        <p className="mt-1 text-sm text-muted">
          Every workflow AgentPatch has seen — click in to inspect recent runs.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {workflows.map((wf) => {
          const runsForWf = runs.filter((r) => r.workflow_id === wf.id);
          const cost =
            analytics.costs.find((c) => c.workflow_id === wf.id)?.total_cost ?? 0;
          const failed = runsForWf.filter((r) => r.status === "failure").length;
          const success = runsForWf.filter((r) => r.status === "success").length;
          const sparks = runsForWf
            .slice(0, 12)
            .reverse()
            .map((r) => (r.status === "failure" ? -1 : r.status === "success" ? 1 : 0));
          return (
            <Link
              key={wf.id}
              href={`/runs?workflow_id=${wf.id}`}
              className="group flex flex-col gap-4 rounded-xl border border-border bg-surface p-6 shadow-sm transition-shadow hover:shadow-[var(--shadow-soft)]"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{wf.name}</h2>
                  <p className="mt-1 text-xs text-muted">
                    {wf.type ?? "agent"} · {wf.framework ?? "custom"} · v{wf.current_version ?? "1"}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
              </div>
              <Sparkline values={sparks} />
              <dl className="grid grid-cols-3 gap-2 text-xs">
                <Stat label="Runs" value={runsForWf.length} />
                <Stat label="Success" value={success} tone="success" />
                <Stat label="Failed" value={failed} tone="error" />
              </dl>
              <p className="text-xs text-muted">
                Cost so far: <span className="font-mono text-foreground">${cost.toFixed(4)}</span>
              </p>
            </Link>
          );
        })}
        {workflows.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-border bg-surface p-12 text-center">
            <p className="text-sm text-muted">No workflows yet — send a run to create one.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "success" | "error" }) {
  const toneClass =
    tone === "success"
      ? "text-success"
      : tone === "error"
        ? "text-error"
        : "text-foreground";
  return (
    <div className="rounded-md border border-border bg-background px-2 py-1.5">
      <dt className="text-[10px] uppercase tracking-wide text-muted">{label}</dt>
      <dd className={`mt-0.5 font-mono text-sm font-medium ${toneClass}`}>{value}</dd>
    </div>
  );
}
