'use client';

import { useState } from 'react';
import { BarChart3, Monitor, Smartphone, Globe, MousePointerClick, Scan, ExternalLink, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

type AnalyticsData = {
  totalClicks: number;
  totalScans: number;
  topLinks: Array<{
    id: string;
    slug: string;
    destination: string;
    clickCount: number;
    user: { email: string };
  }>;
  clicksByDay: Array<{ date: string; count: number }>;
  browserStats: Array<{ browser: string; count: number }>;
  osStats: Array<{ os: string; count: number }>;
  deviceStats: Array<{ device: string; count: number }>;
  countryStats: Array<{ country: string; count: number }>;
  referrerStats: Array<{ referrerDomain: string; count: number }>;
  cityStats: Array<{ city: string; count: number }>;
};

export function AdminAnalyticsClient({ initialData }: { initialData: AnalyticsData }) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function loadData(d: number) {
    setLoading(true);
    setDays(d);
    try {
      const res = await fetch(`/api/admin/analytics?days=${d}`);
      const result = await res.json();
      setData(result);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch(`/api/admin/analytics/export?days=${days}`);
      if (!res.ok) return;
      const rows = await res.json();

      if (rows.length === 0) {
        return;
      }

      const headers = Object.keys(rows[0]);
      const csvLines = [
        headers.join(','),
        ...rows.map((row: Record<string, unknown>) =>
          headers.map((h) => {
            const val = row[h];
            if (val === null || val === undefined) return '';
            const str = String(val);
            return str.includes(',') || str.includes('"') || str.includes('\n')
              ? `"${str.replace(/"/g, '""')}"`
              : str;
          }).join(','),
        ),
      ];
      const csv = csvLines.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-export-${days}d-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    } finally {
      setExporting(false);
    }
  }

  const maxClickDay = Math.max(...data.clicksByDay.map((d) => d.count), 1);
  const maxBrowser = Math.max(...data.browserStats.map((d) => d.count), 1);
  const maxOs = Math.max(...data.osStats.map((d) => d.count), 1);
  const maxDevice = Math.max(...data.deviceStats.map((d) => d.count), 1);
  const maxCountry = Math.max(...data.countryStats.map((c) => c.count), 1);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">Platform-wide analytics overview</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExport}
            disabled={exporting}
          >
            <Download size={14} className="mr-1" />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </Button>
          {[7, 30, 90].map((d) => (
            <Button
              key={d}
              variant={days === d ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => loadData(d)}
              disabled={loading}
            >
              {d}d
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MousePointerClick size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold">{data.totalClicks.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Total Clicks (last {days}d)</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Scan size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold">{data.totalScans.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Total Scans (last {days}d)</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Clicks by Day</h2>
          <div className="space-y-1">
            {data.clicksByDay.slice(-14).map((d) => (
              <div key={d.date} className="flex items-center gap-3 text-sm">
                <span className="w-24 text-muted-foreground shrink-0">
                  {new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
                <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${(d.count / maxClickDay) * 100}%` }}
                  />
                </div>
                <span className="w-12 text-right font-medium tabular-nums">{d.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Top Links</h2>
          <div className="space-y-3">
            {data.topLinks.map((link) => (
              <div key={link.id} className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{link.destination}</p>
                  <p className="text-xs text-muted-foreground">
                    /{link.slug} &middot; {link.user.email}
                  </p>
                </div>
                <span className="text-sm font-medium tabular-nums shrink-0">{link.clickCount} clicks</span>
              </div>
            ))}
            {data.topLinks.length === 0 && (
              <p className="text-sm text-muted-foreground">No links in this period.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <Globe size={14} /> Browser
          </h2>
          <div className="space-y-2">
            {data.browserStats.slice(0, 5).map((b) => (
              <div key={b.browser} className="flex items-center gap-2 text-sm">
                <span className="w-20 truncate text-muted-foreground">{b.browser}</span>
                <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary/60 rounded-full" style={{ width: `${(b.count / maxBrowser) * 100}%` }} />
                </div>
                <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">{b.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <Monitor size={14} /> OS
          </h2>
          <div className="space-y-2">
            {data.osStats.slice(0, 5).map((o) => (
              <div key={o.os} className="flex items-center gap-2 text-sm">
                <span className="w-20 truncate text-muted-foreground">{o.os}</span>
                <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary/60 rounded-full" style={{ width: `${(o.count / maxOs) * 100}%` }} />
                </div>
                <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">{o.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <Smartphone size={14} /> Device
          </h2>
          <div className="space-y-2">
            {data.deviceStats.slice(0, 5).map((d) => (
              <div key={d.device} className="flex items-center gap-2 text-sm">
                <span className="w-20 truncate text-muted-foreground">{d.device}</span>
                <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary/60 rounded-full" style={{ width: `${(d.count / maxDevice) * 100}%` }} />
                </div>
                <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">{d.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <Globe size={14} /> Country
          </h2>
          <div className="space-y-2">
            {data.countryStats.slice(0, 10).map((c) => (
              <div key={c.country} className="flex items-center gap-2 text-sm">
                <span className="w-24 truncate text-muted-foreground">{c.country}</span>
                <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary/60 rounded-full" style={{ width: `${(c.count / maxCountry) * 100}%` }} />
                </div>
                <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">{c.count}</span>
              </div>
            ))}
            {data.countryStats.length === 0 && (
              <p className="text-sm text-muted-foreground">No country data.</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Referrer</h2>
          <div className="space-y-2">
            {data.referrerStats.slice(0, 10).map((r) => (
              <div key={r.referrerDomain} className="flex items-center gap-2 text-sm">
                <span className="w-24 truncate text-muted-foreground">{r.referrerDomain}</span>
                <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary/60 rounded-full" style={{ width: `${(r.count / maxCountry) * 100}%` }} />
                </div>
                <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">{r.count}</span>
              </div>
            ))}
            {data.referrerStats.length === 0 && (
              <p className="text-sm text-muted-foreground">No referrer data.</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">City</h2>
          <div className="space-y-2">
            {data.cityStats.slice(0, 10).map((c) => (
              <div key={c.city} className="flex items-center gap-2 text-sm">
                <span className="w-24 truncate text-muted-foreground">{c.city}</span>
                <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary/60 rounded-full" style={{ width: `${(c.count / maxCountry) * 100}%` }} />
                </div>
                <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">{c.count}</span>
              </div>
            ))}
            {data.cityStats.length === 0 && (
              <p className="text-sm text-muted-foreground">No city data.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
