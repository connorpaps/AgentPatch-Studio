"use client";

import { useEffect, useState } from "react";
import { getRuns, RunFilters } from "@/lib/api";
import type { Run } from "@/lib/types";
import { RunsFilter } from "@/components/runs-filter";
import { RunsTable } from "@/components/runs-table";

export default function RunsPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [filters, setFilters] = useState<RunFilters>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
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
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Runs</h1>
        <p className="text-sm text-muted mt-1">Inspect every agent execution</p>
      </div>
      <RunsFilter onChange={setFilters} />
      {loading ? (
        <div className="text-sm text-muted">Loading runs...</div>
      ) : (
        <RunsTable runs={runs} />
      )}
    </div>
  );
}
