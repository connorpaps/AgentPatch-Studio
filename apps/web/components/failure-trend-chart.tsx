"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Run } from "@/lib/types";

export function FailureTrendChart({ runs }: { runs: Run[] }) {
  const grouped = new Map<string, { date: string; failures: number; total: number }>();

  runs.forEach((run) => {
    let date = "unknown";
    if (run.started_at) {
      const d = new Date(run.started_at);
      date = d.toISOString().slice(0, 10);
    }
    const existing = grouped.get(date);
    if (existing) {
      existing.total += 1;
      if (run.status === "failure") existing.failures += 1;
    } else {
      grouped.set(date, { date, total: 1, failures: run.status === "failure" ? 1 : 0 });
    }
  });

  const data = Array.from(grouped.values()).sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip cursor={{ fill: "#fafaf9" }} />
          <Line
            type="monotone"
            dataKey="failures"
            stroke="#dc2626"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
