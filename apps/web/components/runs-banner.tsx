import { cn } from "@/lib/utils";

/**
 * RunsBanner -- the runs page chrome.
 *
 * Four swimlanes stacked vertically, each showing one seeded
 * scenario's workflow + model on the left and a Gantt-style
 * latency strip on the right. The right-edge mask fades the
 * strip into the page so the chrome reads as console output
 * wallpaper rather than primary surface -- per Operate mode
 * the runs table below carries the foreground.
 *
 * Segment shades come from the calibrated --data-* palette so
 * success/failure/retry/latency tones never bleed into the
 * chrome accent (teal):
 *   latency  -> --data-latency   (sky-600)
 *   success  -> --data-success   (emerald-600)
 *   failure  -> --data-failure   (rose-600)
 *   retry    -> --data-retry     (amber-800)
 *
 * Layout (one swimlane per row, left to right):
 *   1. workflow label (mono, uppercase tracked) stacked over
 *      " · model" so two short mono lines never collide.
 *   2. a horizontal strip of segment bars sized by relative
 *      width % -- their full labels live in `title` for hover
 *      (eliminates the previous absolute-positioned label
 *      overlap that jumbled multi-segment rows).
 *   3. a single-property summary ("first two words of each
 *      segment") so the row reads as narrative without
 *      needing a label per bar.
 *
 * The mask gradient fades from full opacity through 30% to
 * transparent at 92% so the right edge disappears.
 *
 * Server Component: zero state, zero effects, fully static.
 */

type SegmentTone = "latency" | "success" | "failure" | "retry";

type Segment = {
  /** CSS left% relative to the swimlane width. */
  left: string;
  /** CSS width% relative to the swimlane width. */
  width: string;
  tone: SegmentTone;
  /** Full label, surfaced via title on hover. */
  label: string;
};

type Row = {
  workflow: string;
  model: string;
  segments: Segment[];
};

const TONE_BG: Record<SegmentTone, string> = {
  latency: "bg-data-latency",
  success: "bg-data-success",
  failure: "bg-data-failure",
  retry: "bg-data-retry",
};


// Each swimlane maps a real seed scenario (apps/api/scripts/seed.py).
// Workflows + span names + failure taxonomy are tied to the seeded
// scenarios rather than generic placeholders so the chrome reads as
// authentic console output to anyone who reads the failure taxonomy.
//
//   Row 1 -- INCIDENT_FAILURES[0] timeout on INC-2041 gateway 504s.
//   Row 2 -- SUPPORT_FAILURES[0] stale_source on refund-policy.
//   Row 3 -- INCIDENT_FAILURES[1] wrong_tool on INC-2043 Redis OOM.
//   Row 4 -- COMPLIANCE happy path through parse / translate / classify.
const ROWS: Row[] = [
  {
    workflow: "it-incident-triage-agent",
    model: "gpt-5",
    segments: [
      {
        left: "4%",
        width: "60%",
        tone: "failure",
        label: "classify_severity 30.0s timeout",
      },
    ],
  },
  {
    workflow: "support-policy-agent",
    model: "claude-sonnet-4.6",
    segments: [
      {
        left: "4%",
        width: "18%",
        tone: "retry",
        label: "retrieve_policy_docs 800ms stale_source",
      },
      {
        left: "26%",
        width: "14%",
        tone: "latency",
        label: "validate_grounding 420ms",
      },
      {
        left: "44%",
        width: "32%",
        tone: "success",
        label: "GPT-5 v12.0.0 score 0.95",
      },
    ],
  },
  {
    workflow: "it-incident-triage-agent",
    model: "kimi-k2.7",
    segments: [
      {
        left: "4%",
        width: "16%",
        tone: "latency",
        label: "classify_severity 410ms",
      },
      {
        left: "24%",
        width: "22%",
        tone: "retry",
        label: "lookup_runbook 180ms wrong_tool",
      },
    ],
  },
  {
    workflow: "compliance-review-agent",
    model: "gemini-2.5-pro",
    segments: [
      {
        left: "4%",
        width: "18%",
        tone: "latency",
        label: "parse_document 1.5s",
      },
      {
        left: "26%",
        width: "14%",
        tone: "latency",
        label: "translate_clauses 2.0s",
      },
      {
        left: "44%",
        width: "20%",
        tone: "success",
        label: "classify_risk low",
      },
    ],
  },
];

export function RunsBanner() {
  return (
    <div
      className="relative h-[210px] md:h-[240px] w-full overflow-hidden bg-canvas"
      role="presentation"
      aria-hidden
    >
      <div
        className="flex h-full flex-col justify-center gap-1.5 px-4 py-3"
        style={{
          maskImage:
            "linear-gradient(to right, black 0%, black 30%, transparent 92%)",
          WebkitMaskImage:
            "linear-gradient(to right, black 0%, black 30%, transparent 92%)",
        }}
      >
        {ROWS.map((row) => (
          <div
            key={`${row.workflow}-${row.model}`}
            className="flex items-center gap-3"
          >
            {/* Left column -- workflow + model in two stacked mono lines.
                text-muted (stone-500) keeps caption contrast above WCAG
                AA at 10px on the canvas surface. */}
            <div className="flex w-[100px] sm:w-[140px] md:w-[180px] shrink-0 flex-col gap-0.5">
              <p className="truncate font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                {row.workflow}
              </p>
              <p className="truncate font-mono text-[10.5px] text-muted">
                · {row.model}
              </p>
            </div>

            {/* Strip column -- bars sized to relative width. Full label
                always available via `title` so hover preserves detail.
                No inline per-row text label -- eliminates the absolute
                positioning collisions in the previous banner. */}
            <div className="relative h-3 min-w-0 flex-1">
              {row.segments.map((seg) => (
                <div
                  key={seg.label}
                  title={seg.label}
                  className={cn(
                    "absolute top-1/2 h-1.5 -translate-y-1/2 rounded-[2px]",
                    TONE_BG[seg.tone],
                  )}
                  style={{ left: seg.left, width: seg.width }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
