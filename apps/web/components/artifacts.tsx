import { FileText, Image as ImageIcon, Paperclip } from "lucide-react";
import type { Artifact } from "@/lib/types";

interface ArtifactsProps {
  artifacts?: Artifact[];
}

function ArtifactIcon({ mime_type }: { mime_type?: string }) {
  if (!mime_type) return <Paperclip className="h-4 w-4" />;
  if (mime_type.startsWith("image/")) return <ImageIcon className="h-4 w-4" />;
  return <FileText className="h-4 w-4" />;
}

/**
 * Artifacts -- grid of artifact cards. Shape: rounded-2xl per Shape
 * Consistency Lock. Icon tile uses the accent-subtle halo so the
 * artifact type reads at a glance without competing with the run
 * status pill.
 */
export function Artifacts({ artifacts }: ArtifactsProps) {
  if (!artifacts || artifacts.length === 0) {
    return (
      <p className="text-sm text-muted">No artifacts for this span.</p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-2">
      {artifacts.map((artifact) => (
        <div
          key={artifact.id}
          className="rounded-2xl border border-border bg-surface p-3 text-sm shadow-sm"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent-subtle text-accent">
              <ArtifactIcon mime_type={artifact.mime_type} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {artifact.filename || "Unnamed artifact"}
              </p>
              <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted">
                {artifact.artifact_type}
                {artifact.mime_type && ` · ${artifact.mime_type}`}
              </p>
              {artifact.storage_url && (
                <a
                  href={artifact.storage_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center text-xs font-medium text-accent transition-transform duration-150 ease-out hover:translate-x-0.5 hover:text-accent-hover focus:outline-none focus:ring-2 focus:ring-accent/40 rounded-sm"
                >
                  Open artifact →
                </a>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}