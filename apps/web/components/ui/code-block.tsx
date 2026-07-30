import { cn } from "@/lib/utils";

interface CodeBlockProps {
  code: string;
  language?: string;
  className?: string;
}

/**
 * CodeBlock — line-numbered, bordered code surface for snippets on recruiter-
 * facing surfaces (WelcomeHero install command, future docs surfaces). Server
 * Component; no interactivity needed.
 *
 * Shape Consistency Lock: rounded-2xl card surface (16px), matched to other
 * card chrome across the app. Mono 11px keeps it legible at desktop.
 */
export function CodeBlock({ code, language, className }: CodeBlockProps) {
  // Trim trailing newline so we don't render an empty bottom line.
  const lines = code.replace(/\n$/, "").split("\n");

  return (
    <div className={cn("rounded-2xl border border-border bg-background overflow-hidden", className)}>
      {language && (
        <div className="flex items-center justify-between border-b border-border bg-surface-soft px-4 py-1.5 font-mono text-[10.5px] text-muted">
          <span className="font-medium">{language}</span>
          <span className="text-muted-soft">copy</span>
        </div>
      )}
      <pre className="overflow-x-auto px-4 py-3 leading-relaxed">
        <code className="font-mono text-[11px] text-foreground">
          {lines.map((line, i) => (
            <div key={i} className="flex gap-4">
              <span className="select-none text-muted w-6 text-right tabular-nums">
                {i + 1}
              </span>
              <span className="flex-1 whitespace-pre">
                {line.length === 0 ? "\u00a0" : line}
              </span>
            </div>
          ))}
        </code>
      </pre>
    </div>
  );
}
