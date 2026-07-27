import type { RetrievedDocument } from "@/lib/types";

interface RetrievedDocumentsProps {
  documents?: RetrievedDocument[];
}

export function RetrievedDocuments({ documents }: RetrievedDocumentsProps) {
  if (!documents || documents.length === 0) {
    return <p className="text-sm text-muted">No retrieved documents for this span.</p>;
  }

  return (
    <div className="space-y-3">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="rounded-md border border-border bg-surface p-3 text-sm"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium truncate">{doc.source_name}</p>
            <div className="flex items-center gap-2 text-xs text-muted shrink-0">
              {doc.rank !== undefined && <span>Rank {doc.rank}</span>}
              {doc.score !== undefined && (
                <span className="rounded bg-stone-100 px-1.5 py-0.5">
                  {Math.round(doc.score * 100)}%
                </span>
              )}
            </div>
          </div>
          {doc.source_uri && (
            <p className="mt-1 text-xs text-muted truncate">{doc.source_uri}</p>
          )}
          {doc.chunk_id && (
            <p className="mt-1 text-xs text-muted">Chunk: {doc.chunk_id}</p>
          )}
          {doc.content_snippet && (
            <p className="mt-2 text-sm leading-relaxed text-foreground">
              {doc.content_snippet}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
