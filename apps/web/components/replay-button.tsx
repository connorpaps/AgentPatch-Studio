"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ChevronDown } from "lucide-react";
import { replayRun, ReplayMode } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PendingConfirm {
  mode: ReplayMode;
  tools: string[];
  warning: string;
}

/**
 * ReplayButton -- per DESIGN.md Do's & Don'ts, the modal pattern is
 * reserved for the replay confirm (irreversible action). The dropdown
 * above is a press-target list (rounded-md); the modal itself is a
 * rounded-2xl dialog with a teal-amber warning surface.
 *
 * Wave C: while loading (i.e. the engine is re-running a trace), the
 * full button group gets the .replay-pulse kinetic ring -- a single
 * CSS-ring keyframe defined in globals.css. The pulse wraps both the
 * main trigger and the dropdown chevron so the rounded-md rhythm
 * stays intact. Reduced-motion users see a static disabled button
 * without the ring animation (handled in globals.css).
 */
export function ReplayButton({
  runId,
  fullReplayTools = [],
}: {
  runId: string;
  fullReplayTools?: string[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<ReplayMode>("metadata");
  const [isOpen, setIsOpen] = useState(false);
  const [confirm, setConfirm] = useState<PendingConfirm | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Capture the trigger element so focus can return when the modal closes.
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
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
      // Capture the trigger so focus can return when the modal closes.
      triggerRef.current = (document.activeElement as HTMLElement | null) ?? null;
      setConfirm({
        mode: selectedMode,
        tools,
        warning:
          tools.length === 0
            ? "Full re-execution is enabled, but no read-only tools are recognized for this run."
            : `Full re-execution will re-run the following tools:\n\u2022 ${tools.join(
                "\n\u2022 ",
              )}\n\nThese calls may hit live systems. Confirm only for approved demo scenarios.`,
      });
      return;
    }
    await commitReplay(selectedMode);
  }

  function closeConfirm() {
    setConfirm(null);
    // Return focus to the element that opened the modal (the trigger button).
    requestAnimationFrame(() => {
      triggerRef.current?.focus();
      triggerRef.current = null;
    });
  }

  // ESC closes the modal; Tab is allowed to cycle within the modal surface
  // (focus-trap-by-positive-effect: every focusable surface is inside the
  // dialog, so the browser will not leave it via Tab). We deliberately
  // depend ONLY on `confirm` so the listener attaches/cleans up exactly
  // once per modal lifetime; closeConfirm intentionally closes over the
  // latest state via the stale handler -- no exhaustive-deps needed here.
  useEffect(() => {
    if (!confirm) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeConfirm();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [confirm]);

  return (
    <>
      <div
        ref={containerRef}
        className={cn(
          "relative inline-flex items-center rounded-md",
          loading && "replay-pulse",
        )}
      >
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
          aria-label="Toggle replay mode"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          className={cn(
            "ml-2 inline-flex items-center justify-center rounded-md border border-border px-2.5 py-2 text-xs text-muted transition-colors duration-150 ease-out hover:bg-surface-soft hover:text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40",
            loading && "pointer-events-none",
          )}
        >
          <ChevronDown className="h-3.5 w-3.5" aria-hidden />
        </button>
        {isOpen && (
          <div
            role="listbox"
            aria-label="Replay mode"
            className="absolute right-0 top-full z-10 mt-1 w-64 overflow-hidden rounded-md border border-border bg-surface p-1 shadow-sm"
          >
            {(["metadata", "partial", "full"] as ReplayMode[]).map((option) => (
              <button
                key={option}
                role="option"
                aria-selected={mode === option}
                onClick={() => {
                  setMode(option);
                  setIsOpen(false);
                }}
                className={`block w-full rounded-sm px-3 py-2 text-left text-sm transition-colors duration-150 ease-out focus:outline-none focus:ring-2 focus:ring-accent/40 ${
                  mode === option
                    ? "bg-accent-subtle text-accent"
                    : "hover:bg-surface-soft"
                }`}
              >
                <span className="font-medium capitalize">{option} replay</span>
                <p className="mt-0.5 text-xs leading-snug text-muted">
                  {option === "metadata" &&
                    "Show the run as a simulation without re-executing."}
                  {option === "partial" &&
                    "Re-run model calls while reusing tool/retrieval outputs."}
                  {option === "full" &&
                    "Re-run model calls and read-only tools (requires ALLOW_FULL_REPLAY)."}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {confirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="replay-confirm-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
        >
          <div
            // Auto-focus the surface so Tab cycles within the dialog
            // (the surface owns every focusable child below).
            ref={(el) => el?.focus()}
            tabIndex={-1}
            className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl outline-none"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-data-retry-soft text-data-retry">
                <AlertTriangle className="h-5 w-5" aria-hidden />
              </div>
              <div className="flex-1">
                <h3
                  id="replay-confirm-title"
                  className="text-sm font-semibold tracking-tight"
                >
                  Confirm full replay
                </h3>
                <pre className="mt-2 whitespace-pre-wrap rounded-md border border-border bg-background p-3 font-mono text-xs leading-relaxed text-muted">
                  {confirm.warning}
                </pre>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={closeConfirm}
                disabled={loading}
                autoFocus
              >
                Cancel
              </Button>
              <Button
                onClick={() => commitReplay(confirm.mode)}
                disabled={loading}
              >
                {loading ? "Triggering…" : "Run full replay"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
