export default function Loading() {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="flex items-center gap-2 text-sm text-muted">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-accent" />
        Loading run details...
      </div>
    </div>
  );
}
