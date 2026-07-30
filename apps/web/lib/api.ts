import type {
  AuditLogEntry,
  CaptureMode,
  CompareResult,
  EvalCase,
  EvalResult,
  EvalRerunOptions,
  ProjectInfo,
  ReplayExecution,
  ReplayMode,
  Run,
  TaskResult,
  Workflow,
} from "./types";

export type {
  AuditLogEntry,
  CaptureMode,
  ProjectInfo,
  ReplayExecution,
  ReplayMode,
  TaskResult,
} from "./types";

// The browser no longer needs absolute URLs because /api/v1/* is proxied
// to Render through a same-origin Vercel rewrite configured in
// next.config.ts. That eliminates the build-time NEXT_PUBLIC_API_BASE_URL
// requirement that previously broke /runs, /compare, /evals, and
// /review when Vercel did not have the env set at build time -- the
// client bundle was inlined with the dev fallback "http://localhost:8000"
// which silently failed every cross-origin fetch from production.
//
// SECURITY: do NOT default to a forgeable value. The previous default of
// "change-me-in-production" would have been shipped to every visitor's
// JS bundle, broadcasting a known bearer to anyone reading the bundle.
// Now we send NO Authorization header unless the user has explicitly
// set one in /settings. The demo cookie carries the auth for /demo.
const EMBEDDED_API_KEY = process.env.NEXT_PUBLIC_API_KEY || "";

/**
 * Resolve the active API key from the browser. Settings page persists the
 * user's choice in localStorage; if absent, return an empty string and
 * omit the Authorization header entirely (the demo cookie is then the
 * sole proof of authorization).
 */
function resolveApiKey(): string {
  if (typeof window === "undefined") return EMBEDDED_API_KEY;
  return localStorage.getItem("agentpatch:apiKey") || "";
}

/**
 * Build a Cookie header from the incoming request when running on the
 * server. Next.js Server Components do not auto-forward the browser's
 * cookies to a cross-origin API host, so a server-side `fetch(...)` to
 * the Render backend arrives auth-less, 401s on the protected routes,
 * and bubbles up as a server-component error that bounces the user
 * back to /login. We explicitly read the user's `agentpatch.session`
 * and `agentpatch.demo` cookies and re-emit them on the out-bound
 * fetch so the backend can authenticate the request.
 *
 * Dynamic-imports `next/headers` so the client bundle does not try to
 * pull the server-only module.
 */
async function buildOutgoingCookieHeader(): Promise<string | undefined> {
  if (typeof window !== "undefined") return undefined;
  try {
    const { cookies } = await import("next/headers");
    const jar = await cookies();
    const parts: string[] = [];
    const demo = jar.get("agentpatch.demo");
    if (demo?.value) parts.push(`agentpatch.demo=${demo.value}`);
    const session = jar.get("agentpatch.session");
    if (session?.value) parts.push(`agentpatch.session=${session.value}`);
    return parts.length > 0 ? parts.join("; ") : undefined;
  } catch (err) {
    // cookies() throws if called outside a request scope (e.g. during
    // a build-time pre-render or a misconfigured route). Treat as "no
    // cookie available" and let the request continue -- the API will
    // surface a 401 through the normal error path. We intentionally
    // surface a warning in dev so a future regression here is loud
    // rather than a silent login-loop, but never in prod.
    if (process.env.NODE_ENV !== "production") {
      console.warn("[api] could not forward cookies on SSR fetch:", err);
    }
    return undefined;
  }
}

export async function api<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  // path is already relative (e.g. "/api/v1/runs"); Vercel rewrites in
  // next.config.ts transparently proxy the same-origin request to the
  // Render API so we don't need an absolute URL anymore.
  const url = path;
  const isFormData = options.body instanceof FormData;
  const headers: Record<string, string> = {};
  const apiKey = resolveApiKey();
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  // Forward the user's session/demo cookies on SSR so server-side
  // fetches authenticate with the Render API instead of 401-ing.
  const cookieHeader = await buildOutgoingCookieHeader();
  if (cookieHeader) {
    headers.Cookie = cookieHeader;
  }

  if (options.headers) {
    for (const [key, value] of Object.entries(options.headers)) {
      if (typeof value === "string") {
        headers[key] = value;
      }
    }
  }
  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  // Always include credentials so the `agentpatch.session` / `agentpatch.demo`
  // JWT cookie set by /auth/demo survives cross-origin and is replayed on
  // subsequent calls. Without this, the browser silently drops the
  // Set-Cookie and the middleware bounces every protected route to /login.
  const response = await fetch(url, {
    ...options,
    credentials: options.credentials ?? "include",
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "unknown error");
    throw new Error(`API error ${response.status}: ${text}`);
  }

  // 204 No Content (and any other empty body) has no JSON to parse --
  // response.json() throws SyntaxError on an empty body, which would
  // surface as an unhandled click-handler rejection and trip the Next.js
  // dev overlay's "1 Issue" badge. Treat as a successful no-op return.
  try {
    return (await response.json()) as T;
  } catch {
    return undefined as T;
  }
}

export interface RunFilters {
  status?: string;
  failure_type?: string;
  requires_review?: boolean;
  workflow_id?: string;
  search?: string;
}

export interface AnnotationInput {
  label: string;
  note?: string;
  span_id?: string;
}

export async function getRuns(filters?: RunFilters): Promise<Run[]> {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        params.append(key, String(value));
      }
    });
  }
  const query = params.toString() ? `?${params.toString()}` : "";
  return api<Run[]>(`/api/v1/runs${query}`);
}

