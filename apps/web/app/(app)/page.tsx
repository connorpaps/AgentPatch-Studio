import { Activity, BookOpen, GitCompare, Sparkles, Terminal } from "lucide-react";
import Link from "next/link";

import { getAnalytics, getRuns, getWorkflows } from "@/lib/api";
import { KpiCard } from "@/components/kpi-card";
import { FailureTrendChart } from "@/components/failure-trend-chart";
import { RunStatusChart } from "@/components/run-status-chart";
import { RunsTable } from "@/components/runs-table";
import { TopWorkflows } from "@/components/top-workflows";
import { AnalyticsCostChart } from "@/components/analytics-cost-chart";
import { AnalyticsSlowestSpans } from "@/components/analytics-slowest-spans";
import { AnalyticsTokenSpans } from "@/components/analytics-token-spans";
import { WelcomeHero } from "@/components/welcome-hero";

export default async function DashboardPage() {
  const [runs, workflows, analytics] = await Promise.all([
    getRuns(),
    getWorkflows(),
    getAnalytics().catch(() => ({ costs: [], slowSpans: [], tokenSpans: [] })),
  ]);
  const total = runs.length;
  const failed = runs.filter((r) => r.status === "failure").length;
  const success = runs.filter((r) => r.status === "success").length;
  const requiresReview = runs.filter((r) => r.requires_review).length;
  const avgDurationMs =
    runs.length > 0
      ? Math.round(runs.reduce((acc, r) => acc + (r.duration_ms || 0), 0) / runs.length)
      : 0;
  const avgDuration =
    avgDurationMs >= 1000
      ? `${(avgDurationMs / 1000).toFixed(1)}s`
      : `${avgDurationMs}ms`;

  const runsByWorkflow = runs.reduce<Record<string, number>>((acc, run) => {
    const id = run.workflow_id;
    acc[id] = (acc[id] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-8 space-y-10">
      <header>
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted">
          <Activity className="h-3.5 w-3.5 text-accent" />
          <span>Workspace</span>
        </div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted">
          {total === 0
            ? "Send your first trace to see the workspace come alive."
            : `${total} runs across ${workflows.length} workflows.`}
        </p>
      </header>

      {total === 0 ? (
        <WelcomeHero />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <KpiCard label="Total Runs" value={total} icon="runs" />
            <KpiCard label="Successful" value={success} icon="success" />
            <KpiCard label="Failed" value={failed} icon="error" />
            <KpiCard label="Needs Review" value={requiresReview} icon="error" />
            <KpiCard label="Avg. Duration" value={avgDuration} icon="clock" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
                  Recent Runs
                </h2>
                <Link
                  href="/runs"
                  className="text-xs font-medium text-accent hover:text-accent-hover"
                >
                  View all →
                </Link>
              </div>
              <RunsTable runs={runs.slice(0, 5)} />
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
                  Top Workflows
                </h2>
                <Link
                  href="/workflows"
                  className="text-xs font-medium text-accent hover:text-accent-hover"
                >
                  Browse →
                </Link>
              </div>
              <TopWorkflows workflows={workflows} runsByWorkflow={runsByWorkflow} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted mb-4">
                Run Status
              </h2>
              <RunStatusChart runs={runs} />
            </div>
            <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted mb-4">
                Failure Trend
              </h2>
              <FailureTrendChart runs={runs} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted mb-4">
                Cost by Workflow
              </h2>
              {analytics.costs.length > 0 ? (
                <AnalyticsCostChart data={analytics.costs} />
              ) : (
                <p className="text-sm text-muted">No cost data yet.</p>
              )}
            </div>
            <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted mb-4">
                Slowest Spans
              </h2>
              {analytics.slowSpans.length > 0 ? (
                <AnalyticsSlowestSpans data={analytics.slowSpans} />
              ) : (
                <p className="text-sm text-muted">No span timing data yet.</p>
              )}
            </div>
            <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted mb-4">
                Token‑Heavy Spans
              </h2>
              {analytics.tokenSpans.length > 0 ? (
                <AnalyticsTokenSpans data={analytics.tokenSpans} />
              ) : (
                <p className="text-sm text-muted">No token data yet.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
