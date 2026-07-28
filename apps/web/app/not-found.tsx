import Link from "next/link";
import { Compass, Search, Sparkles } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-10 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-subtle">
          <Compass className="h-6 w-6 text-accent" />
        </div>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">Page not found</h1>
        <p className="mt-3 text-sm text-muted">
          The page you&rsquo;re looking for isn&rsquo;t here. It may have moved, or the
          link was mistyped. The full demo workspace is still live &mdash; pick a
          starting point below.
        </p>
        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link
            href="/runs"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 text-sm font-medium hover:text-accent"
          >
            <Search className="h-4 w-4" />
            Browse runs
          </Link>
          <Link
            href="/demo"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-accent bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            <Sparkles className="h-4 w-4" />
            Open demo workspace
          </Link>
        </div>
        <p className="mt-6 text-xs text-muted">
          Or head back to the{" "}
          <Link href="/" className="text-accent underline">
            dashboard
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
