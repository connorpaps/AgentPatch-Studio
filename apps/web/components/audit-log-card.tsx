"use client";

import { useEffect, useState } from "react";
import { listAuditLogs, AuditLogEntry } from "@/lib/api";

interface AuditLogCardProps {
  projectId: string | null | undefined;
  runId: string;
}

/**
 * AuditLogCard -- the audit trail surface for a run. Per Shape
 * Consistency Lock: rounded-2xl surface. Per Mono-Measured Readouts:
 * timestamps and actor IDs in Geist_Mono so the engineer can scan
 * long sequences without eye fatigue.
 */
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
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Failed to load audit log");
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
      <div className="rounded-2xl border border-dashed border-border bg-surface p-5 shadow-sm">
        <h2 className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted">
          Audit log
        </h2>
        <p className="mt-2 text-sm text-muted">
          Switch to a project-scoped API key in Settings to see audit events for
          this run.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted">
          Audit log
        </h2>
        <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted">
          {loading ? "Loading..." : `${entries.length} event${entries.length === 1 ? "" : "s"}`}
        </span>
      </div>
      {error && (
        <div className="rounded-md border border-data-failure/30 bg-data-failure-soft p-2 text-xs text-data-failure">
          {error}
        </div>
      )}
      {!loading && entries.length === 0 && (
        <p className="text-sm text-muted">
          No audit events captured for this run yet. Reviewing or annotating
          will appear here.
        </p>
      )}
      {entries.length > 0 && (
        <ul className="overflow-hidden rounded-md border border-border bg-background">
          {entries.map((entry, i) => {
            const when = new Date(entry.created_at).toLocaleString();
            return (
              <li
                key={entry.id}
                className={`flex items-start justify-between gap-3 p-3 text-xs ${
                  i > 0 ? "border-t border-border" : ""
                }`}
              >
                <div className="min-w-0">
                  <p className="font-medium">{entry.action}</p>
                  {entry.note && (
                    <p className="mt-0.5 text-muted">{entry.note}</p>
                  )}
                  <p className="mt-0.5 font-mono text-[11px] text-muted">
                    {entry.actor.length > 24
                      ? `${entry.actor.slice(0, 12)}…${entry.actor.slice(-6)}`
                      : entry.actor}
                  </p>
                </div>
                <span className="shrink-0 font-mono tabular-nums text-muted">
                  {when}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}