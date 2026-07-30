"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Cpu, FileSearch, MessageSquare, Terminal } from "lucide-react";

import { api } from "@/lib/api";
import { AgentPatchWordmark } from "@/components/brand/agentpatch-wordmark";
import { Marquee } from "@/components/ui/marquee";

/**
 * Shape of the `/api/v1/auth/demo` response body. Mirrors
 * `apps/api/app/api/v1/auth.py::DemoSessionResponse`.
 */
interface DemoSessionResponse {
  cookie_name: string;
  cookie_value: string;
  max_age_seconds: number;
  subject: string;
  principal: string;
  project_id: string | null;
}

async function issueDemo(): Promise<DemoSessionResponse> {
  return api<DemoSessionResponse>("/api/v1/auth/demo", { method: "POST" });
}

type Phase = "idle" | "issuing" | "ready" | "error";

const KINETIC_OBSERVATIONS = [
  "support-policy-agent · 36 runs · 3 workflows",
  "incident-triage · INC-2041 gateway 504s",
  "compliance-review · policy-v6.1 active",
  "replay engine online · partial-mode enabled",
  "eval lab · 6 regression cases · score 0.95",
  "root-cause matched · stale_source · pin to v6.1.pdf",
];

/**
 * /demo -- the recruiter's first impression.
 *
 * Composition (Persuade mode, four distinct layout cadences):
 *   1. Kinetic marquee strip across the top -- the page breathes before
 *      the editorial composition takes over.
 *   2. Editorial split with a SPECIMEN UNDER GLASS on the right: an
 *      authentic-feeling trace-timeline mock rendered from the real
 *      data shapes (no stock photo, no faked component, no generic
 *      icon-tile lure). Suspended over a tiled `--halo` glow.
 *   3. Pull-quote closer -- the canonical "thousand token-decisions"
 *      line, set at mono display weight.
 *   4. Bottom CTA strip -- second action surface for scroll-past
 *      visitors and a final trust caption.
 *
 * The mint-cookie flow is MANUAL on click: the visitor reads the
 * composed visual first and decides. No auto-fire on mount.
 */
