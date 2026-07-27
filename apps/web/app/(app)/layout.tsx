"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Activity, FlaskConical, GitCompare, LayoutDashboard, List, Settings, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCurrentProject, listProjects, ProjectInfo } from "@/lib/api";
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
      <aside className="flex w-64 flex-col border-r border-border bg-surface">
        <div className="flex h-16 items-center gap-2 px-6 border-b border-border">
          <Activity className="h-6 w-6 text-accent" />
          <span className="font-semibold tracking-tight text-lg">AgentPatch</span>
        </div>

        {projects.length > 1 && currentProject && (
          <div className="border-b border-border px-4 py-3">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted">
              Active project
            </label>
            <select
              value={currentProject.id}
              onChange={(e) => switchProject(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <nav className="flex-1 space-y-1 p-4">
          {nav.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                pathname === item.href
                  ? "bg-accent-subtle text-accent"
                  : "text-muted hover:bg-stone-100 hover:text-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-border space-y-3">
          <UserMenu />
          <ThemeToggle />
          <p className="text-xs text-muted">v0.1.0 · {currentProject?.name ?? "Default"}</p>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
