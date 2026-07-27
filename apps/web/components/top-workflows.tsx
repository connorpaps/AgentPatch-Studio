"use client";

import { Workflow } from "@/lib/types";

interface TopWorkflowsProps {
  workflows: Workflow[];
  runsByWorkflow?: Record<string, number>;
}

export function TopWorkflows({ workflows, runsByWorkflow = {} }: TopWorkflowsProps) {
  const sorted = [...workflows].sort(
    (a, b) => (runsByWorkflow[b.id] || 0) - (runsByWorkflow[a.id] || 0)
  );

  return (
    <div className="space-y-3">
      {sorted.slice(0, 5).map((workflow) => (
        <div
          key={workflow.id}
          className="flex items-center justify-between rounded-md border border-border bg-background p-3"
        >
          <div>
            <p className="text-sm font-medium">{workflow.name}</p>
            {workflow.framework && (
              <p className="text-xs text-muted">{workflow.framework}</p>
            )}
          </div>
          <span className="text-xs text-muted">
            {runsByWorkflow[workflow.id] || 0} runs
          </span>
        </div>
      ))}
      {sorted.length === 0 && (
        <p className="text-sm text-muted">No workflows yet.</p>
      )}
    </div>
  );
}
