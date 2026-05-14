'use client';

import { useState } from 'react';
import { BarChart3, Globe2, Monitor, Smartphone, ExternalLink, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading';

type LinkRow = {
  id: string;
  slug: string;
  title: string | null;
  destination: string;
  clickCount: number;
  createdAt: string;
  status: string;
};

type LinkStats = {
  totalClicks: number;
  byCountry: Array<{ country: string; _count: { country: number } }>;
  byDevice: { mobile: number; desktop: number };
};

export function AnalyticsClient({ links }: { links: LinkRow[] }) {
  const [selectedLink, setSelectedLink] = useState<string | null>(null);
  const [stats, setStats] = useState<LinkStats | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadStats(linkId: string) {
    setSelectedLink(linkId);
    setLoading(true);
    try {
      const response = await fetch(`/api/analytics/${linkId}/stats`);
      if (response.ok) {
        setStats(await response.json());
      } else {
        setStats(null);
      }
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  }

  if (links.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <BarChart3 size={64} className="text-muted-foreground" />
        <h2 className="text-xl font-semibold">No analytics yet</h2>
        <p className="text-muted-foreground">Create some links first to see analytics data.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="rounded-md border border-border bg-white shadow-sm">
        <div className="border-b border-border px-4 py-3 font-medium text-sm text-muted-foreground">Links</div>
        {links.map((link) => (
          <button
            key={link.id}
            type="button"
            onClick={() => loadStats(link.id)}
            className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors hover:bg-muted/50 border-b border-border last:border-b-0 ${selectedLink === link.id ? 'bg-primary/5' : ''}`}
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate">{link.title || link.slug}</p>
              <p className="text-muted-foreground truncate text-xs">{link.destination}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0 ml-4">
              <span className="font-semibold tabular-nums">{link.clickCount}</span>
              <ChevronDown size={14} className={`transition-transform ${selectedLink === link.id ? 'rotate-180' : ''}`} />
            </div>
          </button>
        ))}
      </div>

      <div className="rounded-md border border-border bg-white p-5 shadow-sm">
        {loading ? (
          <LoadingSpinner className="py-12" />
        ) : !stats ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Select a link to view detailed analytics
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <p className="text-sm text-muted-foreground">Total clicks</p>
              <p className="text-3xl font-bold">{stats.totalClicks}</p>
            </div>

            <div>
              <div className="flex items-center gap-2 text-sm font-medium mb-2">
                <Globe2 size={16} /> Top countries
              </div>
              {stats.byCountry.length === 0 ? (
                <p className="text-xs text-muted-foreground">No data yet</p>
              ) : (
                <div className="space-y-1.5">
                  {stats.byCountry.map((c) => (
                    <div key={c.country} className="flex items-center justify-between text-sm">
                      <span>{c.country || 'Unknown'}</span>
                      <span className="font-semibold tabular-nums">{c._count.country}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 text-sm font-medium mb-2">
                <Monitor size={16} /> Devices
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5"><Monitor size={14} /> Desktop</span>
                  <span className="font-semibold tabular-nums">{stats.byDevice.desktop}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5"><Smartphone size={14} /> Mobile</span>
                  <span className="font-semibold tabular-nums">{stats.byDevice.mobile}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