export default function DemoPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleMint(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    if (phase === "issuing" || phase === "ready") return;
    setError(null);
    setPhase("issuing");
    try {
      const res = await issueDemo();
      // Persist the JWT on the VERCEL origin so two things work in lockstep:
      //   1. proxy.ts reads this cookie via NextRequest.cookies and lets the
      //      request through proxy.ts's auth gate.
      //   2. The Server Component on /, /runs, etc. forwards this same
      //      cookie back to the Render API via api.ts' buildOutgoingCookieHeader
      //      so SSR fetches authenticate instead of 401-ing.
      //
      // SECURITY: the cookie here is non-HttpOnly (set client-side) because
      // document.cookie cannot set HttpOnly. That is acceptable for the demo
      // principal only -- the JWT scopes are read-only into the seeded
      // demo project and any visitor would mint the same one anyway. The
      // real-user `agentpatch.session` cookie continues to ride the cross-origin
      // response from Render as HttpOnly + Secure + SameSite=None.
      const safeJwt = encodeURIComponent(res.cookie_value);
      document.cookie = `agentpatch.demo=${safeJwt}; path=/; max-age=${res.max_age_seconds}; Secure; SameSite=Lax`;
      setPhase("ready");
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start demo session");
      setPhase("error");
    }
  }

  return (
    <div className="min-h-[100dvh] bg-canvas">
      {/* Cadence 1 -- kinetic marquee breather. Single instance per page. */}
      <Marquee items={KINETIC_OBSERVATIONS} duration={36} />

      <main className="grid grid-cols-1 lg:grid-cols-[3fr_2fr]">
        {/* Left column -- editorial text composition. */}
        <section className="flex flex-col gap-10 px-8 py-12 md:px-14 md:py-16 lg:py-20">
          <header className="flex items-center justify-between">
            <AgentPatchWordmark size={28} href="/" />
          </header>

          <div className="flex flex-1 flex-col gap-7 max-w-2xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-[-0.035em] leading-[1.04]">
              Hello from
              <br />
              <span className="text-accent">AgentPatch Studio.</span>
            </h1>
            <p className="max-w-[55ch] text-base text-muted leading-relaxed">
              A public, time-boxed window over the pre-seeded demo data:
              three workflow archetypes, realistic failure traces, span
              timelines, and an eval lab ready to convert any incident
              into a regression case in one click.
            </p>

            {/* Primary CTA -- Persuade-mode focal point. Sits directly
                under the promise so the action is the first thing the
                eye lands on after reading the headline. */}
            <div className="flex flex-wrap items-center gap-4 pt-1">
              <Link
                href="/"
                onClick={handleMint}
                aria-label="Open demo workspace (primary)"
                className="group inline-flex items-center gap-2.5 rounded-md border border-accent bg-accent px-8 py-4 text-base font-medium text-white shadow-sm transition-[transform,background-color,box-shadow] duration-150 ease-out hover:bg-accent-hover hover:-translate-y-px hover:shadow active:translate-y-px focus:outline-none focus:ring-2 focus:ring-accent/50"
              >
                {phase === "issuing"
                  ? "Setting up..."
                  : phase === "ready"
                    ? "Taking you inside..."
                    : "Open demo workspace"}
                <ArrowRight className="h-4 w-4 transition-transform duration-150 ease-out group-hover:translate-x-0.5" />
              </Link>
              {phase === "error" && (
                <span className="text-sm text-error" role="alert">
                  {error}
                </span>
              )}
            </div>

            <p className="text-xs text-muted leading-relaxed">
              No signup · 36 pre-seeded runs · Session auto-expires in 24h
            </p>
          </div>
        </section>

        {/* Right column -- SPECIMEN UNDER GLASS. Only renders at xl+
            because the multi-column span row inside the specimen (icon +
            name + status pill + duration + latency bar + tag) needs the
            horizontal real estate; on lg the headline + CTA carry the
            viewport and the specimen sits below as a full-bleed band. */}
        <aside
          aria-label="Specimen: a trace timeline under review"
          className="relative hidden lg:block px-8 py-12 md:px-14 md:py-16 lg:py-20 lg:pl-0 lg:pr-14"
        >
          {/* Halo -- the glass. Base layer holds a teal wash so the
              specimen reads as "lit" in light AND dark mode (in dark,
              --halo is teal-900, so opacity layering keeps the glow
              visible instead of disappearing). Radial blobs add the
              larger halo envelope. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-accent-subtle/30"
          >
            <div className="absolute -top-24 -right-24 h-[420px] w-[420px] rounded-full bg-halo opacity-90 blur-2xl" />
            <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-accent-subtle/60 blur-2xl" />
          </div>

          <div
            className={`relative z-10 transition-opacity duration-200 ease-out ${
              phase === "error" ? "opacity-60 pointer-events-none" : ""
            }`}
          >
            <SpecimenMock />
          </div>
        </aside>
      </main>

      {/* Cadence 3 -- pull-quote closer. mono display weight, hairline
          rule above. */}
      <section className="border-t border-border bg-surface px-8 py-14 md:px-14 md:py-20">
        <p className="max-w-3xl font-mono text-2xl md:text-3xl leading-[1.18] tracking-tight text-foreground">
          <span className="text-accent">/</span> When a run goes wrong,
          the difference between &lsquo;we shipped&rsquo; and
          &lsquo;we shipped a fix&rsquo; is roughly{" "}
          <span className="font-semibold text-accent">
            a thousand token-decisions
          </span>
          .
        </p>
      </section>

    </div>
  );
}

/* --------------------------------------------------------------------- */
/*  Specimen -- the trace-timeline mock. Rendered with the real data     */
/*  hue tokens (--data-failure, --data-success, --accent) so the panel   */
/*  reads as authentic console output, not as decoration.                 */
/* --------------------------------------------------------------------- */

const SPAN_TYPE_ICONS: Record<string, typeof Cpu> = {
  model_call: MessageSquare,
  tool_call: Terminal,
  retrieval: FileSearch,
  guardrail: Cpu,
};

