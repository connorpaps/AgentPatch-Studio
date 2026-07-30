import { Activity, CheckCircle2, Clock, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: "runs" | "success" | "error" | "clock";
}

const icons = {
  runs: Activity,
  success: CheckCircle2,
  error: XCircle,
  clock: Clock,
};

const iconStyles = {
  runs: "text-accent",
  success: "text-data-success",
  error: "text-data-failure",
  clock: "text-muted",
};

export function KpiCard({ label, value, icon }: KpiCardProps) {
  const Icon = icons[icon];
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm transition-transform duration-150 ease-out hover:-translate-y-px">
      <div className="flex items-center justify-between">
        <div>
          {/* Label is plain-case (no decorative uppercase tracking) so we don't burn the eyebrow budget on every card. */}
          <p className="text-xs font-medium text-muted">{label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
        </div>
        <Icon className={cn("h-5 w-5", iconStyles[icon])} />
      </div>
    </div>
  );
}
