"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const COLORS: Record<string, string> = {
  BOOKED: "#94a3b8",
  DISPATCHED: "#5c8bff",
  IN_TRANSIT: "#2249d6",
  DELIVERED: "#16a34a",
  INVOICED: "#9333ea",
  CANCELLED: "#ef4444",
};

export function StatusPieChart({ data }: { data: { status: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} dataKey="count" nameKey="status" innerRadius={55} outerRadius={90} paddingAngle={2}>
          {data.map((entry) => (
            <Cell key={entry.status} fill={COLORS[entry.status] || "#94a3b8"} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e4e8f0", fontSize: 13 }} />
        <Legend wrapperStyle={{ fontSize: 12 }} formatter={(value) => value.replaceAll("_", " ")} />
      </PieChart>
    </ResponsiveContainer>
  );
}
