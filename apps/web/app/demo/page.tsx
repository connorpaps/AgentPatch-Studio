"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, ArrowRight, Sparkles } from "lucide-react";

import { api } from "@/lib/api";

async function issueDemo(): Promise<void> {
  await api("/api/v1/auth/demo", { method: "POST" });
}

export default function DemoPage() {
  const [phase, setPhase] = useState<"idle" | "issuing" | "ready" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPhase("issuing");
    issueDemo()
      .then(() => {
        if (cancelled) return;
        setPhase("ready");
        // Brief pause so the success state lands before navigation.
        setTimeout(() => {
          if (!cancelled) window.location.assign("/");
        }, 250);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Unable to start demo session");
        setPhase("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-surface p-10 shadow-sm">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-accent" />
          <span className="font-semibold tracking-tight">Demo Workspace</span>
        </div>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">
          Hello from AgentPatch Studio.
        </h1>
        <p className="mt-3 text-muted">
          This public URL starts a 24-hour read-only session over the pre-seeded demo data →
          three workflow archetypes (support policy, incident triage, compliance review),
          each with realistic failure traces.
        </p>

        <ul className="mt-6 grid grid-cols-1 gap-3 text-sm text-muted md:grid-cols-3">
          <li className="rounded-md border border-border bg-background p-4">
            <p className="font-medium text-foreground">3 workflows</p>
            <p>Support-policy · Incident-triage · Compliance-review</p>
          </li>
          <li className="rounded-md border border-border bg-background p-4">
            <p className="font-medium text-foreground">Root-cause engine</p>
            <p>Heuristic + LLM-suggested failure types</p>
          </li>
          <li className="rounded-md border border-border bg-background p-4">
            <p className="font-medium text-foreground">Eval lab</p>
            <p>Generate regression tests from real incidents</p>
          </li>
        </ul>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          {phase === "issuing" && (
            <span className="text-sm text-muted">Setting up…</span>
          )}
          {phase === "ready" && (
            <span className="text-sm text-accent">Ready — taking you inside…</span>
          )}
          {phase === "error" && (
            <span className="text-sm text-error">{error}</span>
          )}
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-md border border-accent bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            <Activity className="h-4 w-4" />
            Enter the dashboard
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-muted underline-offset-4 hover:text-accent hover:underline"
          >
            Prefer a real account? Sign in instead
          </Link>
        </div>
      </div>
    </div>
  );
}
