"use client";

import { useEffect, useState } from "react";
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

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Review Queue</h1>
        <p className="text-sm text-muted mt-1">
          Runs flagged for human review or policy-sensitive review
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">Pending Reviews</h2>
            <p className="text-2xl font-semibold tabular-nums mt-1">
              {loading ? "—" : runs.length}
            </p>
          </div>
          <StatusBadge status={loading ? "running" : runs.length > 0 ? "warning" : "ok"} />
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted">Loading review queue...</div>
      ) : runs.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-8 text-center text-sm text-muted">
          No runs currently require review.
        </div>
      ) : (
        <div className="space-y-3">
          {runs.map((run) => (
            <div
              key={run.id}
              className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                <p className="font-medium text-sm">{run.user_query || "No query"}</p>
                <p className="text-xs text-muted mt-1 font-mono">{run.id}</p>
                </div>
                <Button variant="outline" onClick={() => markReviewed(run.id)}>
                  Mark Reviewed
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
