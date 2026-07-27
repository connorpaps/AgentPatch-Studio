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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
const DEFAULT_API_KEY = process.env.NEXT_PUBLIC_API_KEY || "change-me-in-production";

/**
 * Resolve the active API key from the browser. Settings page persists the
 * user's choice in localStorage; fall back to the build-time key otherwise.
 */
function resolveApiKey(): string {
  if (typeof window === "undefined") return DEFAULT_API_KEY;
  return localStorage.getItem("agentpatch:apiKey") || DEFAULT_API_KEY;
}

export async function api<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const isFormData = options.body instanceof FormData;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${resolveApiKey()}`,
  };
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

  return (await response.json()) as T;
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
