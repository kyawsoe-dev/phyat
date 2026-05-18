'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { Monitor, Smartphone, Globe2, Link as LinkIcon, CalendarDays, MapPin } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'];

type Stats = {
  totalClicks: number;
  byCountry: Array<{ country: string; _count: { country: number } }>;
  byDevice: { mobile: number; desktop: number };
  byReferrer: Array<{ referrerDomain: string | null; _count: { referrerDomain: number } }>;
  overTime: Array<{ date: string; clicks: number }>;
  byCity: Array<{ city: string; country: string | null; _count: { city: number } }>;
};

export function AnalyticsCharts({ stats }: { stats: Stats }) {
  const deviceData = [
    { name: 'Desktop', value: stats.byDevice.desktop, icon: Monitor },
    { name: 'Mobile', value: stats.byDevice.mobile, icon: Smartphone },
  ].filter((d) => d.value > 0);

  const countryData = stats.byCountry.map((c) => ({
    name: c.country || 'Unknown',
    value: c._count.country,
  }));

  const referrerData = stats.byReferrer
    .filter((r) => r.referrerDomain)
    .map((r) => ({
      name: r.referrerDomain || 'Direct',
      value: r._count.referrerDomain,
    }));

  const cityData = stats.byCity.map((c) => ({
    name: `${c.city}${c.country ? `, ${c.country}` : ''}`,
    value: c._count.city,
  }));

  const hasReferrerData = referrerData.length > 0;
  const hasTimeData = stats.overTime.length > 0;
  const hasCityData = cityData.length > 0;

  return (
    <div className="space-y-6">
      {/* Total clicks */}
      <div className="rounded-lg border border-border bg-background p-4">
        <p className="text-sm text-muted-foreground">Total clicks</p>
        <p className="text-3xl font-bold">{stats.totalClicks}</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {/* Device Breakdown */}
        <div className="rounded-lg border border-border bg-background p-4">
          <h4 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Monitor size={14} /> Engagements by Device
          </h4>
          {deviceData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No data yet</p>
          ) : (
            <div className="space-y-4">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={deviceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {deviceData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-6">
                {deviceData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2 text-sm">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                    <d.icon size={14} className="text-muted-foreground" />
                    <span>{d.name}</span>
                    <span className="font-semibold">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Over Time */}
        <div className="rounded-lg border border-border bg-background p-4">
          <h4 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <CalendarDays size={14} /> Engagements over Time
          </h4>
          {!hasTimeData ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={stats.overTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => {
                    const d = new Date(v);
                    return `${d.getMonth() + 1}/${d.getDate()}`;
                  }}
                />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="clicks" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* By Referrer */}
        <div className="rounded-lg border border-border bg-background p-4">
          <h4 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <LinkIcon size={14} /> Engagements by Referrer
          </h4>
          {!hasReferrerData ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={referrerData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                <Tooltip />
                <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* By Location */}
        <div className="rounded-lg border border-border bg-background p-4">
          <h4 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <MapPin size={14} /> Engagements by Location
          </h4>

          {/* Countries */}
          {countryData.length > 0 && (
            <div className="mb-4">
              <p className="mb-2 text-xs font-medium text-muted-foreground">By Country</p>
              <div className="space-y-1.5">
                {countryData.map((c, i) => (
                  <div key={c.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      {c.name}
                    </span>
                    <span className="font-semibold tabular-nums">{c.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cities */}
          {hasCityData && (
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">By City</p>
              <div className="space-y-1.5">
                {cityData.slice(0, 5).map((c, i) => (
                  <div key={c.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5">
                      <MapPin size={12} className="text-muted-foreground" />
                      {c.name}
                    </span>
                    <span className="font-semibold tabular-nums">{c.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {countryData.length === 0 && !hasCityData && (
            <p className="text-sm text-muted-foreground py-4 text-center">No data yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
