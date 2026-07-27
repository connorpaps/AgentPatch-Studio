export type RunStatus = "running" | "success" | "failure" | "cancelled";
export type SpanType = "model_call" | "tool_call" | "retrieval" | "chain" | "guardrail" | "human_review" | "output";
export type SpanStatus = "ok" | "error" | "warning";
export type FailureType =
  | "retrieval_mismatch"
  | "stale_source"
  | "wrong_tool"
  | "wrong_tool_args"
  | "hallucination"
  | "formatting"
  | "timeout"
  | "policy_refusal"
  | "missing_escalation"
  | "multimodal_parsing"
  | "state_loss"
  | "other";

export type CaptureMode = "metadata_only" | "redacted" | "full";

export type ReplayMode = "metadata" | "partial" | "full";

export interface RunInput {
  user_query: string;
  [key: string]: unknown;
}

export interface RunOutput {
  answer?: string;
  [key: string]: unknown;
}

export interface RunMetadata {
  customer_tier?: string;
  channel?: string;
  environment?: string;
  [key: string]: unknown;
}

export interface RunRecord {
  id: string;
  workflow_id: string;
  environment_id: string;
  external_run_id?: string;
  status: RunStatus;
  started_at: string;
  ended_at?: string;
  duration_ms?: number;
  total_input_tokens?: number;
  total_output_tokens?: number;
  estimated_cost_usd?: number;
  user_query?: string;
  final_output?: RunOutput;
  failure_type?: FailureType | null;
  severity?: "low" | "medium" | "high" | "critical";
  requires_review?: boolean;
  summary?: string;
  failure_explanation?: string;
  patch_suggestion?: string;
  suggested_failure_type?: FailureType | null;
  analyzed_at?: string;
  metadata?: RunMetadata;
}

export interface SpanRecord {
  id: string;
  run_id: string;
  parent_span_id?: string | null;
  span_type: SpanType;
  name: string;
  status: SpanStatus;
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
  metadata?: Record<string, unknown>;
}

export interface ToolCallRecord {
  span_id: string;
  run_id: string;
  tool_name: string;
  arguments: Record<string, unknown>;
  result?: Record<string, unknown>;
  status: SpanStatus;
  duration_ms?: number;
}

export interface RetrievedDocumentRecord {
  span_id: string;
  source_name: string;
  source_uri?: string;
  chunk_id?: string;
  rank?: number;
  score?: number;
  content_snippet?: string;
  metadata?: Record<string, unknown>;
}

export interface ArtifactRecord {
  id: string;
  run_id: string;
  span_id?: string | null;
  artifact_type: string;
  mime_type: string;
  filename: string;
  storage_url?: string;
  content_text?: string;
  metadata?: Record<string, unknown>;
}

export interface AnnotationRecord {
  id: string;
  run_id: string;
  span_id?: string | null;
  label: string;
  note?: string;
  created_at: string;
}

export interface FeedbackPayload {
  label: string;
  note?: string;
  span_id?: string;
}

export interface CaptureEvent {
  type: "span" | "tool_call" | "retrieval" | "artifact" | "annotation";
  payload: Record<string, unknown>;
}

export interface EvalCaseRecord {
  id: string;
  project_id: string;
  source_run_id?: string;
  name: string;
  description?: string;
  expected_behavior?: string;
  input_payload: Record<string, unknown>;
  gold_output?: Record<string, unknown>;
  tags?: string[];
}

export interface EvalResultRecord {
  id: string;
  eval_case_id: string;
  workflow_version?: string;
  prompt_version?: string | null;
  model_name?: string | null;
  temperature?: number | null;
  run_id?: string;
  score?: number;
  passed?: boolean;
  judge_reason?: string;
  created_at: string;
}

export interface ProjectSettings {
  id: string;
  name: string;
  slug: string;
  capture_mode: CaptureMode;
  created_at: string;
  api_key?: string | null;
}

export interface ReplayExecution {
  mode: "sync" | "async";
  task_id?: string;
  run_id?: string;
  new_run_id?: string;
  original_run_id?: string;
  model_name?: string | null;
  temperature?: number | null;
}
