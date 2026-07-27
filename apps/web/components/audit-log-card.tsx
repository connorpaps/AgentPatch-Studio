"use client";

import { useEffect, useState } from "react";
import { listAuditLogs, AuditLogEntry } from "@/lib/api";

interface AuditLogCardProps {
  projectId: string | null | undefined;
  runId: string;
}

export function AuditLogCard({ projectId, runId }: AuditLogCardProps) {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!projectId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    listAuditLogs(projectId, { resource_id: runId, limit: 25 })
      .then((data) => {
        if (!cancelled) setEntries(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load audit log");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, runId]);

  if (!projectId) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-surface p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Audit log
        </h2>
        <p className="mt-2 text-sm text-muted">
          Switch to a project-scoped API key in Settings to see audit events for this run.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Audit log
        </h2>
        <span className="text-xs text-muted">
          {loading ? "Loading…" : `${entries.length} event${entries.length === 1 ? "" : "s"}`}
        </span>
      </div>
      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800">
          {error}
        </p>
      )}
      {!loading && entries.length === 0 && (
        <p className="text-sm text-muted">
          No audit events captured for this run yet. Reviewing or annotating will
          appear here.
        </p>
      )}
      {entries.length > 0 && (
        <ul className="divide-y divide-border rounded-md border border-border bg-background">
          {entries.map((entry) => {
            const when = new Date(entry.created_at).toLocaleString();
            return (
              <li key={entry.id} className="flex items-start justify-between gap-3 p-3 text-xs">
                <div className="min-w-0">
                  <p className="font-medium">{entry.action}</p>
                  {entry.note && <p className="mt-0.5 text-muted">{entry.note}</p>}
                  <p className="mt-0.5 text-[11px] text-muted">
                    {entry.actor.length > 24 ? `${entry.actor.slice(0, 12)}…${entry.actor.slice(-6)}` : entry.actor}
                  </p>
                </div>
                <span className="shrink-0 text-muted">{when}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
