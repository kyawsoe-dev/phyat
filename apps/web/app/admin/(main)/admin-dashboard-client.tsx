'use client';

import { useState, useEffect } from 'react';
import { Users, Link2, MousePointerClick, Activity, Shield, TrendingUp, Globe, Scan, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type DashboardData = {
  totalUsers: number;
  totalLinks: number;
  totalClicks: number;
  usersThisMonth: number;
  linksThisMonth: number;
  clicksToday: number;
  clickGrowth: number;
  uniqueIps: number;
  tierDistribution: Array<{ tier: string; count: number }>;
  recentUsers: Array<{ id: string; email: string; name: string | null; createdAt: string; tier: { name: string; code: string } }>;
  mostActiveUsers: Array<{ id: string; email: string; name: string | null; linkCount: number }>;
  topLinks: Array<{ id: string; slug: string; destination: string; clickCount: number; user: { email: string } }>;
};

type HealthData = {
  activeLinks: number;
  clicksLastHour: number;
  scansLastHour: number;
  linksCreatedLastHour: number;
  activeUsersToday: number;
  uniqueIpsToday: number;
};

function StatCard({ icon: Icon, label, value, sub }: { icon: typeof Users; label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon size={20} />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

export function AdminDashboardClient({ data, health }: { data: DashboardData; health: HealthData }) {
  const [chartDays, setChartDays] = useState(30);
  const [chartData, setChartData] = useState<Array<{ date: string; count: number }>>([]);
  const [chartLoading, setChartLoading] = useState(false);

  async function loadChart(d: number) {
    setChartLoading(true);
    setChartDays(d);
    try {
      const res = await fetch(`/api/admin/analytics?days=${d}`);
      if (res.ok) {
        const json = await res.json();
        setChartData(json.clicksByDay ?? []);
      }
    } catch {
      // ignore
    } finally {
      setChartLoading(false);
    }
  }

  useEffect(() => { loadChart(30); }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Overview of the Phyat platform</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Total Users" value={data.totalUsers} sub={`+${data.usersThisMonth} this month`} />
        <StatCard icon={Link2} label="Total Links" value={data.totalLinks} sub={`+${data.linksThisMonth} this month`} />
        <StatCard icon={MousePointerClick} label="Total Clicks" value={data.totalClicks} sub={`${data.clicksToday} today`} />
        <StatCard icon={Activity} label="Active Links" value={health.activeLinks} sub={`${health.linksCreatedLastHour} in last hour`} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={TrendingUp} label="Click Growth" value={data.clickGrowth >= 0 ? `+${data.clickGrowth}%` : `${data.clickGrowth}%`} sub="vs last month" />
        <StatCard icon={Globe} label="Unique Visitors (30d)" value={data.uniqueIps} sub="unique IP addresses" />
        <StatCard icon={Eye} label="Active Users Today" value={health.activeUsersToday} sub="created links" />
        <StatCard icon={MousePointerClick} label="Clicks Today" value={data.clicksToday} sub={`${data.totalClicks > 0 ? Math.round((data.clicksToday / Math.max(data.totalClicks / 30, 1)) * 100) : 0}% daily avg`} />
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold">Clicks Over Last {chartDays} Days</h2>
            <p className="text-xs text-muted-foreground">Aggregated across all links</p>
          </div>
          <div className="flex gap-2">
            {[7, 30, 90].map((d) => (
              <Button
                key={d}
                variant={chartDays === d ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => loadChart(d)}
                disabled={chartLoading}
              >
                {d}d
              </Button>
            ))}
          </div>
        </div>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => { const d = new Date(v); return `${d.getMonth() + 1}/${d.getDate()}`; }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
            {chartLoading ? 'Loading...' : 'No click data for this period.'}
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <Shield size={14} /> Tier Distribution
          </h2>
          <div className="space-y-3">
            {data.tierDistribution.map((t) => {
              const total = data.tierDistribution.reduce((s, x) => s + x.count, 0);
              const pct = total > 0 ? Math.round((t.count / total) * 100) : 0;
              const colors: Record<string, string> = {
                FREE: 'bg-blue-500',
                PRO: 'bg-purple-500',
                DEVELOPER: 'bg-emerald-500',
              };
              const color = colors[t.tier] || 'bg-primary';
              return (
                <div key={t.tier}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">{t.tier}</span>
                    <span className="font-medium">{t.count} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <Activity size={14} /> Today's Activity
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <Users size={14} /> Active Users
              </span>
              <span className="text-lg font-bold">{health.activeUsersToday}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <MousePointerClick size={14} /> Clicks (1h)
              </span>
              <span className="text-lg font-bold">{health.clicksLastHour}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <Scan size={14} /> Scans (1h)
              </span>
              <span className="text-lg font-bold">{health.scansLastHour}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <Globe size={14} /> Unique IPs Today
              </span>
              <span className="text-lg font-bold">{health.uniqueIpsToday}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <Link2 size={14} /> Links Created (1h)
              </span>
              <span className="text-lg font-bold">{health.linksCreatedLastHour}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Most Active Users (this month)</h2>
          {data.mostActiveUsers.length > 0 ? (
            <div className="space-y-2">
              {data.mostActiveUsers.map((u, i) => (
                <div key={u.id} className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground tabular-nums w-5 shrink-0">{i + 1}.</span>
                  <span className="flex-1 truncate">{u.name ?? u.email}</span>
                  <span className="font-medium tabular-nums">{u.linkCount}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No activity this month.</p>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Top Performing Links (30d)</h2>
          {data.topLinks.length > 0 ? (
            <div className="space-y-2">
              {data.topLinks.map((link, i) => (
                <div key={link.id} className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground tabular-nums w-5 shrink-0">{i + 1}.</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{link.destination}</p>
                    <p className="text-xs text-muted-foreground">/{link.slug} &middot; {link.user.email}</p>
                  </div>
                  <span className="font-medium shrink-0 tabular-nums">{link.clickCount}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No links in this period.</p>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Recent Users</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-2 font-medium w-8">#</th>
                <th className="pb-2 font-medium">Name</th>
                <th className="pb-2 font-medium">Email</th>
                <th className="pb-2 font-medium">Tier</th>
                <th className="pb-2 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {data.recentUsers.map((user, i) => (
                <tr key={user.id} className="border-b border-border/50 text-foreground">
                  <td className="py-2.5 text-muted-foreground text-xs tabular-nums">{i + 1}</td>
                  <td className="py-2.5">{user.name ?? '—'}</td>
                  <td className="py-2.5 text-muted-foreground">{user.email}</td>
                  <td className="py-2.5">
                    <span className="rounded-full border px-2 py-0.5 text-xs font-medium">{user.tier.name}</span>
                  </td>
                  <td className="py-2.5 text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
