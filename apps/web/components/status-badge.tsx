import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalized = status?.toLowerCase() || "unknown";
  const variants: Record<string, string> = {
    success: "bg-green-50 text-green-700 ring-green-600/20",
    failure: "bg-red-50 text-red-700 ring-red-600/20",
    running: "bg-blue-50 text-blue-700 ring-blue-600/20",
    cancelled: "bg-stone-100 text-stone-700 ring-stone-600/20",
    warning: "bg-amber-50 text-amber-700 ring-amber-600/20",
    ok: "bg-green-50 text-green-700 ring-green-600/20",
    error: "bg-red-50 text-red-700 ring-red-600/20",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1",
        variants[normalized] || "bg-stone-100 text-stone-700 ring-stone-600/20",
        className
      )}
    >
      {status}
    </span>
  );
}
