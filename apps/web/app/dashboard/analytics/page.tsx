import type { Metadata } from 'next';
import { requireUser, authHeaders } from '@/lib/auth';
import { apiBaseUrl } from '@/lib/utils';
import { BarChart3, MousePointerClick, Globe2 } from 'lucide-react';
import { AnalyticsClient } from './analytics-client';

type LinkRow = {
  id: string;
  slug: string;
  title: string | null;
  destination: string;
  clickCount: number;
  createdAt: string;
  status: string;
};

async function getLinks(): Promise<LinkRow[]> {
  try {
    const response = await fetch(`${apiBaseUrl}/links`, {
      headers: authHeaders(),
      cache: 'no-store',
    });
    if (!response.ok) return [];
    const data = await response.json() as { data: LinkRow[] };
    return data.data ?? [];
  } catch {
    return [];
  }
}

export const metadata: Metadata = {
  title: "Analytics",
};

export default async function AnalyticsPage() {
  await requireUser();
  const links = await getLinks();
  const totalClicks = links.reduce((sum, l) => sum + l.clickCount, 0);
  const activeLinks = links.filter((l) => l.status === 'ACTIVE').length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-md border border-border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <MousePointerClick size={20} className="text-primary" />
            <span className="text-sm text-muted-foreground">Total clicks</span>
          </div>
          <p className="mt-2 text-3xl font-bold">{totalClicks}</p>
        </div>
        <div className="rounded-md border border-border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <BarChart3 size={20} className="text-primary" />
            <span className="text-sm text-muted-foreground">Total links</span>
          </div>
          <p className="mt-2 text-3xl font-bold">{links.length}</p>
        </div>
        <div className="rounded-md border border-border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <Globe2 size={20} className="text-primary" />
            <span className="text-sm text-muted-foreground">Active links</span>
          </div>
          <p className="mt-2 text-3xl font-bold">{activeLinks}</p>
        </div>
      </div>

      <AnalyticsClient links={links} />
    </div>
  );
}
