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

interface TokenSpansProps {
  data: { span_name: string; avg_tokens: number }[];
}

export function AnalyticsTokenSpans({ data }: TokenSpansProps) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 24, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="span_name"
            tick={{ fontSize: 11 }}
            angle={-30}
            textAnchor="end"
            axisLine={false}
            tickLine={false}
          />
          <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip cursor={{ fill: "var(--background)" }} formatter={(value) => [`${Number(value).toFixed(0)} tokens`, "Avg Tokens"]} />
          <Bar dataKey="avg_tokens" fill="var(--chart-tokens)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
