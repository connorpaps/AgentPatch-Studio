"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Run } from "@/lib/types";

/**
 * FailureTrendChart -- dashboard "Failure trend" chart bento body. Per
 * the Two-Tier Colour Rule (see globals.css header), state-coloured
 * data surfaces read from --data-*. The trend line + dots use
 * --data-failure (rose-600) rather than the legacy --error, so the
 * chart tier matches the status-badge tier. Axis ticks stay --muted;
 * the tooltip stays on chrome tokens because it sits over data, not
 * carries data.
 */
export function FailureTrendChart({ runs }: { runs: Run[] }) {
  const grouped = new Map<
    string,
    { date: string; failures: number; total: number }
  >();

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
      grouped.set(date, {
        date,
        total: 1,
        failures: run.status === "failure" ? 1 : 0,
      });
    }
  });

  const data = Array.from(grouped.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 8, right: 8, bottom: 8, left: 0 }}
        >
          <XAxis
            dataKey="date"
            tick={{
              fontSize: 11,
              fontFamily: "var(--font-geist-mono)",
              fill: "var(--muted)",
            }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{
              fontSize: 11,
              fontFamily: "var(--font-geist-mono)",
              fill: "var(--muted)",
            }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <Tooltip
            cursor={{ fill: "var(--surface-soft)" }}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--surface)",
              fontFamily: "var(--font-geist-mono)",
              fontSize: 11,
              color: "var(--foreground)",
              boxShadow: "0 1px 2px rgb(0 0 0 / 0.04), 0 4px 16px rgb(0 0 0 / 0.04)",
            }}
            labelStyle={{ color: "var(--muted)", marginBottom: 4 }}
          />
          <Line
            type="monotone"
            dataKey="failures"
            stroke="var(--data-failure)"
            strokeWidth={2}
            dot={{ r: 3, fill: "var(--data-failure)", strokeWidth: 0 }}
            activeDot={{ r: 4, fill: "var(--data-failure)" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
