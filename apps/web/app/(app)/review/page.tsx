"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getRuns, updateReviewStatus } from "@/lib/api";
import type { Run } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";

export default function ReviewQueuePage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    const data = await getRuns({ requires_review: true });
    setRuns(data);
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    getRuns({ requires_review: true }).then((data) => {
      if (!cancelled) {
        setRuns(data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function markReviewed(runId: string) {
    await updateReviewStatus(runId, false);
    await refresh();
  }

  const pending = runs.length;

  return (
    <>
      <div
        className="relative h-[160px] md:h-[200px] overflow-hidden bg-canvas"
        aria-hidden
      >
        <img
          src="https://picsum.photos/seed/agentpatch-radar-screen/1200/280"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-surface/70 via-surface/65 to-surface" />
      </div>
      <div className="space-y-6 px-8 py-8 md:px-12 md:py-10">
      <header className="flex items-end justify-between gap-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Review queue
          </h1>
          <p className="mt-2 max-w-[55ch] text-sm text-muted leading-relaxed">
            Runs flagged for human review or policy-sensitive review. Mark
            reviewed to clear them from this queue.
          </p>
        </div>
        <Link
          href="/runs"
          className="text-sm font-medium text-accent transition-transform duration-150 ease-out hover:translate-x-0.5 hover:text-accent-hover focus:outline-none focus:ring-2 focus:ring-accent/40 rounded-sm"
        >
          Open runs explorer →
        </Link>
      </header>

      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted">
              Pending reviews
            </p>
            <p className="mt-1 font-mono text-3xl font-semibold tabular-nums">
              {loading ? "—" : pending}
            </p>
          </div>
          <StatusBadge status={loading ? "running" : pending > 0 ? "warning" : "ok"} />
        </div>
      </section>

      {loading ? (
        <div
          className="rounded-2xl border border-border bg-surface p-12 text-center shadow-sm"
          aria-hidden
        >
          <div className="mx-auto max-w-md space-y-3">
            <div className="mx-auto h-4 w-48 rounded bg-surface-soft" />
            <div className="mx-auto h-3 w-64 rounded bg-surface-soft" />
          </div>
        </div>
      ) : pending === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-12 text-center shadow-sm">
          <p className="text-sm font-medium text-foreground">
            No runs currently require review
          </p>
          <p className="mt-1 text-xs text-muted">
            The queue is clear. New policy-sensitive runs will land here as
            they arrive.
          </p>
        </div>
      ) : (
        <section className="space-y-2">
          {runs.map((run) => (
            <div
              key={run.id}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-px hover:shadow-[var(--shadow-soft)] sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {run.user_query || "No query"}
                </p>
                <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted">
                  {run.id}
                </p>
                {run.failure_type && (
                  <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.18em] text-data-failure">
                    Failure: {run.failure_type}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={run.status} />
                <Button
                  variant="outline"
                  onClick={() => markReviewed(run.id)}
                >
                  Mark reviewed
                </Button>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
    </>
  );
}