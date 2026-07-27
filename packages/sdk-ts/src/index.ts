import type {
  AnnotationRecord,
  ArtifactRecord,
  CaptureEvent,
  CaptureMode,
  FeedbackPayload,
  ReplayExecution,
  ReplayMode,
  RetrievedDocumentRecord,
  RunRecord,
  RunStatus,
  SpanRecord,
  SpanStatus,
  SpanType,
  ToolCallRecord,
} from "@agentpatch/shared-types";

export interface AgentPatchConfig {
  baseUrl: string;
  apiKey: string;
  workflowName: string;
  environment?: string;
  captureMode?: CaptureMode;
}

export interface StartRunOptions {
  externalRunId?: string;
  input?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface ArtifactInput {
  artifact_type: string;
  mime_type: string;
  filename: string;
  storage_url?: string;
  content_text?: string;
  span_id?: string;
  metadata?: Record<string, unknown>;
}

export interface AnnotationInput {
  label: string;
  note?: string;
  span_id?: string;
}

export interface EvalRerunOptions {
  prompt_version?: string;
  model_name?: string;
  temperature?: number;
  workflow_version?: string;
}

/**
 * A retrieved document the SDK sends to `/api/v1/retrievals`. Structurally
 * `@agentpatch/shared-types`' `RetrievedDocumentRecord` minus the
 * server-assigned `span_id`. Derived via `Omit<>` so the shape stays in sync
 * with the server contract.
 */
export type RetrievalDoc = Omit<RetrievedDocumentRecord, "span_id">;

export interface UploadArtifactOptions {
  runId: string;
  spanId?: string;
  artifactType: string;
  file: { name: string; type?: string; data: Blob | ArrayBuffer | Uint8Array };
  metadata?: Record<string, unknown>;
}

export class AgentPatch {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly workflowName: string;
  private readonly environment: string;
  readonly captureMode: CaptureMode;

  constructor(config: AgentPatchConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.apiKey = config.apiKey;
    this.workflowName = config.workflowName;
    this.environment = config.environment || "local";
    this.captureMode = config.captureMode || "full";
  }

  private async post(path: string, payload: unknown) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "unknown error");
      throw new Error(`AgentPatch API error ${response.status}: ${text}`);
    }

    return (await response.json()) as Record<string, unknown>;
  }

  private async upload(path: string, form: FormData) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: form,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "unknown error");
      throw new Error(`AgentPatch API error ${response.status}: ${text}`);
    }

    return (await response.json()) as Record<string, unknown>;
  }

  async startRun(options: StartRunOptions = {}) {
    return this.post("/api/v1/runs/start", {
      workflow_name: this.workflowName,
      environment: this.environment,
      external_run_id: options.externalRunId,
      input: options.input,
      metadata: { ...(options.metadata ?? {}), capture_mode: this.captureMode },
    });
  }

  async startSpan(runId: string, span: Partial<SpanRecord>) {
    return this.post("/api/v1/spans", {
      ...span,
      run_id: runId,
    });
  }

  async endSpan(spanId: string, payload: { status: SpanStatus; output?: Record<string, unknown>; metrics?: Record<string, unknown> }) {
    return this.post(`/api/v1/spans/${spanId}/end`, payload);
  }

  async recordToolCall(spanId: string, toolCall: ToolCallRecord) {
    return this.post("/api/v1/tool-calls", {
      ...toolCall,
      span_id: spanId,
    });
  }

  async recordRetrieval(
    spanId: string,
    documents: RetrievalDoc[],
  ) {
    return this.post("/api/v1/retrievals", {
      span_id: spanId,
      documents,
    });
  }

  async recordArtifact(runId: string, artifact: ArtifactInput) {
    return this.post("/api/v1/artifacts", {
      run_id: runId,
      ...artifact,
    });
  }

  async uploadArtifact(opts: UploadArtifactOptions) {
    const form = new FormData();
    form.append("run_id", opts.runId);
    form.append("artifact_type", opts.artifactType);
    if (opts.spanId) form.append("span_id", opts.spanId);
    if (opts.metadata) form.append("metadata_json", JSON.stringify(opts.metadata));
    form.append("file", opts.file.data as Blob, opts.file.name);
    return this.upload("/api/v1/artifacts/upload", form);
  }

  async recordAnnotation(runId: string, annotation: AnnotationInput) {
    return this.post("/api/v1/annotations", {
      run_id: runId,
      ...annotation,
    });
  }

  async recordFeedback(runId: string, feedback: FeedbackPayload) {
    return this.post(`/api/v1/runs/${runId}/feedback`, feedback);
  }

  /**
   * Batch a series of capture events into a single multi-step ingest.
   * Each event is POSTed individually so partial failures don't lose the rest.
   * Returns the per-event result; check `.ok` on each entry.
   *
   * CaptureEvent.payload is typed broadly (Record<string, unknown>) at the
   * shared-types layer so callers can build payloads incrementally. The
   * double-casts below are intentional: they assert that the caller has
   * supplied the right shape for the discriminator they chose. If they
   * haven't, the API will reject the POST with a 4xx and the error is
   * surfaced in the per-event result.
   */
  async recordEvents(runId: string, events: CaptureEvent[]) {
    const results = await Promise.all(
      events.map(async (event) => {
        try {
          switch (event.type) {
            case "span":
              await this.startSpan(runId, event.payload as unknown as Partial<SpanRecord>);
              break;
            case "tool_call": {
              const payload = event.payload as unknown as ToolCallRecord;
              await this.recordToolCall(payload.span_id, payload);
              break;
            }
            case "retrieval": {
              const payload = event.payload as unknown as { span_id: string; documents?: RetrievalDoc[] };
              await this.recordRetrieval(payload.span_id, payload.documents ?? []);
              break;
            }
            case "artifact": {
              const payload = event.payload as unknown as ArtifactInput & { run_id: string };
              await this.recordArtifact(payload.run_id, payload);
              break;
            }
            case "annotation": {
              const payload = event.payload as unknown as AnnotationInput & { run_id: string };
              await this.recordAnnotation(payload.run_id, payload);
              break;
            }
          }
          return { ok: true, type: event.type };
        } catch (error) {
          return {
            ok: false,
            type: event.type,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }),
    );
    return results;
  }

  async endRun(runId: string, payload: { status: RunStatus; output?: Record<string, unknown> }) {
    return this.post(`/api/v1/runs/${runId}/end`, payload);
  }

  async replay(runId: string, mode: ReplayMode = "metadata", options: { model_name?: string; temperature?: number } = {}) {
    const form = new FormData();
    form.append("mode", mode);
    if (options.model_name) form.append("model_name", options.model_name);
    if (options.temperature !== undefined) form.append("temperature", String(options.temperature));
    // The upload() helper returns a generic Record; the replay endpoint
    // actually returns a ReplayExecution shape. Double-cast is intentional
    // here since the response contract is owned by this SDK.
    return this.upload(`/api/v1/replays/${runId}`, form) as unknown as Promise<ReplayExecution>;
  }
}
