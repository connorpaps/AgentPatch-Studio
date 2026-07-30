"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSimilarFailures, SimilarFailure } from "@/lib/api";

interface SimilarFailuresProps {
  runId: string;
}

/**
 * SimilarFailures -- card list of related failures. Shape: rounded-2xl
 * per Shape Consistency Lock (cards, not press targets). Mono-measured
 * run IDs and failure-type labels. Similarity bar uses --data-failure
 * (rose-600 light / rose-400 dark) so the eye scans fast but the
 * underlying state is what the text carries.
 */
export function SimilarFailures({ runId }: SimilarFailuresProps) {
  // Tri-state sentinel for the three render outcomes: not-yet-loaded (null),
  // loaded-with-data ([]), loaded-with-error (string). The early-return order
  // below is load-bearing for the TypeScript narrowing -- after the null-check,
  // TS narrows `failures` from `[] | null` to `[]`.
  const [failures, setFailures] = useState<SimilarFailure[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Resetting failures/error synchronously at effect start is load-bearing:
    // SimilarFailures renders in the right rail of /runs/[id], so on runId
    // change the user is staring at the new run's id with the previous run's
    // data unless we clear state here. We accept the cascading render
    // because the alternative is a real UX regression (stale data shown
    // under the wrong runId).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFailures(null);
    // ESLint's react-hooks/set-state-in-effect rule groups this setState
    // with the failures reset we explicitly suppress above, so a separate
    // disable directive is not required. Resetting error alongside failures
    // keeps the right-rail state consistent across a runId change.
    setError(null);
    getSimilarFailures(runId)
      .then((data) => {
        if (!cancelled) setFailures(data);
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Failed to load");
      });
    return () => {
      cancelled = true;
    };
  }, [runId]);

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-md border border-data-failure/30 bg-data-failure-soft p-3 text-sm text-data-failure"
      >
        {error}
      </div>
    );
  }

  if (failures === null) {
    return <p className="text-sm text-muted">Loading similar failures...</p>;
  }

  if (failures.length === 0) {
    return <p className="text-sm text-muted">No similar failures found.</p>;
  }

  return (
    <div className="space-y-2">
      {failures.map((failure) => (
        <Link
          key={failure.run_id}
          href={`/runs/${failure.run_id}`}
          className="group block rounded-2xl border border-border bg-surface p-3 shadow-sm transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-px hover:shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-accent/40"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-xs text-muted">
              {failure.run_id.slice(0, 8)}
            </span>
            <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-data-failure">
              {failure.failure_type || "unknown"}
            </span>
          </div>
          {failure.user_query && (
            <p className="mt-1 truncate text-sm">{failure.user_query}</p>
          )}
          <div
            className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-data-failure-soft"
            aria-hidden
          >
            <div
              className="h-1.5 rounded-full bg-data-failure transition-[width] duration-300 ease-out"
              style={{
                width: `${Math.round((failure.similarity_score || 0) * 100)}%`,
              }}
            />
          </div>
          <p className="mt-1 text-right font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted">
            {(failure.similarity_score * 100).toFixed(0)}% similar
          </p>
        </Link>
      ))}
    </div>
  );
}
