import Link from "next/link";
import { ArrowRight, BookOpen, GitCompare, Sparkles, Terminal } from "lucide-react";

export function WelcomeHero() {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <div className="border-b border-border bg-surface-soft px-8 py-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted">
          <Sparkles className="h-3.5 w-3.5 text-accent" />
          <span>Get started</span>
        </div>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">
          Send a trace, compare it against itself, ship a patch.
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          The fastest path is the one below. Each step produces something visible in the
          app, so you can iterate in seconds.
        </p>
      </div>

      <ol className="grid grid-cols-1 divide-y divide-border md:grid-cols-3 md:divide-x md:divide-y-0">
        <Step
          icon={<Terminal className="h-4 w-4" />}
          step="01"
          label="Install the SDK"
          body="Run the demo agent locally. It boots, sends traces, and exits."
          snippet={`pip install -e packages/sdk-py
AGENTPATCH_API_BASE_URL=http://localhost:8000 \\
  python packages/sdk-py/examples/incident_triage_agent.py`}
          href="/workflows"
        />
        <Step
          icon={<BookOpen className="h-4 w-4" />}
          step="02"
          label="Inspect runs"
          body="Spans open into a side inspector with prompts, tool calls, retrieved docs, and an LLM-suggested root cause."
          snippet="Click any run from the Runs page to see the trace timeline."
          href="/runs"
        />
        <Step
          icon={<GitCompare className="h-4 w-4" />}
          step="03"
          label="Compare + patch"
          body="Compare two runs side by side, then create an eval case from a failed run and rerun it against a patched prompt."
          snippet="Use Compare to spot the divergence; Eval Lab to lock it in."
          href="/compare"
        />
      </ol>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border bg-surface-soft px-8 py-5">
        <p className="text-sm text-muted">
          Looking for an end‑to‑end walkthrough first? Open the pre‑seeded demo workspace.
        </p>
        <Link
          href="/demo"
          className="inline-flex items-center gap-2 rounded-md border border-accent bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          Open demo workspace
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

function Step({
  icon,
  step,
  label,
  body,
  snippet,
  href,
}: {
  icon: React.ReactNode;
  step: string;
  label: string;
  body: string;
  snippet: string;
  href: string;
}) {
  return (
    <li className="flex flex-col gap-3 px-8 py-7">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted">
        <span className="font-mono text-accent">{step}</span>
        <span className="text-accent">{icon}</span>
      </div>
      <h3 className="text-base font-semibold text-foreground">{label}</h3>
      <p className="text-sm text-muted">{body}</p>
      <pre className="overflow-x-auto rounded-md border border-border bg-background px-3 py-3 font-mono text-[11px] leading-relaxed text-foreground">
        {snippet}
      </pre>
      <Link
        href={href}
        className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-hover"
      >
        Open
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </li>
  );
}
