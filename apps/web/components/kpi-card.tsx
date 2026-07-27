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
  success: "text-green-600",
  error: "text-red-600",
  clock: "text-stone-500",
};

export function KpiCard({ label, value, icon }: KpiCardProps) {
  const Icon = icons[icon];
  return (
    <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
        </div>
        <Icon className={cn("h-5 w-5", iconStyles[icon])} />
      </div>
    </div>
  );
}
