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

interface SlowestSpansProps {
  data: { span_name: string; avg_duration_ms: number }[];
}

export function AnalyticsSlowestSpans({ data }: SlowestSpansProps) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 8, right: 16, bottom: 8, left: 24 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e7e5e4" />
          <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis
            type="category"
            dataKey="span_name"
            tick={{ fontSize: 11 }}
            width={120}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip cursor={{ fill: "#fafaf9" }} formatter={(value) => [`${Number(value)} ms`, "Avg Duration"]} />
          <Bar dataKey="avg_duration_ms" fill="#d97706" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
