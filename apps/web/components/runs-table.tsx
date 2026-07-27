import Link from "next/link";
import type { Run } from "@/lib/types";
import { StatusBadge } from "./status-badge";

interface RunsTableProps {
  runs: Run[];
}

export function RunsTable({ runs }: RunsTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-stone-50 text-xs uppercase text-muted">
          <tr>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Query</th>
            <th className="px-4 py-3 font-medium">Duration</th>
            <th className="px-4 py-3 font-medium">Failure Type</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {runs.map((run) => (
            <tr key={run.id} className="hover:bg-stone-50/50">
              <td className="px-4 py-3">
                <Link href={`/runs/${run.id}`} className="block">
                  <StatusBadge status={run.status} />
                </Link>
              </td>
              <td className="px-4 py-3 max-w-md truncate">
                <Link href={`/runs/${run.id}`} className="hover:text-accent">
                  {run.user_query || "No query"}
                </Link>
              </td>
              <td className="px-4 py-3 tabular-nums">{run.duration_ms ? `${run.duration_ms}ms` : "—"}</td>
              <td className="px-4 py-3 text-muted">{run.failure_type || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {runs.length === 0 && (
        <div className="px-4 py-8 text-center text-sm text-muted">No runs yet.</div>
      )}
    </div>
  );
}
