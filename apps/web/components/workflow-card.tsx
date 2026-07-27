import { Workflow } from "lucide-react";
import type { Workflow as WorkflowType } from "@/lib/types";

export function WorkflowCard({ workflow }: { workflow: WorkflowType }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-stone-100 text-stone-600">
          <Workflow className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{workflow.name}</p>
          <p className="text-xs text-muted">{workflow.current_version || "v1"}</p>
        </div>
      </div>
    </div>
  );
}
