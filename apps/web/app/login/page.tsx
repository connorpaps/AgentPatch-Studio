import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { AgentPatchWordmark } from "@/components/brand/agentpatch-wordmark";

/**
 * /login -- the public landing entry for AgentPatch Studio.
 *
 * Per Path A (the magic-link email form is removed because the API has
 * no real SMTP integration today -- a request "succeeds" with 204 but
 * no email ever leaves the server in dev or prod), the only entry
 * path is the Open demo workspace button. The visitor lands here on
 * any protected-route redirect (proxy.ts -> /login) or by typing the
 * root URL fresh. The CTA navigates to /demo, which mints the
 * 24h agentpatch.demo JWT cookie and routes the visitor back to /.
 *
 * The Page is intentionally a Server Component (no hooks, no client
 * state) so the marketing surface ships zero client JS -- just a
 * brand mark + headline + a single CTA + a one-line disclosure that
 * sign-in is currently disabled on this build until SMTP is wired.
 */
export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <div className="mb-2">
          <AgentPatchWordmark size={26} />
        </div>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">
          AgentPatch Studio
        </h1>
        <p className="mt-2 text-sm text-muted">
          Open the demo workspace to explore the pre-seeded data: three
          workflow archetypes, a root-cause engine, an eval lab, and 36
          sample runs to walk through.
        </p>

        <Link
          href="/demo"
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md border border-accent bg-accent px-4 py-2.5 text-sm font-medium text-white transition-[transform,background-color] duration-150 ease-out hover:bg-accent-hover hover:-translate-y-px active:translate-y-px focus:outline-none focus:ring-2 focus:ring-accent/50"
        >
          Open demo workspace
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>

        <p className="mt-6 text-xs text-muted">
          Email sign-in is currently disabled on this build. Wire SMTP
          (Resend or SES) for production real-user sign-in.
        </p>
      </div>
    </div>
  );
}
