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

export function Artifacts({ artifacts }: ArtifactsProps) {
  if (!artifacts || artifacts.length === 0) {
    return <p className="text-sm text-muted">No artifacts for this span.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      {artifacts.map((artifact) => (
        <div
          key={artifact.id}
          className="rounded-md border border-border bg-surface p-3 text-sm"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-stone-100 text-stone-600">
              <ArtifactIcon mime_type={artifact.mime_type} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate">{artifact.filename || "Unnamed artifact"}</p>
              <p className="text-xs text-muted">
                {artifact.artifact_type}
                {artifact.mime_type && ` · ${artifact.mime_type}`}
              </p>
              {artifact.storage_url && (
                <a
                  href={artifact.storage_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center text-xs text-accent hover:underline"
                >
                  Open artifact
                </a>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