export async function getRun(id: string): Promise<Run> {
  return api<Run>(`/api/v1/runs/${id}`);
}

export interface SimilarFailure {
  run_id: string;
  started_at: string;
  failure_type?: string;
  user_query?: string;
  similarity_score: number;
}

export async function getSimilarFailures(runId: string): Promise<SimilarFailure[]> {
  return api<SimilarFailure[]>(`/api/v1/runs/${runId}/similar-failures`);
}

export interface AnalyticsData {
  costs: { workflow_id: string; workflow_name: string; total_cost: number; run_count: number }[];
  slowSpans: { span_name: string; avg_duration_ms: number; occurrences: number }[];
  tokenSpans: { span_name: string; avg_tokens: number; occurrences: number }[];
}

export async function getAnalytics(): Promise<AnalyticsData> {
  const [costs, slowSpans, tokenSpans] = await Promise.all([
    api<{ workflow_id: string; workflow_name: string; total_cost: number; run_count: number }[]>("/api/v1/analytics/cost-by-workflow"),
    api<{ span_name: string; avg_duration_ms: number; occurrences: number }[]>("/api/v1/analytics/slowest-spans"),
    api<{ span_name: string; avg_tokens: number; occurrences: number }[]>("/api/v1/analytics/token-heavy-spans"),
  ]);
  return { costs, slowSpans, tokenSpans };
}

export async function suggestFailureType(runId: string): Promise<{ run_id: string; suggested_failure_type: string; description: string }> {
  return api<{ run_id: string; suggested_failure_type: string; description: string }>(`/api/v1/runs/${runId}/suggest-failure-type`, { method: "POST" });
}

export async function summarizeRun(runId: string): Promise<{
  run_id: string;
  execution: { mode: "sync" | "async"; task_id?: string; run_id: string; result?: Record<string, unknown> };
  summary?: string | null;
  failure_explanation?: string | null;
  patch_suggestion?: string | null;
  suggested_failure_type?: string | null;
  analyzed_at?: string | null;
}> {
  return api(`/api/v1/runs/${runId}/summarize`, { method: "POST" });
}

export async function createAnnotation(runId: string, input: AnnotationInput): Promise<{ annotation_id: string }> {
  return api<{ annotation_id: string }>("/api/v1/annotations", {
    method: "POST",
    body: JSON.stringify({ ...input, run_id: runId }),
  });
}

export async function updateReviewStatus(runId: string, requiresReview: boolean): Promise<{ run_id: string; requires_review: boolean }> {
  return api<{ run_id: string; requires_review: boolean }>(`/api/v1/runs/${runId}/review-status`, {
    method: "PATCH",
    body: JSON.stringify({ requires_review: requiresReview }),
  });
}

export async function getWorkflows(): Promise<Workflow[]> {
  return api<Workflow[]>("/api/v1/workflows");
}

export async function compareRuns(a: string, b: string): Promise<CompareResult> {
  return api<CompareResult>(`/api/v1/runs/${a}/compare/${b}`);
}

export async function getEvals(): Promise<EvalCase[]> {
  return api<EvalCase[]>("/api/v1/evals");
}

export async function getEvalResults(evalCaseId: string): Promise<EvalResult[]> {
  return api<EvalResult[]>(`/api/v1/evals/${evalCaseId}/results`);
}

export async function createEvalFromRun(runId: string): Promise<{ eval_case_id: string }> {
  return api<{ eval_case_id: string }>(`/api/v1/evals/from-run/${runId}`, { method: "POST" });
}

export async function rerunEval(evalCaseId: string, options: EvalRerunOptions = {}): Promise<EvalResult> {
  return api<EvalResult>(`/api/v1/evals/${evalCaseId}/rerun`, {
    method: "POST",
    body: JSON.stringify(options),
  });
}

export async function replayRun(
  runId: string,
  mode: ReplayMode,
  options: { model_name?: string; temperature?: number } = {},
): Promise<ReplayExecution> {
  const body = new FormData();
  body.append("mode", mode);
  if (options.model_name) body.append("model_name", options.model_name);
  if (options.temperature !== undefined) body.append("temperature", String(options.temperature));
  return api<ReplayExecution>(`/api/v1/replays/${runId}`, {
    method: "POST",
    body,
  });
}

// Project / settings / audit / tasks helpers --------------------------------

export async function getCurrentProject(): Promise<ProjectInfo> {
  return api<ProjectInfo>("/api/v1/projects/me");
}

export async function updateCurrentProject(input: {
  name?: string;
  capture_mode?: CaptureMode;
}): Promise<ProjectInfo> {
  return api<ProjectInfo>("/api/v1/projects/me", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function listProjects(): Promise<ProjectInfo[]> {
  return api<ProjectInfo[]>("/api/v1/projects");
}

export async function listAuditLogs(
  projectId: string,
  params: { resource_id?: string; action?: string; limit?: number } = {},
): Promise<AuditLogEntry[]> {
  const search = new URLSearchParams();
  if (params.action) search.append("action", params.action);
  if (params.resource_id) search.append("resource_id", params.resource_id);
  if (params.limit) search.append("limit", String(params.limit));
  const query = search.toString() ? `?${search.toString()}` : "";
  return api<AuditLogEntry[]>(`/api/v1/projects/${projectId}/audit-logs${query}`);
}

export async function getTaskStatus(taskId: string): Promise<TaskResult> {
  return api<TaskResult>(`/api/v1/tasks/${taskId}`);
}
