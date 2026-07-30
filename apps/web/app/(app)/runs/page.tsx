"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getRuns, RunFilters } from "@/lib/api";
import type { Run } from "@/lib/types";
import { RunsBanner } from "@/components/runs-banner";
import { RunsFilter } from "@/components/runs-filter";
import { RunsTable } from "@/components/runs-table";

/**
 * RunsPage -- the engineer's daily entry point. Per the dashboard
 * composition rhythm: banner -> header (no eyebrow, plain h1 +
 * subtext) -> filter card -> runs table. The "Browse workflows"
 * affordance is the one named kicker that the page earns; nothing
 * else uses a tracked uppercase label.
 */
export default function RunsPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [filters, setFilters] = useState<RunFilters>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getRuns(filters).then((data) => {
      if (!cancelled) {
        setRuns(data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [filters]);

  return (
    <>
      <RunsBanner />
      <div className="px-8 md:px-12 py-8 md:py-10 space-y-6">
        <header className="flex items-end justify-between gap-6 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
              Runs
            </h1>
            <p className="mt-2 max-w-[55ch] text-sm text-muted leading-relaxed">
              Inspect every agent execution. Filter by status, review queue, or
              search the query and output text.
            </p>
          </div>
          <Link
            href="/workflows"
            className="text-sm font-medium text-accent transition-transform duration-150 ease-out hover:translate-x-0.5 hover:text-accent-hover focus:outline-none focus:ring-2 focus:ring-accent/40 rounded-sm"
          >
            Browse workflows →
          </Link>
        </header>

        <RunsFilter onChange={setFilters} />

        {loading ? (
          <RunsTableSkeleton />
        ) : (
          <RunsTable runs={runs} />
        )}
      </div>
    </>
  );
}

/**
 * RunsTableSkeleton -- calm surface skeleton matching the runs-table
 * chrome. No shimmer, no spinner; the engineer should see where the
 * table will land before it does.
 */
function RunsTableSkeleton() {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm"
      aria-hidden
    >
      <div className="border-b border-border bg-surface-soft h-10" />
      <div className="px-5 py-5 space-y-4">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-4 w-full rounded bg-surface-soft" />
        ))}
      </div>
    </div>
  );
}
