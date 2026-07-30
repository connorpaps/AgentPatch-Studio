"use client";

import { useEffect, useState } from "react";
import { Copy, KeyRound, ShieldCheck } from "lucide-react";
import {
  getCurrentProject,
  listProjects,
  ProjectInfo,
  updateCurrentProject,
  CaptureMode,
} from "@/lib/api";
import { Button } from "@/components/ui/button";

type Theme = "light" | "dark";

interface ClientSettings {
  apiKey: string;
  theme: Theme;
  activeProjectId: string | null;
}

function readClientSettings(): ClientSettings {
  if (typeof window === "undefined") {
    return { apiKey: "", theme: "light", activeProjectId: null };
  }
  return {
    // SECURITY: empty string here means "no API key override",
    // which is the SSR-safe default matching the backend expectation
    // that no header is sent without an explicit user choice.
    apiKey: localStorage.getItem("agentpatch:apiKey") || "",
    theme: (localStorage.getItem("agentpatch:theme") as Theme) || "light",
    activeProjectId: localStorage.getItem("agentpatch:projectId"),
  };
}

function writeClientSetting<K extends keyof ClientSettings>(key: K, value: ClientSettings[K]) {
  if (typeof window === "undefined") return;
  const map: Record<keyof ClientSettings, string> = {
    apiKey: "agentpatch:apiKey",
    theme: "agentpatch:theme",
    activeProjectId: "agentpatch:projectId",
  };
  if (value === null || value === undefined) {
    localStorage.removeItem(map[key]);
  } else {
    localStorage.setItem(map[key], String(value));
  }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-6 shadow-sm space-y-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      {children}
    </div>
  );
}

function Field({
  label,
  children,
  description,
}: {
  label: string;
  children: React.ReactNode;
  description?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      {description && <p className="text-xs text-muted">{description}</p>}
      {children}
    </div>
  );
}

/**
 * SettingsBanner -- shorter (140px) and quieter than the primary
 * routes' 220px banners. Settings is a form surface, not a data
 * observation tier, so it gets a heavier 80% overlay than the primary
 * routes' 60% banner gradient. The image sits at full opacity and the
 * gradient alone attenuates the picture through to ~20% visible at
 * the centre -- calmer signal than the data tier's 60% banners without
 * disappearing entirely.
 */
