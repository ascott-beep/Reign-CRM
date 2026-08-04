"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function PipelineChart({ data }: { data: { stage: string; count: number }[] }) {
  return (
    <div style={{ width: "100%", height: 260 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis dataKey="stage" angle={-30} textAnchor="end" interval={0} height={70} tick={{ fontSize: 11, fill: "var(--color-ink-subtle)" }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--color-ink-subtle)" }} />
          <Tooltip
            contentStyle={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", fontSize: 12 }}
            cursor={{ fill: "var(--color-canvas)" }}
          />
          <Bar dataKey="count" fill="var(--color-accent)" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PlacementFeesChart({ data }: { data: { month: string; amount: number }[] }) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-[var(--color-ink-subtle)]">No placements recorded yet.</p>;
  }
  return (
    <div style={{ width: "100%", height: 240 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis dataKey="month" angle={-30} textAnchor="end" interval={0} height={70} tick={{ fontSize: 11, fill: "var(--color-ink-subtle)" }} />
          <YAxis tick={{ fontSize: 11, fill: "var(--color-ink-subtle)" }} />
          <Tooltip contentStyle={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", fontSize: 12 }} cursor={{ fill: "var(--color-canvas)" }} />
          <Bar dataKey="amount" fill="var(--color-accent)" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
