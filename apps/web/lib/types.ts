export interface Run {
  id: string;
  workflow_id: string;
  environment_id: string;
  status: "running" | "success" | "failure" | "cancelled";
  started_at: string;
  ended_at?: string;
  duration_ms?: number;
  total_input_tokens?: number;
  total_output_tokens?: number;
  estimated_cost_usd?: number;
  user_query?: string;
  final_output?: Record<string, unknown>;
  failure_type?: string;
  severity?: string;
  requires_review?: boolean;
  score?: number;
  summary?: string;
  failure_explanation?: string;
  patch_suggestion?: string;
  suggested_failure_type?: string;
  analyzed_at?: string;
  spans: Span[];
  annotations?: Annotation[];
}

export interface RetrievedDocument {
  id: string;
  span_id: string;
  source_name: string;
  source_uri?: string;
  chunk_id?: string;
  rank?: number;
  score?: number;
  content_snippet?: string;
}

export interface Artifact {
  id: string;
  run_id: string;
  span_id?: string | null;
  artifact_type: string;
  storage_url?: string;
  mime_type?: string;
  filename?: string;
}

export interface Annotation {
  id: string;
  run_id: string;
  span_id?: string | null;
  label: string;
  note?: string;
  created_at: string;
}

export interface Span {
  id: string;
  run_id: string;
  parent_span_id?: string | null;
  span_type: string;
  name: string;
  status: string;
  started_at: string;
  ended_at?: string;
  duration_ms?: number;
  model_name?: string;
  tool_name?: string;
  input_tokens?: number;
  output_tokens?: number;
  estimated_cost_usd?: number;
  prompt_version?: string;
  temperature?: number;
  input_payload?: Record<string, unknown>;
  output_payload?: Record<string, unknown>;
  retrieved_documents?: RetrievedDocument[];
  artifacts?: Artifact[];
}

export interface Workflow {
  id: string;
  project_id: string;
  name: string;
  type?: string;
  description?: string;
  framework?: string;
  current_version?: string;
}

export interface EvalCase {
  id: string;
  project_id: string;
  source_run_id?: string;
  name: string;
  description?: string;
  expected_behavior?: string;
  input_payload?: Record<string, unknown>;
  gold_output?: Record<string, unknown>;
  tags?: string[];
}

export interface EvalResult {
  id: string;
  eval_case_id: string;
  workflow_version?: string;
  prompt_version?: string | null;
  model_name?: string | null;
  temperature?: number | null;
  run_id?: string;
  score?: number;
  passed: boolean;
  judge_reason?: string;
  created_at: string;
}

export interface EvalRerunOptions {
  prompt_version?: string;
  model_name?: string;
  temperature?: number;
  workflow_version?: string;
}

export interface CompareSpanPair {
  match_state: "both" | "left_only" | "right_only";
  divergences: string[];
  left: Span | null;
  right: Span | null;
}

export interface CompareRunSummary {
  run_id: string;
  status: string;
  duration_ms?: number;
  failure_type?: string;
  severity?: string;
  estimated_cost_usd?: number;
  total_tokens?: number;
  total_input_tokens?: number;
  total_output_tokens?: number;
  final_output?: Record<string, unknown>;
  user_query?: string;
}

export interface CompareResult {
  left_run_id: string;
  right_run_id: string;
  left_status: string;
  right_status: string;
  left_duration_ms?: number;
  right_duration_ms?: number;
  left: CompareRunSummary;
  right: CompareRunSummary;
  divergences: Array<{
    type: string;
    reason: string;
    [key: string]: unknown;
  }>;
  span_pairs: CompareSpanPair[];
}

export type CaptureMode = "metadata_only" | "redacted" | "full";

export interface ProjectInfo {
  id: string;
  name: string;
  slug: string;
  capture_mode: CaptureMode;
  created_at: string;
  api_key?: string | null;
}

export interface AuditLogEntry {
  id: string;
  project_id: string | null;
  actor: string;
  action: string;
  resource_type: string;
  resource_id: string;
  note?: string | null;
  created_at: string;
}

export interface TaskResult {
  task_id: string;
  status: string;
  ready: boolean;
  result?: unknown;
  error?: string;
}

export interface SummarizeExecution {
  mode: "sync" | "async";
  task_id?: string;
  run_id: string;
  result?: Record<string, unknown>;
}

export type ReplayMode = "metadata" | "partial" | "full";

export interface ReplayExecution {
  mode: "sync" | "async";
  task_id?: string;
  run_id?: string;
  new_run_id?: string;
  original_run_id?: string;
  model_name?: string | null;
  temperature?: number | null;
  /** Result wrapper when the task executed synchronously. */
  result?: {
    new_run_id?: string;
    original_run_id?: string;
    mode?: ReplayMode;
  };
}
