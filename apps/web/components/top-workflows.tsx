"use client";

import Link from "next/link";
import type { Workflow } from "@/lib/types";

interface TopWorkflowsProps {
  workflows: Workflow[];
  runsByWorkflow?: Record<string, number>;
}

/**
 * TopWorkflows -- the dashboard's "Top workflows" bento body. Five rows,
 * each a link to the runs explorer filtered to that workflow. Shape:
 * rounded-md per Shape Consistency Lock (rows are press targets, not
 * cards). Mono-measured framework label and run count to the right.
 */
export function TopWorkflows({
  workflows,
  runsByWorkflow = {},
}: TopWorkflowsProps) {
  const sorted = [...workflows].sort(
    (a, b) => (runsByWorkflow[b.id] || 0) - (runsByWorkflow[a.id] || 0),
  );

  return (
    <div className="space-y-2">
      {sorted.slice(0, 5).map((workflow) => {
        const count = runsByWorkflow[workflow.id] || 0;
        return (
          <Link
            key={workflow.id}
            href={`/runs?workflow_id=${workflow.id}`}
            className="group flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2.5 transition-colors duration-150 ease-out hover:bg-surface-soft hover:border-border-strong focus:outline-none focus:ring-2 focus:ring-accent/40"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {workflow.name}
              </p>
              {workflow.framework && (
                <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted">
                  {workflow.framework}
                </p>
              )}
            </div>
            <span className="shrink-0 whitespace-nowrap font-mono text-xs tabular-nums text-muted transition-colors duration-150 ease-out group-hover:text-foreground">
              {count} {count === 1 ? "run" : "runs"}
            </span>
          </Link>
        );
      })}
      {sorted.length === 0 && (
        <p className="text-sm text-muted">No workflows yet.</p>
      )}
    </div>
  );
}