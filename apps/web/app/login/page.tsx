"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Activity, ArrowRight, KeyRound, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

async function requestMagicLink(email: string): Promise<void> {
  // /auth/magic-link/request returns 204.
  await api<void>("/api/v1/auth/magic-link/request", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

async function redeemToken(token: string): Promise<void> {
  await api("/api/v1/auth/magic-link/redeem", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

async function fetchLatestDevToken(email: string): Promise<string | null> {
  if (process.env.NODE_ENV === "production") return null;
  try {
    const params = new URLSearchParams({ email }).toString();
    const data = await api<{ token: string } | null>(
      `/api/v1/auth/magic-link/sample?${params}`,
    );
    return data?.token || null;
  } catch {
    return null;
  }
}

function LoginCard() {
  const params = useSearchParams();
  const token = params.get("token") ?? null;
  const nextPath = params.get("next") ?? "/";

  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState<"idle" | "sending" | "sent" | "redeeming" | "error">(
    token ? "redeeming" : "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const [devToken, setDevToken] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setPhase("redeeming");
    redeemToken(token)
      .then(() => {
        // Mirror the session cookie on the vercel.app origin so proxy.ts
        // (the Vercel route guard) sees the user is signed in. The real
        // HttpOnly session JWT was set on the Render origin by
        // /auth/magic-link/redeem, but cookies are origin-scoped in the
        // browser so proxy.ts never sees that one -- without this Lax
        // presence cookie the redirect to /runs would bounce back here.
        document.cookie =
          "agentpatch.session=1; path=/; max-age=86400; SameSite=Lax";
        // Force a route reload so server components pick up the new cookie.
        window.location.assign(nextPath);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Invalid link");
        setPhase("error");
      });
  }, [token, nextPath]);

  async function onSend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) return;
    setPhase("sending");
    setError(null);
    try {
      await requestMagicLink(email.trim());
      setPhase("sent");
      if (process.env.NODE_ENV !== "production") {
        const latest = await fetchLatestDevToken(email.trim());
        if (latest) setDevToken(latest);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to request link");
      setPhase("error");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-accent" />
          <span className="font-semibold tracking-tight">AgentPatch Studio</span>
        </div>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-2 text-sm text-muted">
          We email you a one-time sign-in link. No passwords.
        </p>

        {phase === "redeeming" ? (
          <p className="mt-6 text-sm text-muted">Redeeming your magic link…</p>
        ) : phase === "sent" ? (
          <div className="mt-6 space-y-3 rounded-md border border-accent-subtle bg-accent-subtle/30 p-4 text-sm">
            <p className="font-medium text-foreground">Check your email</p>
            <p className="text-muted">
              We sent a sign-in link to <span className="font-mono">{email}</span>. Open it
              on this device to continue.
            </p>
            {devToken && (
              <details className="rounded-md border border-dashed border-border bg-background p-3 text-xs">
                <summary className="cursor-pointer text-muted">Dev only — use this token</summary>
                <p className="mt-2 break-all font-mono">{devToken}</p>
                <Link
                  className="mt-2 inline-flex items-center gap-1 text-accent underline"
                  href={`/login?token=${devToken}&next=${encodeURIComponent(nextPath)}`}
                >
                  Continue with token
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </details>
            )}
          </div>
        ) : (
          <form className="mt-6 space-y-3" onSubmit={onSend}>
            <label className="block text-sm font-medium" htmlFor="email">
              Work email
            </label>
            <input
              id="email"
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
            {error && <p className="text-xs text-error">{error}</p>}
            <Button type="submit" disabled={phase === "sending"} className="w-full">
              <KeyRound className="h-4 w-4" />
              {phase === "sending" ? "Sending link…" : "Send sign-in link"}
            </Button>
          </form>
        )}

        <div className="mt-8 border-t border-border pt-6 text-sm">
          <p className="text-muted">Just curious?</p>
          <Link
            href="/demo"
            className="mt-2 inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium hover:text-accent"
          >
            <Sparkles className="h-4 w-4 text-accent" />
            Open the demo workspace
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  // Suspense boundary is required by Next.js 15 for hooks like useSearchParams.
  return (
    <Suspense fallback={<div className="p-8 text-muted">Loading…</div>}>
      <LoginCard />
    </Suspense>
  );
}
