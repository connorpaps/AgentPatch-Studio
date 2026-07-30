/**
 * Run-detail loading skeleton. Mirrors the redesigned runs/[id]/page.tsx
 * layout: header (breadcrumbs + h1 + status + buttons) and the two-pane
 * grid (timeline + sidebar). Calm static frames, no spinner.
 */
export default function Loading() {
  return (
    <div
      className="space-y-6 px-8 py-8 md:px-12 md:py-10"
      aria-hidden
    >
      <div className="flex items-end justify-between gap-6">
        <div className="space-y-3">
          <div className="h-3 w-64 rounded bg-surface-soft" />
          <div className="h-7 w-48 rounded bg-surface-soft" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-28 rounded-md bg-surface-soft" />
          <div className="h-9 w-24 rounded-md bg-surface-soft" />
          <div className="h-6 w-16 rounded-full bg-surface-soft" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-border bg-surface/50 h-[600px]" />
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-surface/50 h-48" />
          <div className="rounded-2xl border border-border bg-surface/50 h-48" />
        </div>
      </div>
    </div>
  );
}