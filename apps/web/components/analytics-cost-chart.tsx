"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface CostChartProps {
  data: { workflow_name: string; total_cost: number }[];
}

export function AnalyticsCostChart({ data }: CostChartProps) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 24, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="workflow_name"
            tick={{ fontSize: 11 }}
            angle={-30}
            textAnchor="end"
            axisLine={false}
            tickLine={false}
          />
          <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v.toFixed(2)}`} />
          <Tooltip cursor={{ fill: "var(--background)" }} formatter={(value) => [`$${Number(value).toFixed(4)}`, "Total Cost"]} />
          <Bar dataKey="total_cost" fill="var(--chart-cost)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
