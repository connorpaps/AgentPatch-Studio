"use client";

import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { ArrowRight, BookOpen, GitCompare, Sparkles, Terminal, Workflow } from "lucide-react";

import { Bento } from "@/components/ui/bento";
import { CodeBlock } from "@/components/ui/code-block";

/**
 * WelcomeHero -- multi-section recruiter-first-paint hero.
 *
 * Sections (4 distinct layout families, satisfies Section 4.7 layout-repetition
 * ban, eyebrow cap is 0):
 *   1. Editorial split hero (text left, real photo right) -- the headline.
 *   2. 3-cell bento -- three feature capsules, each with its own visual.
 *   3. Kinetic tag -- one kinetic-type quote banner.
 *   4. CTA strip -- final 'Open demo workspace' call.
 *
 * Lever 1+5: H2 lifted to text-3xl md:text-4xl; 01/02/03 numerals replaced
 * with verb-noun labels (Section 9.F compliance). Lever 4: Motion entrance
 * with reduced-motion gate.
 */
export function WelcomeHero() {
  const reduce = useReducedMotion();

  const container: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: reduce ? { duration: 0 } : { staggerChildren: 0.08, delayChildren: 0.04 },
    },
  };

  const item: Variants = {
    hidden: { opacity: 0, y: 10 },
    show: {
      opacity: 1,
      y: 0,
      transition: reduce ? { duration: 0 } : { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
    },
  };

  return (
    <motion.section
      className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm"
      initial={reduce ? false : "hidden"}
      animate="show"
      variants={container}
    >
      {/* Section 1 -- Editorial split hero. */}
      <motion.div
        variants={item}
        className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] border-b border-border"
      >
        <div className="flex flex-col justify-center gap-5 bg-surface px-8 py-10 md:px-12 md:py-14 lg:py-16">
          <motion.h2
            variants={item}
            className="text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tighter leading-[1.05]"
          >
            Send a trace. Compare it against itself. Ship a patch.
          </motion.h2>
          <motion.div
            variants={item}
            className="h-px w-14 bg-accent"
            aria-hidden
          />
          <motion.p
            variants={item}
            className="max-w-[55ch] text-base text-muted leading-relaxed"
          >
            AgentPatch Studio is the observability and replay surface for
            multi-step LLM-agent workflows. Each step below produces something
            visible in the app, so you can iterate in seconds.
          </motion.p>
          <motion.div variants={item} className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 rounded-md border border-accent bg-accent px-5 py-2.5 text-sm font-medium text-white transition-[transform,background-color] duration-150 ease-out hover:bg-accent-hover hover:-translate-y-px active:translate-y-px focus:outline-none focus:ring-2 focus:ring-accent/50"
            >
              <Sparkles className="h-4 w-4" />
              Open demo workspace
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/runs"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground transition-[transform,background-color] duration-150 ease-out hover:bg-surface-soft hover:-translate-y-px active:translate-y-px"
            >
              Browse seeded runs
              <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </div>
        <div className="relative hidden min-h-[320px] lg:block">
          {/*
            picsum.photos serves random themed photos from a stable seed.
            Switching to next/image would require a remotePatterns allowlist
            in next.config.ts and would route the image through Vercel's
            image optimizer, adding an extra hop and CDN-cached proxying
            without any UX benefit for a hero photo that already sits
            behind a teal halo overlay. Plain <img> is the intentional
            choice here -- opt out of the next/image lint warning.
          */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://picsum.photos/seed/agentpatch-hero-replay-debugging/960/720"
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-canvas via-transparent to-transparent" />
        </div>
      </motion.div>

      {/* Section 2 -- 3-cell bento. Each cell carries its own visual treatment. */}
      <motion.div variants={item} className="border-b border-border bg-canvas px-8 py-10 md:px-12">
        <Bento
          cells={[
            <StepCell
              key="install"
              icon={<Terminal className="h-4 w-4" />}
              label="Install SDK"
              body="Run the demo agent locally. It boots, sends traces, exits."
              snippet={`pip install -e packages/sdk-py\nAGENTPATCH_API_BASE_URL=http://localhost:8000 \\\n  python packages/sdk-py/examples/incident_triage_agent.py`}
              language="bash"
              href="/workflows"
              kind="code"
            />,
            <StepCell
              key="inspect"
              icon={<BookOpen className="h-4 w-4" />}
              label="Inspect runs"
              body="Spans open into a side inspector with prompts, tool calls, retrieved docs, and an LLM-suggested root cause."
              snippet={"Click any run from the Runs page to see the trace timeline."}
              language="ui"
              href="/runs"
              kind="quote"
            />,
            <StepCell
              key="compare"
              icon={<GitCompare className="h-4 w-4" />}
              label="Compare + patch"
              body="Compare two runs side by side, then create an eval case from a failed run and rerun it against a patched prompt."
              snippet={"Use Compare to spot the divergence; Eval Lab to lock it in."}
              language="ops"
              href="/compare"
              kind="quote"
            />,
          ]}
        />
      </motion.div>

      {/* Section 3 -- Kinetic tag. One bold pull-quote rendered in display mono. */}
      <motion.div
        variants={item}
        className="border-b border-border bg-surface px-8 py-10 md:px-12 md:py-14"
      >
        <p className="font-mono text-2xl md:text-3xl text-foreground leading-snug tracking-tight">
          <span className="text-accent">/</span>{" "}
          When a run goes wrong, the difference between &lsquo;we shipped&rsquo;
          and &lsquo;we shipped a fix&rsquo; is roughly{" "}
          <span className="font-semibold text-accent">a thousand token-decisions</span>.
        </p>
      </motion.div>

      {/* Section 4 -- CTA strip with summary. */}
      <motion.div
        variants={item}
        className="flex flex-wrap items-center justify-between gap-4 bg-canvas px-8 py-8 md:px-12 md:py-10"
      >
        <div className="flex items-center gap-3 text-sm text-muted">
          <Workflow className="h-4 w-4 text-accent" />
          <span>
            Three workflow archetypes seeded: support-policy, incident-triage,
            compliance-review.
          </span>
        </div>
        <Link
          href="/demo"
          className="inline-flex items-center gap-2 rounded-md border border-accent bg-accent px-4 py-2 text-sm font-medium text-white transition-[transform,background-color] duration-150 ease-out hover:bg-accent-hover hover:-translate-y-px active:translate-y-px focus:outline-none focus:ring-2 focus:ring-accent/50"
        >
          Open demo workspace
          <ArrowRight className="h-4 w-4" />
        </Link>
      </motion.div>
    </motion.section>
  );
}

interface StepCellProps {
  icon: React.ReactNode;
  label: string;
  body: string;
  snippet: string;
  language: string;
  href: string;
  /** Visual variant: code shows the CodeBlock, quote shows a snippet block. */
  kind: "code" | "quote";
}

function StepCell({ icon, label, body, snippet, language, href, kind }: StepCellProps) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6 shadow-sm transition-transform duration-200 ease-out hover:-translate-y-px">
      <div className="flex items-center gap-2 text-xs font-medium text-accent">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent-subtle">
          {icon}
        </span>
        <span>{label}</span>
      </div>
      <p className="text-sm text-muted leading-relaxed">{body}</p>
      {kind === "code" ? (
        <CodeBlock code={snippet} language={language} />
      ) : (
        <pre className="overflow-x-auto rounded-md border border-border bg-background px-3 py-3 font-mono text-[11px] leading-relaxed text-foreground">
          <code>{snippet}</code>
        </pre>
      )}
      <Link
        href={href}
        className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-accent transition-transform duration-150 ease-out hover:translate-x-0.5 focus:outline-none focus:ring-2 focus:ring-accent/40 rounded-sm"
      >
        Open
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
