/**
 * Global loading skeleton. Calm surface frame; no spinner, no shimmer.
 * Mirrors the dashboard's header + bento so the engineer lands in a
 * stable visual context before the data arrives.
 */
export default function Loading() {
  return (
    <div
      className="space-y-6 px-8 py-8 md:px-12 md:py-10"
      aria-hidden
    >
      <div className="space-y-2">
        <div className="h-7 w-48 rounded bg-surface-soft" />
        <div className="h-4 w-96 max-w-full rounded bg-surface-soft" />
      </div>
      <div className="rounded-2xl border border-border bg-surface/50 h-[480px]" />
    </div>
  );
}