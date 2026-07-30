import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getAnalytics, getRuns, getWorkflows } from "@/lib/api";
import { Sparkline } from "@/components/sparkline";

/**
 * WorkflowsBanner -- the workflow library carries a 200px slim
 * banner with a slightly heavier 65% gradient than the data tier
 * (60%). The library is a calmer catalog surface, so the photo
 * reads as wallpaper rather than observation chrome.
 */
function WorkflowsBanner() {
  return (
    <div className="relative h-[160px] md:h-[200px] overflow-hidden bg-canvas">
      {/*
        picsum.photos seeded URL intentionally bypasses next/image
        (see welcome-hero.tsx for the rationale).
      */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="https://picsum.photos/seed/agentpatch-network-graph/1200/280"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-surface/65 via-surface/60 to-surface" />
    </div>
  );
}

/**
 * WorkflowsPage -- the workflow library. Server component, fetches
 * analytics + workflows + runs in parallel. Per the studio's composition
 * rhythm: banner -> header (no eyebrow, plain h1 + subtext) -> workflow
 * card grid. Per Shape Consistency Lock: cards = rounded-2xl (16px).
 * Per Grounded Until Touched: hover lifts 1px with the soft shadow.
 */
export default async function WorkflowsPage() {
  const [runs, workflows, analytics] = await Promise.all([
    getRuns(),
    getWorkflows(),
    getAnalytics().catch(() => ({ costs: [], slowSpans: [], tokenSpans: [] })),
  ]);

  return (
    <>
      <WorkflowsBanner />
      <div className="px-8 md:px-12 py-8 md:py-10 space-y-8">
        <header className="flex items-end justify-between gap-6 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
              Workflows
            </h1>
            <p className="mt-2 max-w-[55ch] text-sm text-muted leading-relaxed">
              Every workflow AgentPatch has seen — click in to inspect recent
              runs.
            </p>
          </div>
          <Link
            href="/runs"
            className="text-sm font-medium text-accent transition-transform duration-150 ease-out hover:translate-x-0.5 hover:text-accent-hover focus:outline-none focus:ring-2 focus:ring-accent/40 rounded-sm"
          >
            Open runs explorer →
          </Link>
        </header>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {workflows.map((wf) => {
            const runsForWf = runs.filter((r) => r.workflow_id === wf.id);
            const cost =
              analytics.costs.find((c) => c.workflow_id === wf.id)
                ?.total_cost ?? 0;
            const failed = runsForWf.filter((r) => r.status === "failure").length;
            const success = runsForWf.filter(
              (r) => r.status === "success",
            ).length;
            const sparks = runsForWf
              .slice(0, 12)
              .reverse()
              .map((r) =>
                r.status === "failure" ? -1 : r.status === "success" ? 1 : 0,
              );
            return (
              <Link
                key={wf.id}
                href={`/runs?workflow_id=${wf.id}`}
                className="group flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 shadow-sm transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-px hover:shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-accent/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold tracking-tight text-foreground">
                      {wf.name}
                    </h2>
                    <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted">
                      {wf.type ?? "agent"} · {wf.framework ?? "custom"} · v
                      {wf.current_version ?? "1"}
                    </p>
                  </div>
                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-muted transition-transform duration-150 ease-out group-hover:translate-x-0.5 group-hover:text-accent"
                    aria-hidden
                  />
                </div>
                <Sparkline values={sparks} />
                <dl className="grid grid-cols-3 gap-2 text-xs">
                  <Stat label="Runs" value={runsForWf.length} />
                  <Stat label="Success" value={success} tone="success" />
                  <Stat label="Failed" value={failed} tone="error" />
                </dl>
                <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted">
                  <span>Cost so far</span>
                  <span className="font-mono tabular-nums text-foreground">
                    ${cost.toFixed(4)}
                  </span>
                </div>
              </Link>
            );
          })}
          {workflows.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-border bg-surface p-12 text-center shadow-sm">
              <p className="text-sm font-medium text-foreground">
                No workflows yet
              </p>
              <p className="mt-1 text-sm text-muted">
                Send a run to create one. The studio ingests every workflow it
                sees.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "success" | "error";
}) {
  const toneClass =
    tone === "success"
      ? "text-data-success"
      : tone === "error"
        ? "text-data-failure"
        : "text-foreground";
  return (
    <div className="rounded-md border border-border bg-background px-2.5 py-1.5">
      <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
        {label}
      </dt>
      <dd
        className={`mt-0.5 font-mono text-sm font-medium tabular-nums ${toneClass}`}
      >
        {value}
      </dd>
    </div>
  );
}
