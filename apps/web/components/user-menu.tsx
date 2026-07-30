"use client";

import { useRouter } from "next/navigation";
import { LogOut, ShieldCheck, UserRound } from "lucide-react";

import { api } from "@/lib/api";

/**
 * Identity -- the shape returned by `GET /api/v1/auth/me`.
 *
 * Mirrors the FastAPI pydantic schema
 * `apps/api/app/api/v1/auth.py::IdentityResponse`. Exported here so the
 * (app) layout's Server Component and the AppChrome client shell can
 * hand it down without re-declaring the union of principals.
 */
export type Identity = {
  principal: "api_key" | "session" | "demo" | "anonymous";
  subject?: string | null;
  project_id?: string | null;
};

async function logout(): Promise<void> {
  await api("/api/v1/auth/logout", { method: "POST" });
}

/**
 * UserMenu -- session identity + signout pill on the light/modern sidebar.
 *
 * Previously: called `api("/api/v1/auth/me")` from a useEffect on mount,
 * which 401'd on the live app because the demo cookie is set with
 * `SameSite=Lax` from a top-level navigation and Chrome drops Lax
 * cookies on sub-resource fetches. The throw surfaced as an unhandled
 * useEffect error and tripped the Next.js error envelope.
 *
 * Now: takes the SSR-prefetched identity as a prop from the (app)
 * layout. No mount-time fetch, no throw, no flicker. Logout still hits
 * the network because that path explicitly wipes the cookies on the
 * server and the user has explicitly chosen to leave.
 */
export function UserMenu({ initialIdentity = null }: { initialIdentity?: Identity | null }) {
  const router = useRouter();
  // Read the SSR-prefetched identity straight off the prop. We used to
  // mirror it into useState() and re-fetch on mount, which 401'd
  // against /api/v1/auth/me when the browser dropped the SameSite=Lax
  // demo cookie on sub-resource fetches. Logout redirects to /login and
  // does not need to reset the prop -- the next paint will SSR-derive
  // an anonymous state from the now-empty cookie jar.

  async function onLogout() {
    await logout().catch(() => {
      // Logout endpoint can fail (network blip, expired session);
      // still wipe cookies client-side so the user sees the signed-out
      // state immediately.
    });
    if (typeof document !== "undefined") {
      const expires = "Thu, 01 Jan 1970 00:00:00 UTC";
      document.cookie = `agentpatch.demo=; path=/; expires=${expires}; SameSite=Lax`;
      document.cookie = `agentpatch.session=; path=/; expires=${expires}; SameSite=Lax`;
    }
    router.push("/login");
    router.refresh();
  }

  const kind = initialIdentity?.principal ?? "anonymous";
  const labelMap: Record<typeof kind, string> = {
    api_key: "API key",
    session: initialIdentity?.subject ?? "Signed in",
    demo: "Demo workspace",
    anonymous: "Not signed in",
  };
  const Icon = kind === "demo" ? ShieldCheck : UserRound;

  // For a public-facing website, hide the UserMenu row completely when
  // the visitor is in the api_key or anonymous auth fallbacks. The demo
  // and session states still show the friendly "Demo workspace / <id>"
  // chip (recruiter-friendly) plus a sign-out control. The bare "API
  // key" / "Not signed in" labels are developer jargon and don't carry
  // any useful action on a public site -- the api_key sign-out is a
  // no-op, and an anonymous state should already have been routed to
  // /login by proxy.ts.
  if (kind === "anonymous" || kind === "api_key") {
    return null;
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs">
      <div className="flex min-w-0 items-center gap-2">
        <Icon className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden />
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{labelMap[kind]}</p>
          {initialIdentity?.project_id && (
            <p className="truncate font-mono text-[11px] text-muted">
              {initialIdentity.project_id.slice(0, 8)}…
            </p>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onLogout}
        aria-label="Sign out"
        className="rounded p-1 text-muted transition-colors hover:bg-surface-soft hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
      >
        <LogOut className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  );
}
