"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { replayRun, ReplayMode } from "@/lib/api";
import { Button } from "@/components/ui/button";

interface PendingConfirm {
  mode: ReplayMode;
  tools: string[];
  warning: string;
}

export function ReplayButton({ runId, fullReplayTools = [] }: { runId: string; fullReplayTools?: string[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<ReplayMode>("metadata");
  const [isOpen, setIsOpen] = useState(false);
  const [confirm, setConfirm] = useState<PendingConfirm | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function commitReplay(selectedMode: ReplayMode) {
    setLoading(true);
    try {
      const result = await replayRun(runId, selectedMode);
      if (result.mode === "async" && result.task_id) {
        // Async dispatch — for v1 we just navigate back to the run list and let
        // the user observe the new run once the worker writes it.
        router.push("/runs");
        return;
      }
      const newRunId = result.new_run_id || result.result?.new_run_id;
      if (newRunId) {
        router.push(`/runs/${newRunId}`);
      } else {
        router.push("/runs");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleReplay(selectedMode: ReplayMode) {
    setIsOpen(false);
    if (selectedMode === "full") {
      const tools = Array.isArray(fullReplayTools) ? fullReplayTools : [];
      setConfirm({
        mode: selectedMode,
        tools,
        warning:
          tools.length === 0
            ? "Full re-execution is enabled, but no read-only tools are recognized for this run."
            : `Full re-execution will re-run the following tools:\n• ${tools.join(
                "\n• ",
              )}\n\nThese calls may hit live systems. Confirm only for approved demo scenarios.`,
      });
      return;
    }
    await commitReplay(selectedMode);
  }

  return (
    <>
      <div ref={containerRef} className="relative inline-flex items-center">
        <Button
          variant="outline"
          onClick={() => handleReplay(mode)}
          disabled={loading}
        >
          {loading
            ? "Replaying..."
            : mode === "full"
            ? "Full replay"
            : mode === "partial"
            ? "Partial replay"
            : "Metadata replay"}
        </Button>
        <button
          onClick={() => setIsOpen((open) => !open)}
          disabled={loading}
          className="ml-2 rounded-md border border-border px-2 py-2 text-xs text-muted hover:text-foreground"
          aria-label="Toggle replay mode"
        >
          ▼
        </button>
        {isOpen && (
          <div className="absolute right-0 top-full z-10 mt-1 w-56 rounded-md border border-border bg-surface p-1 shadow-sm">
            {(["metadata", "partial", "full"] as ReplayMode[]).map((option) => (
              <button
                key={option}
                onClick={() => {
                  setMode(option);
                  setIsOpen(false);
                }}
                className={`block w-full rounded px-3 py-2 text-left text-sm ${
                  mode === option ? "bg-accent/10 text-accent" : "hover:bg-stone-100"
                }`}
              >
                <span className="font-medium capitalize">{option} replay</span>
                <p className="text-xs text-muted mt-0.5 leading-snug">
                  {option === "metadata" && "Show the run as a simulation without re-executing."}
                  {option === "partial" && "Re-run model calls while reusing tool/retrieval outputs."}
                  {option === "full" && "Re-run model calls and read-only tools (requires ALLOW_FULL_REPLAY)."}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {confirm && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-50 text-amber-700">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold">Confirm full replay</h3>
                <pre className="mt-2 whitespace-pre-wrap rounded-md border border-border bg-background p-3 text-xs text-muted">
                  {confirm.warning}
                </pre>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirm(null)} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={() => commitReplay(confirm.mode)} disabled={loading}>
                {loading ? "Triggering…" : "Run full replay"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
