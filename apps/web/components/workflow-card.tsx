import { Workflow } from "lucide-react";
import type { Workflow as WorkflowType } from "@/lib/types";

/**
 * WorkflowCard -- compact 8-shade tile used in the dashboard's top-workflows
 * row and inside the workflows library grid. Per Shape Consistency Lock:
 * rounded-2xl (16px) surface card, never a pill or input radius. Per
 * Grounded Until Touched: flat at rest, lifts 1px on hover.
 */
export function WorkflowCard({ workflow }: { workflow: WorkflowType }) {
  return (
    <div className="group flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-px hover:shadow-[var(--shadow-soft)]">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent-subtle text-accent">
        <Workflow className="h-4 w-4" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {workflow.name}
        </p>
        <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted">
          {workflow.framework ?? "custom"} · v{workflow.current_version ?? "1"}
        </p>
      </div>
    </div>
  );
}