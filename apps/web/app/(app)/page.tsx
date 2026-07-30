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
import { Marquee } from "@/components/ui/marquee";
import { CountUp } from "@/components/ui/count-up";
import { MotionSection } from "@/components/ui/motion-section";

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

  const marqueeItems = [
    `${total} runs`,
    `${workflows.length} workflows`,
    `${failed} failed`,
    `${success} succeeded`,
    `${requiresReview} needs review`,
    `avg ${avgDuration}`,
    "replay engine live",
    "eval lab online",
  ];

  return (
    <div className="space-y-0">
      {/* Section 1 -- header (no eyebrow, plain h2 + subtext). */}
      <header className="px-8 pt-8 pb-6 md:px-12 md:pt-10 md:pb-8">
        <div className="flex items-end justify-between gap-6 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
              Dashboard
            </h1>
            <p className="mt-2 max-w-[55ch] text-sm text-muted leading-relaxed">
              {total === 0
                ? "Send your first trace to see the workspace come alive."
                : `${total} runs across ${workflows.length} workflows. Avg ${avgDuration} per run.`}
            </p>
          </div>
          <Link
            href="/runs"
            className="text-sm font-medium text-accent hover:text-accent-hover transition-transform duration-150 ease-out hover:translate-x-0.5 focus:outline-none focus:ring-2 focus:ring-accent/40 rounded-sm"
          >
            Open Runs →
          </Link>
        </div>
      </header>

      {total === 0 ? (
        <div className="px-8 pb-8 md:px-12 md:pb-12">
          <WelcomeHero />
        </div>
      ) : (
        <>
          {/* Section 2 -- single Marquee strip. Per skill Section 5, max one per page. */}
          <Marquee items={marqueeItems} duration={36} />

          {/* Section 3 -- Hero KPI bento (1 hero with photo + 4-cell grid). */}
          <MotionSection className="px-8 py-8 md:px-12 md:py-10">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="relative lg:col-span-1 overflow-hidden rounded-2xl border border-border bg-surface shadow-sm min-h-[260px] flex flex-col justify-between">
                {/*
                  picsum.photos seeded URL intentionally bypasses next/image
                  (see welcome-hero.tsx for the rationale).
                */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://picsum.photos/seed/agentpatch-dashboard-hero-observability/720/520"
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover opacity-30"
                />
                <div className="relative p-7 bg-canvas/85 backdrop-blur-sm">
                  <div className="h-1 w-12 bg-accent rounded-full mb-4" aria-hidden />
                  <p className="text-xs font-medium text-muted">Total runs</p>
                  <p className="mt-2 font-mono text-6xl font-semibold tabular-nums text-foreground">
                    <CountUp value={total} duration={0.7} />
                  </p>
                </div>
                <div className="relative p-7 pt-0 bg-canvas/85 backdrop-blur-sm">
                  <p className="text-sm text-muted">
                    across {workflows.length} workflows
                  </p>
                </div>
              </div>
              <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <KpiCard label="Successful" value={success} icon="success" />
                <KpiCard label="Failed" value={failed} icon="error" />
                <KpiCard label="Needs review" value={requiresReview} icon="error" />
                <KpiCard label="Avg. duration" value={avgDuration} icon="clock" />
              </div>
            </div>
          </MotionSection>

          {/* Section 4 -- Recent runs + Top workflows (2-up). */}
          <MotionSection className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-8 md:px-12 pb-8">
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-baseline justify-between">
                <h2 className="text-lg font-semibold tracking-tight">Recent runs</h2>
                <Link
                  href="/runs"
                  className="text-xs font-medium text-accent hover:text-accent-hover transition-transform duration-150 ease-out hover:translate-x-0.5"
                >
                  View all →
                </Link>
              </div>
              <RunsTable runs={runs.slice(0, 5)} />
            </div>
            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <h2 className="text-lg font-semibold tracking-tight">Top workflows</h2>
                <Link
                  href="/workflows"
                  className="text-xs font-medium text-accent hover:text-accent-hover transition-transform duration-150 ease-out hover:translate-x-0.5"
                >
                  Browse →
                </Link>
              </div>
              <TopWorkflows workflows={workflows} runsByWorkflow={runsByWorkflow} />
            </div>
          </MotionSection>

          {/* Section 5 -- Chart bento (2-up, exactly 2 cells). */}
          <MotionSection className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-8 md:px-12 pb-8">
            <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
              <h2 className="text-base font-semibold tracking-tight mb-4">Run status</h2>
              <RunStatusChart runs={runs} />
            </div>
            <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
              <h2 className="text-base font-semibold tracking-tight mb-4">Failure trend</h2>
              <FailureTrendChart runs={runs} />
            </div>
          </MotionSection>

          {/* Section 6 -- Analytics row (3-up, exactly 3 cells). */}
          <MotionSection className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-8 md:px-12 pb-12">
            <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
              <h2 className="text-base font-semibold tracking-tight mb-4">Cost by workflow</h2>
              {analytics.costs.length > 0 ? (
                <AnalyticsCostChart data={analytics.costs} />
              ) : (
                <p className="text-sm text-muted">No cost data yet.</p>
              )}
            </div>
            <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
              <h2 className="text-base font-semibold tracking-tight mb-4">Slowest spans</h2>
              {analytics.slowSpans.length > 0 ? (
                <AnalyticsSlowestSpans data={analytics.slowSpans} />
              ) : (
                <p className="text-sm text-muted">No span timing data yet.</p>
              )}
            </div>
            <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
              <h2 className="text-base font-semibold tracking-tight mb-4">Token-heavy spans</h2>
              {analytics.tokenSpans.length > 0 ? (
                <AnalyticsTokenSpans data={analytics.tokenSpans} />
              ) : (
                <p className="text-sm text-muted">No token data yet.</p>
              )}
            </div>
          </MotionSection>
        </>
      )}
    </div>
  );
}
