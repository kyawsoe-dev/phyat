'use client';

import { Users, Link2, MousePointerClick, Activity, Shield, BarChart3, Clock } from 'lucide-react';

type DashboardData = {
  totalUsers: number;
  totalLinks: number;
  totalClicks: number;
  usersThisMonth: number;
  linksThisMonth: number;
  clicksToday: number;
  tierDistribution: Array<{ tier: string; count: number }>;
  recentUsers: Array<{ id: string; email: string; name: string | null; createdAt: string; tier: { name: string; code: string } }>;
};

type HealthData = {
  activeLinks: number;
  failedDeliveriesLastHour: number;
  apiCallsLastHour: number;
  linksCreatedLastHour: number;
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">System Health</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <BarChart3 size={14} /> API Calls (1h)
              </span>
              <span className="font-medium">{health.apiCallsLastHour.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <Clock size={14} /> Failed Deliveries (1h)
              </span>
              <span className={health.failedDeliveriesLastHour > 0 ? 'font-medium text-red-500' : 'font-medium'}>
                {health.failedDeliveriesLastHour}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <Link2 size={14} /> Links Created (1h)
              </span>
              <span className="font-medium">{health.linksCreatedLastHour}</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Tier Distribution</h2>
          <div className="space-y-3">
            {data.tierDistribution.map((t) => (
              <div key={t.tier} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Shield size={14} /> {t.tier}
                </span>
                <span className="font-medium">{t.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Recent Users</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-2 font-medium">Name</th>
                <th className="pb-2 font-medium">Email</th>
                <th className="pb-2 font-medium">Tier</th>
                <th className="pb-2 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {data.recentUsers.map((user) => (
                <tr key={user.id} className="border-b border-border/50 text-foreground">
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