function SettingsBanner() {
  return (
    <div className="relative h-[120px] md:h-[160px] overflow-hidden bg-canvas">
      {/*
        picsum.photos seeded URL intentionally bypasses next/image
        (see welcome-hero.tsx for the rationale).
      */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="https://picsum.photos/seed/agentpatch-control-room/1200/240"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-surface/80 via-surface/70 to-surface"
      />
    </div>
  );
}

export default function SettingsPage() {
  const [project, setProject] = useState<ProjectInfo | null>(null);
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [loadingProject, setLoadingProject] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [client, setClient] = useState<ClientSettings>(readClientSettings);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingProject(true);
      setError(null);
    try {
      // Match the (app) layout's defensive pattern: a transient cross-origin
      // fetch failure on the initial mount should not blank the page. The
      // layout's getCurrentProject() silently returns null on error; we
      // mirror that here so the user sees a usable page rather than a red
      // "Failed to fetch" banner they have to dismiss.
      const [me, all] = await Promise.all([
        getCurrentProject().catch(() => null),
        listProjects().catch(() => []),
      ]);
      if (!cancelled) {
        setProject(me);
        setProjects(all);
        if (me?.id) writeClientSetting("activeProjectId", me.id);
      }
    } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load project settings");
        }
      } finally {
        if (!cancelled) setLoadingProject(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function save(patch: { name?: string; capture_mode?: CaptureMode }) {
    if (!project) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateCurrentProject(patch);
      setProject(updated);
      setSavedAt(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save project");
    } finally {
      setSaving(false);
    }
  }

  function switchApiKey(value: string) {
    setClient((c) => ({ ...c, apiKey: value }));
    writeClientSetting("apiKey", value);
  }

  function toggleTheme() {
    const next: Theme = client.theme === "light" ? "dark" : "light";
    setClient((c) => ({ ...c, theme: next }));
    writeClientSetting("theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }

  function switchProject(projectId: string) {
    setClient((c) => ({ ...c, activeProjectId: projectId }));
    writeClientSetting("activeProjectId", projectId);
    // Reload so the rest of the app re-fetches with the new context.
    if (typeof window !== "undefined") window.location.reload();
  }

  return (
    <>
      <SettingsBanner />
      <div className="p-8 space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-muted mt-1">Configure workspace, redaction mode, and API access</p>
        </div>

        {error && (
          <div className="rounded-md border border-data-failure/50 bg-data-failure-soft px-4 py-2 text-xs text-data-failure">
            {error}
          </div>
        )}

        <Section title="Workspace">
          {loadingProject || !project ? (
            <p className="text-sm text-muted">Loading project…</p>
          ) : (
            <>
              <Field label="Project name">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={project.name}
                    onChange={(e) => setProject({ ...project, name: e.target.value })}
                    className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
                  />
                  <Button
                    variant="outline"
                    disabled={saving}
                    onClick={() => save({ name: project.name })}
                  >
                    Save
                  </Button>
                </div>
              </Field>
              <Field label="Slug" description="Used in SDK ingestion calls">
                <input
                  type="text"
                  value={project.slug}
                  disabled
                  className="w-full rounded-md border border-border bg-stone-50 px-3 py-2 text-sm font-mono text-muted"
                />
              </Field>
              <Field
                label="Content capture mode"
                description="Choose what the API stores for prompts and outputs"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={project.capture_mode}
                    onChange={(e) =>
                      setProject({ ...project, capture_mode: e.target.value as CaptureMode })
                    }
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="metadata_only">Metadata only (no content)</option>
                    <option value="redacted">Redacted (PII masked)</option>
                    <option value="full">Full content (default for demos)</option>
                  </select>
                  <Button
                    disabled={saving}
                    onClick={() => save({ capture_mode: project.capture_mode })}
                  >
                    Save
                  </Button>
                  {savedAt && (
                    <span className="text-xs text-muted flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3" />
                      Saved at {savedAt}
                    </span>
                  )}
                </div>
              </Field>
            </>
          )}
        </Section>

        <Section title="Projects">
          <Field label="Active project" description="Picked up by ingestion calls and the sidebar">
            {projects.length === 0 ? (
              <p className="text-sm text-muted">Only one project exists for this API key.</p>
            ) : (
              <select
                value={client.activeProjectId || project?.id || ""}
                onChange={(e) => switchProject(e.target.value)}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.slug})
                  </option>
                ))}
              </select>
            )}
          </Field>
        </Section>

        <Section title="Appearance">
          <Field label="Theme" description="Choose the UI theme">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleTheme}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-stone-50"
              >
                {client.theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
              </button>
              <span className="text-sm text-muted capitalize">{client.theme} mode</span>
            </div>
          </Field>
        </Section>

        <Section title="API Key">
          <Field
            label="Ingestion API Key"
            description="Send this in the Authorization header of every ingestion request"
          >
            <div className="flex gap-2">
              <input
                type="text"
                value={client.apiKey}
                onChange={(e) => switchApiKey(e.target.value)}
                className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => navigator.clipboard.writeText(client.apiKey)}
              >
                <Copy className="h-3 w-3" />
                Copy
              </Button>
            </div>
            {project?.api_key && project.api_key !== client.apiKey && (
              <p className="mt-2 text-xs text-muted flex items-center gap-2">
                <KeyRound className="h-3 w-3" />
                The current project key is
                <button
                  type="button"
                  className="font-mono text-accent underline"
                  onClick={() => switchApiKey(project.api_key || "")}
                >
                  {project.api_key.slice(0, 12)}… (click to use)
                </button>
              </p>
            )}
          </Field>
        </Section>

        <Section title="Integrations">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-md border border-border p-4">
              <p className="font-medium text-sm">OpenAI</p>
              <p className="text-xs text-muted mt-1">LLM provider for eval reruns</p>
              <p className="text-xs text-muted mt-2">Switch via LLM_PROVIDER env var</p>
            </div>
            <div className="rounded-md border border-border p-4">
              <p className="font-medium text-sm">S3 / MinIO</p>
              <p className="text-xs text-muted mt-1">Artifact object storage</p>
              <p className="text-xs text-muted mt-2">Endpoint: http://localhost:9000</p>
            </div>
            <div className="rounded-md border border-border p-4">
              <p className="font-medium text-sm">Postgres</p>
              <p className="text-xs text-muted mt-1">Primary database</p>
              <p className="text-xs text-muted mt-2">Current: SQLite (demo)</p>
            </div>
            <div className="rounded-md border border-border p-4">
              <p className="font-medium text-sm">Redis + Celery</p>
              <p className="text-xs text-muted mt-1">Async tasks (summarize / replay)</p>
              <p className="text-xs text-muted mt-2">Toggle via AGENTPATCH_USE_WORKER</p>
            </div>
          </div>
        </Section>

        <Section title="Danger Zone">
          <p className="text-xs text-muted">
            Reset demo data from the API or re-run the seed script.
          </p>
          <pre className="inline-block rounded-md bg-stone-100 px-4 py-2 text-xs font-mono text-stone-700">
            cd apps/api && python scripts/seed.py
          </pre>
        </Section>
      </div>
    </>
  );
}
