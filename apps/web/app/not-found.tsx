import Link from "next/link";
import { Compass, Search, Sparkles } from "lucide-react";

import { AgentPatchWordmark } from "@/components/brand/agentpatch-wordmark";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-6 py-12">
      {/*
        Picsum void-space backdrop -- reads as vast open negative space,
        complements the 404 mood. Decorative; alt="" + aria-hidden so
        screen readers don't speak a noisy image label. picsum.photos
        intentionally bypasses next/image (see welcome-hero.tsx).
      */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="https://picsum.photos/seed/agentpatch-void-space/1920/1080"
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-10"
        aria-hidden
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background"
      />
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-surface/95 p-12 text-center shadow-sm backdrop-blur-sm">
        <div className="flex justify-center mb-6">
          <AgentPatchWordmark size={32} />
        </div>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-subtle">
          <Compass className="h-6 w-6 text-accent" />
        </div>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">Page not found</h1>
        <p className="mt-3 text-sm text-muted">
          The page you&rsquo;re looking for isn&rsquo;t here. It may have moved, or the
          link was mistyped. The full demo workspace is still live, pick a
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
            className="inline-flex items-center justify-center gap-2 rounded-md border border-accent bg-accent px-4 py-2.5 text-sm font-medium text-white transition-[transform,background-color] duration-150 ease-out hover:bg-accent-hover hover:-translate-y-px active:translate-y-px focus:outline-none focus:ring-2 focus:ring-accent/50"
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
