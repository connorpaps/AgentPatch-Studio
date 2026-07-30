import type { RetrievedDocument } from "@/lib/types";

interface RetrievedDocumentsProps {
  documents?: RetrievedDocument[];
}

/**
 * RetrievedDocuments -- card list of retrieval source documents. Shape:
 * rounded-2xl per Shape Consistency Lock. Mono-measured rank and score
 * badges; the source_name uses Geist 600 for scanability.
 */
export function RetrievedDocuments({ documents }: RetrievedDocumentsProps) {
  if (!documents || documents.length === 0) {
    return (
      <p className="text-sm text-muted">
        No retrieved documents for this span.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="rounded-2xl border border-border bg-surface p-3 text-sm shadow-sm"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="truncate font-medium">{doc.source_name}</p>
            <div className="flex shrink-0 items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted">
              {doc.rank !== undefined && <span>Rank {doc.rank}</span>}
              {doc.score !== undefined && (
                <span className="rounded bg-surface-soft px-1.5 py-0.5">
                  {Math.round(doc.score * 100)}%
                </span>
              )}
            </div>
          </div>
          {doc.source_uri && (
            <p className="mt-1 truncate text-xs text-muted">{doc.source_uri}</p>
          )}
          {doc.chunk_id && (
            <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted">
              Chunk: {doc.chunk_id}
            </p>
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