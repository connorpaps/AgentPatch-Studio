"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { FlaskConical, GitCompare, LayoutDashboard, List, Settings, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCurrentProject, listProjects, ProjectInfo } from "@/lib/api";
import { AgentPatchWordmark } from "@/components/brand/agentpatch-wordmark";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";

const nav = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Runs", href: "/runs", icon: List },
  { name: "Compare", href: "/compare", icon: GitCompare },
  { name: "Eval Lab", href: "/evals", icon: FlaskConical },
  { name: "Review", href: "/review", icon: ShieldCheck },
  { name: "Settings", href: "/settings", icon: Settings },
];

/**
 * AppLayout -- the chrome wrapper for all authenticated routes.
 *
 * Light/modern/professional baseline: the sidebar is theme-aware
 * (bg-surface in light mode, surface-soft-toned in dark mode). The
 * active nav item carries the standard teal wash on a teal label; the
 * footer stays light, with only a small mono version tag at the
 * bottom. No chassis LEDs, no cockpit dark glass -- this is an editorial
 * workbench, not an instrument panel.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [currentProject, setCurrentProject] = useState<ProjectInfo | null>(null);
  const [projects, setProjects] = useState<ProjectInfo[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getCurrentProject().catch(() => null), listProjects().catch(() => [])]).then(
      ([me, all]) => {
        if (cancelled) return;
        if (me) setCurrentProject(me);
        setProjects(all);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [pathname]);

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

        {projects.length > 1 && currentProject && (
          <div className="border-b border-border px-4 py-3">
            <label
              htmlFor="project-switcher"
              className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted"
            >
              Active project
            </label>
            <select
              id="project-switcher"
              value={currentProject.id}
              onChange={(e) => switchProject(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-accent/40"
            >
              {projects.map((p) => (
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
          <UserMenu />
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
