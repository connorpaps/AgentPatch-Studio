"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, ShieldCheck, UserRound } from "lucide-react";

type Identity = {
  principal: "api_key" | "session" | "demo" | "anonymous";
  subject?: string | null;
  project_id?: string | null;
};

import { api } from "@/lib/api";

async function loadIdentity(): Promise<Identity> {
  try {
    return await api<Identity>("/api/v1/auth/me");
  } catch {
    return { principal: "anonymous" };
  }
}

async function logout(): Promise<void> {
  await api("/api/v1/auth/logout", { method: "POST" });
}

/**
 * UserMenu -- session identity + signout pill on the light/modern sidebar.
 * Theme-aware: border-border + bg-background in light, bg-surface-soft in dark.
 * Hover state on the icon button lifts to surface-soft (light) / surface (dark).
 * Icon-only sign-out button has aria-label="Sign out".
 */
export function UserMenu() {
  const router = useRouter();
  const [identity, setIdentity] = useState<Identity | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadIdentity()
      .then((data) => {
        if (!cancelled) setIdentity(data);
      })
      .catch(() => {
        if (!cancelled) setIdentity({ principal: "api_key" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onLogout() {
    await logout();
    if (typeof document !== "undefined") {
      const expires = "Thu, 01 Jan 1970 00:00:00 UTC";
      document.cookie = `agentpatch.demo=; path=/; expires=${expires}; SameSite=Lax`;
      document.cookie = `agentpatch.session=; path=/; expires=${expires}; SameSite=Lax`;
    }
    router.push("/login");
    router.refresh();
  }

  const kind = identity?.principal ?? "anonymous";
  const labelMap: Record<typeof kind, string> = {
    api_key: "API key",
    session: identity?.subject ?? "Signed in",
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
          {identity?.project_id && (
            <p className="truncate font-mono text-[11px] text-muted">
              {identity.project_id.slice(0, 8)}…
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
