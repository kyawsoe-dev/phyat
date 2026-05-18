'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type TrendPoint = { date: string; clicks: number };

export function DashboardTrends({ data }: { data: TrendPoint[] }) {
  if (!data.length) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 text-center text-sm text-muted-foreground">
        No click data yet
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip />
        <Line type="monotone" dataKey="clicks" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
