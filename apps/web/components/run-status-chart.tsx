"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Run } from "@/lib/types";

export function RunStatusChart({ runs }: { runs: Run[] }) {
  const data = [
    { name: "Success", count: runs.filter((r) => r.status === "success").length, fill: "#16a34a" },
    { name: "Failure", count: runs.filter((r) => r.status === "failure").length, fill: "#dc2626" },
    { name: "Running", count: runs.filter((r) => r.status === "running").length, fill: "#0d9488" },
    { name: "Cancelled", count: runs.filter((r) => r.status === "cancelled").length, fill: "#78716c" },
  ];

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip cursor={{ fill: "#fafaf9" }} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
