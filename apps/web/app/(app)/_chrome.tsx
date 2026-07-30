"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FlaskConical, GitCompare, LayoutDashboard, List, Settings, ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ProjectInfo } from "@/lib/types";

import { AgentPatchWordmark } from "@/components/brand/agentpatch-wordmark";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu, type Identity } from "@/components/user-menu";

const nav = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Runs", href: "/runs", icon: List },
  { name: "Compare", href: "/compare", icon: GitCompare },
  { name: "Eval Lab", href: "/evals", icon: FlaskConical },
  { name: "Review", href: "/review", icon: ShieldCheck },
  { name: "Settings", href: "/settings", icon: Settings },
] as const;

/**
 * AppChrome -- client-only sidebar shell for the (app) routes.
 *
 * Pre-fetched role:
 *   Identity / project metadata comes from the (app) layout's
 *   SSR fetch (with cookies() forwarded). The shape *must* be available
 *   on first paint, otherwise the sidebar renders with null state and
 *   then the UserMenu throws a 401 on hydration when the client
 *   useEffect re-tries to fetch /api/v1/auth/me (which it no longer
 *   does -- the lookup is dead).
 *
 * Theme/layout: light/modern/professional baseline. Sidebar is
 * theme-aware (bg-surface in light mode, surface-soft-toned in dark
 * mode). Active nav item carries the standard teal wash on a teal
 * label; the footer stays light, with only a small mono version tag
 * at the bottom.
 */
export function AppChrome({
  children,
  initialIdentity,
  initialProjects,
  initialCurrentProject,
}: {
  children: React.ReactNode;
  initialIdentity: Identity | null;
  initialProjects: ProjectInfo[];
  initialCurrentProject: ProjectInfo | null;
}) {
  const pathname = usePathname();
  // SSR-prefetched values are consumed directly: switchProject() writes
  // to localStorage and reloads, so React-side state is unnecessary --
  // the next paint's SSR pass will re-derive from cookies(). The sidebar
  // used to mirror these into useState() and re-fetch on mount, which
  // 401'd against /api/v1/auth/me when the browser dropped SameSite=Lax
  // cookies on sub-resource fetches.



  function switchProject(projectId: string) {
    if (typeof window === "undefined") return;
    localStorage.setItem("agentpatch:projectId", projectId);
    window.location.reload();
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-surface">
        <div className="flex h-16 items-center px-6 border-b border-border">
          <AgentPatchWordmark size={28} href="/" />
        </div>

        {initialProjects.length > 1 && initialCurrentProject && (
          <div className="border-b border-border px-4 py-3">
            <label
              htmlFor="project-switcher"
              className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted"
            >
              Active project
            </label>
            <select
              id="project-switcher"
              value={initialCurrentProject.id}
              onChange={(e) => switchProject(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-accent/40"
            >
              {initialProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <nav className="flex-1 space-y-1 p-4" aria-label="Main navigation">
          {nav.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname?.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
                  active
                    ? "bg-accent-subtle text-accent focus-visible:ring-offset-accent"
                    : "text-muted hover:bg-surface-soft hover:text-foreground focus-visible:ring-offset-surface",
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    active ? "text-accent" : "text-muted",
                  )}
                  aria-hidden
                />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="space-y-3 border-t border-border p-4">
          {/* UserMenu renders from SSR-prefetched identity; no client
              fetch. This is the fix: previously it called
              api("/api/v1/auth/me") from a useEffect, which threw when
              the browser dropped the SameSite=Lax cookie on sub-resource
              fetches. */}
          <UserMenu initialIdentity={initialIdentity} />
          <ThemeToggle />
          <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted">
            v0.1.0
          </p>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
