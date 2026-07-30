"use client";

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Run } from "@/lib/types";

/**
 * RunStatusChart -- dashboard "Run status" chart bento body. Per the
 * Two-Tier Colour Rule (see globals.css header), state-coloured data
 * surfaces read from --data-*:
 *   - Success  -> --data-success  (emerald-600)
 *   - Failure  -> --data-failure  (rose-600)
 *   - Running  -> --data-latency  (sky-600) -- "in flight" reads as
 *                 a data-tier hue, not chrome's --accent (teal). Teal
 *                 stays reserved for interactive chrome.
 *   - Cancelled -> --muted        (neutral; abandoned state)
 *
 * Axis ticks stay --muted; tooltip sits on chrome tokens because it
 * floats over data, not carries data.
 */
export function RunStatusChart({ runs }: { runs: Run[] }) {
  const data = [
    {
      name: "Success",
      count: runs.filter((r) => r.status === "success").length,
      fill: "var(--data-success)",
    },
    {
      name: "Failure",
      count: runs.filter((r) => r.status === "failure").length,
      fill: "var(--data-failure)",
    },
    {
      name: "Running",
      count: runs.filter((r) => r.status === "running").length,
      fill: "var(--data-latency)",
    },
    {
      name: "Cancelled",
      count: runs.filter((r) => r.status === "cancelled").length,
      fill: "var(--muted)",
    },
  ];

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
          <XAxis
            dataKey="name"
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
          <Bar dataKey="count" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
