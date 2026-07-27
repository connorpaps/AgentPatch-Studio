"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSimilarFailures, SimilarFailure } from "@/lib/api";

interface SimilarFailuresProps {
  runId: string;
}

export function SimilarFailures({ runId }: SimilarFailuresProps) {
  const [failures, setFailures] = useState<SimilarFailure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getSimilarFailures(runId)
      .then(setFailures)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [runId]);

  if (loading) {
    return <p className="text-sm text-muted">Loading similar failures...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
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
          className="block rounded-md border border-border bg-surface p-3 hover:border-accent transition-colors"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-mono text-muted">{failure.run_id.slice(0, 8)}</span>
            <span className="text-xs font-medium text-red-600">{failure.failure_type || "unknown"}</span>
          </div>
          {failure.user_query && (
            <p className="mt-1 truncate text-sm">{failure.user_query}</p>
          )}
          <div className="mt-2 h-1.5 w-full rounded-full bg-stone-100">
            <div
              className="h-1.5 rounded-full bg-red-500"
              style={{ width: `${Math.round((failure.similarity_score || 0) * 100)}%` }}
            />
          </div>
          <p className="mt-1 text-right text-xs text-muted">
            {(failure.similarity_score * 100).toFixed(0)}% similar
          </p>
        </Link>
      ))}
    </div>
  );
}