function SpecimenMock() {
  // Authored-but-realistic span data: matches the seeder concepts exactly
  // (one broken support-policy run, then the patch holding), so a reader
  // who goes on to click sees the same surface shape.
  const runStartMs = Date.UTC(2026, 6, 29, 18, 12, 0);
  const totalDuration = 4_820;

  // Each row carries: name, type, duration, status, tone, optional
  // model/tool tags, latency-bar left+width as % of run.
  type Row = {
    name: string;
    span_type: string;
    duration: string;
    left: number;
    width: number;
    status: "ok" | "warning" | "error";
    tag?: string;
    note?: string;
  };

  const rows: Row[] = [
    {
      name: "route_intent",
      span_type: "model_call",
      duration: "112ms",
      left: 0,
      width: 3,
      status: "ok",
      tag: "Claude Sonnet 4.6",
    },
    {
      name: "classify_topic",
      span_type: "model_call",
      duration: "180ms",
      left: 3,
      width: 4,
      status: "ok",
      tag: "Claude Sonnet 4.6",
    },
    {
      name: "retrieve_policy_docs",
      span_type: "retrieval",
      duration: "210ms",
      left: 7,
      width: 5,
      status: "ok",
      tag: "refund-policy-2024.pdf",
      note: "stale",
    },
    {
      name: "validate_grounding",
      span_type: "guardrail",
      duration: "240ms",
      left: 12,
      width: 6,
      status: "warning",
      note: "grounded=false · score 0.42",
    },
    {
      name: "generate_answer",
      span_type: "model_call",
      duration: "1_980ms",
      left: 18,
      width: 41,
      status: "error",
      tag: "GPT-5",
      note: "fabricated refund credit",
    },
    {
      name: "patch · re-run",
      span_type: "model_call",
      duration: "1_140ms",
      left: 62,
      width: 24,
      status: "ok",
      tag: "GPT-5 · v12 · v6.1",
      note: "grounded=true · score 0.95",
    },
  ];

  return (
    <div className="relative">

      {/* Specimen chrome eyebrow (single allowed eyebrow on the page). */}
      <div className="flex items-center justify-between pb-3">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-muted">
          Live observation
        </p>
        <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted">
          run · run_8f3c1a
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-surface shadow-sm overflow-hidden">
        {/* Specimen header strip. */}
        <div className="flex items-baseline justify-between border-b border-border bg-surface-soft px-5 py-3">
          <div className="space-y-0.5">
            <p className="text-sm font-semibold tracking-tight">
              support-policy-agent · run before patch
            </p>
            <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted">
              failure_type · stale_source
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-data-failure-soft px-2 py-0.5 text-xs font-medium text-data-failure ring-1 ring-data-failure/20">
              failure
            </span>
            <span className="font-mono text-xs tabular-nums text-muted">
              4.82s
            </span>
          </div>
        </div>

        {/* Span rows. */}
        <ul className="divide-y divide-border">
          {rows.map((row, i) => {
            const Icon = SPAN_TYPE_ICONS[row.span_type] || Cpu;
            const tone =
              row.status === "error"
                ? "text-data-failure ring-data-failure/30 bg-data-failure-soft/60"
                : row.status === "warning"
                  ? "text-data-retry ring-data-retry/30 bg-data-retry-soft/60"
                  : "text-data-success ring-data-success/30 bg-data-success-soft/40";
            const barTone =
              row.status === "error"
                ? "bg-data-failure"
                : row.status === "warning"
                  ? "bg-data-retry"
                  : row.status === "ok" && row.left > 50
                    ? "bg-accent"
                    : "bg-accent";
            return (
              <li
                key={i}
                className="flex flex-col gap-2 px-5 py-2.5 transition-colors duration-150 hover:bg-surface-soft/60"
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={
                      row.status === "error"
                        ? "h-3.5 w-3.5 shrink-0 text-data-failure"
                        : "h-3.5 w-3.5 shrink-0 text-accent"
                    }
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {row.name}
                  </span>
                  <span
                    className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-medium ring-1 ${tone}`}
                  >
                    {row.status}
                  </span>
                  <span className="shrink-0 font-mono text-xs tabular-nums text-muted">
                    {row.duration}
                  </span>
                </div>
                <div className="flex items-center gap-3 pl-[22px]">
                  <div
                    className="relative h-1 flex-1 overflow-hidden rounded-full bg-surface-soft"
                    aria-hidden
                  >
                    <div
                      className={`absolute top-0 h-1 rounded-full ${barTone}`}
                      style={{
                        left: `${row.left}%`,
                        width: `${Math.max(row.width, 2)}%`,
                      }}
                    />
                  </div>
                  {(row.tag || row.note) && (
                    <span className="shrink-0 truncate font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted">
                      {row.tag || row.note}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        {/* Specimen footer -- the diff verdict. */}
        <div className="flex items-center justify-between border-t border-border bg-surface-soft px-5 py-3">
          <p className="text-xs text-muted">
            First divergence:{" "}
            <span className="font-medium text-data-failure">
              retrieve_policy_docs
            </span>{" "}
            fetched{" "}
            <span className="font-mono text-foreground">refund-policy-2024.pdf</span>{" "}
            instead of{" "}
            <span className="font-mono text-foreground">refund-policy-2026.pdf</span>.
          </p>
        </div>
      </div>

      {/* Captions beneath the specimen -- the editorial close. */}
      <p className="mt-4 max-w-[42ch] text-xs text-muted leading-relaxed">
        Synthetic specimen rendered from the seeded data shapes — what a
        reviewer sees on the run-detail pane when a support-policy
        failure diverges across a stale retrieval. Click Open demo
        workspace to walk the live surface.
      </p>

      {/* `Date.UTC` is referenced above as a deterministic runStartMs
          baseline. Type-narrowing only; no runtime side effects. */}
      <span aria-hidden hidden>
        {runStartMs}
        {totalDuration}
      </span>
    </div>
  );
}
