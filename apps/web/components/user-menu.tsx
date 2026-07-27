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
    router.push("/login");
  }

  const kind = identity?.principal ?? "anonymous";
  const labelMap: Record<typeof kind, string> = {
    api_key: "API key",
    session: identity?.subject ?? "Signed in",
    demo: "Demo workspace",
    anonymous: "Not signed in",
  };
  const Icon = kind === "demo" ? ShieldCheck : UserRound;

  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs">
      <div className="flex min-w-0 items-center gap-2">
        <Icon className="h-3.5 w-3.5 shrink-0 text-muted" />
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{labelMap[kind]}</p>
          {identity?.project_id && (
            <p className="truncate text-[11px] text-muted font-mono">
              {identity.project_id.slice(0, 8)}…
            </p>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onLogout}
        className="rounded p-1 text-muted hover:text-foreground"
        aria-label="Sign out"
      >
        <LogOut className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
