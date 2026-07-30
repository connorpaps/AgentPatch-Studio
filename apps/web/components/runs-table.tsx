import Link from "next/link";
import type { Run } from "@/lib/types";
import { StatusBadge } from "./status-badge";

interface RunsTableProps {
  runs: Run[];
}

/**
 * RunsTable -- operate-mode density table. Shape: rounded-2xl per Shape
 * Consistency Lock. Column headers use mono-measured tracked labels (the
 * one named kicker per table the design system permits); rows use a soft
 * surface-soft hover so the engineer's eye lands on the row they intend.
 */
export function RunsTable({ runs }: RunsTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-soft">
            <th
              scope="col"
              className="px-5 py-3 font-mono text-[10.5px] font-medium uppercase tracking-[0.18em] text-muted"
            >
              Status
            </th>
            <th
              scope="col"
              className="px-5 py-3 font-mono text-[10.5px] font-medium uppercase tracking-[0.18em] text-muted"
            >
              Query
            </th>
            <th
              scope="col"
              className="px-5 py-3 font-mono text-[10.5px] font-medium uppercase tracking-[0.18em] text-muted text-right"
            >
              Duration
            </th>
            <th
              scope="col"
              className="px-5 py-3 font-mono text-[10.5px] font-medium uppercase tracking-[0.18em] text-muted"
            >
              Failure type
            </th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr
              key={run.id}
              className="border-b border-border last:border-b-0 transition-colors duration-150 ease-out hover:bg-surface-soft focus-within:bg-surface-soft"
            >
              <td className="px-5 py-3.5">
                <Link
                  href={`/runs/${run.id}`}
                  className="block rounded-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                  aria-label={`Open run ${run.id.slice(0, 8)}`}
                >
                  <StatusBadge status={run.status} />
                </Link>
              </td>
              <td className="px-5 py-3.5 max-w-md">
                <Link
                  href={`/runs/${run.id}`}
                  className="block truncate text-foreground transition-colors duration-150 ease-out hover:text-accent focus:outline-none focus:text-accent"
                >
                  {run.user_query || (
                    <span className="text-muted italic">No query</span>
                  )}
                </Link>
              </td>
              <td className="px-5 py-3.5 whitespace-nowrap text-right font-mono text-xs tabular-nums text-muted">
                {run.duration_ms ? `${run.duration_ms}ms` : "—"}
              </td>
              <td className="px-5 py-3.5 text-xs text-muted">
                {run.failure_type ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {runs.length === 0 && (
        <div className="px-5 py-12 text-center">
          <p className="text-sm font-medium text-foreground">
            No runs match these filters.
          </p>
          <p className="mt-1 text-xs text-muted">
            Adjust the filters above, or send a trace to populate the explorer.
          </p>
        </div>
      )}
    </div>
  );
}