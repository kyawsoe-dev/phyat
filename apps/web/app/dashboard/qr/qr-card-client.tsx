'use client';

import { useState } from 'react';
import {
  Download,
  ExternalLink,
  Check,
  Power,
  BarChart3,
  Image,
  Link,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading';
import { AnalyticsCharts } from '@/components/analytics-charts';

type LinkQR = {
  id: string;
  slug: string;
  title: string | null;
  destination: string;
  status: 'ACTIVE' | 'DISABLED';
  clickCount: number;
  createdAt: string;
  passwordHash?: string | null;
  expiresAt?: string | null;
  qrCodeDataUrl: string | null;
};

type LinkStats = {
  totalClicks: number;
  byCountry: Array<{ country: string; _count: { country: number } }>;
  byDevice: { mobile: number; desktop: number };
  byReferrer: Array<{ referrer: string | null; _count: { referrer: number } }>;
  overTime: Array<{ date: string; clicks: number }>;
  byCity: Array<{ city: string; country: string | null; _count: { city: number } }>;
};

export function QRCardClient({
  link,
  appUrl,
  updateAction,
}: {
  link: LinkQR;
  appUrl: string;
  updateAction?: (formData: FormData) => void | Promise<void>;
}) {
  const [copiedDataUrl, setCopiedDataUrl] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [stats, setStats] = useState<LinkStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const isActive = link.status === 'ACTIVE';

  async function copyDataUrl() {
    if (!link.qrCodeDataUrl) return;
    try {
      const res = await fetch(link.qrCodeDataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setCopiedDataUrl(true);
      setTimeout(() => setCopiedDataUrl(false), 2000);
    } catch {
      // fallback
    }
  }

  function copyShortUrl() {
    const url = `${appUrl}/${link.slug}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  }

  async function toggleExpand() {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (!stats) {
      setStatsLoading(true);
      try {
        const res = await fetch(`/api/analytics/${link.id}/stats`);
        if (res.ok) {
          const data = (await res.json()) as LinkStats;
          setStats(data);
        }
      } catch {
        // ignore
      } finally {
        setStatsLoading(false);
      }
    }
  }

  function formatCount(n: number): string {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toLocaleString();
  }

  return (
    <div className="rounded-md border border-border bg-white shadow-sm">
      {/* Main Card */}
      <div className="p-4">
        {/* Header: Status + Clicks */}
        <div className="mb-3 flex items-center justify-between">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
              isActive
                ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-muted-foreground/40'}`} />
            {isActive ? 'Active' : 'Disabled'}
          </span>
          <button
            type="button"
            onClick={toggleExpand}
            className={`flex items-center gap-1 text-sm font-bold tabular-nums transition-colors hover:text-primary ${
              expanded ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <BarChart3 size={13} />
            {formatCount(link.clickCount)}
          </button>
        </div>

        {/* QR Image */}
        {link.qrCodeDataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={link.qrCodeDataUrl} alt={`QR for ${link.slug}`} className="mx-auto w-48 h-48" />
        )}

        {/* Info */}
        <div className="mt-4 space-y-1 text-sm">
          <p className="font-medium truncate">{link.title || link.slug}</p>
          <p className="truncate text-muted-foreground">{appUrl}/{link.slug}</p>
        </div>

        {/* Actions */}
        <div className="mt-4 flex flex-wrap gap-2">
          <a href={link.qrCodeDataUrl ?? '#'} download={`${link.slug}-qr.png`} className="flex-1">
            <Button variant="secondary" className="w-full" size="sm">
              <Download size={14} /> Download
            </Button>
          </a>

          <Button variant="ghost" size="sm" onClick={copyDataUrl} title="Copy QR image">
            {copiedDataUrl ? <Check size={14} className="text-green-600" /> : <Image size={14} />}
          </Button>

          <Button variant="ghost" size="sm" onClick={copyShortUrl} title="Copy short URL">
            {copiedUrl ? <Check size={14} className="text-green-600" /> : <Link size={14} />}
          </Button>

          <Button asChild variant="ghost" size="sm">
            <a href={`/${link.slug}`} target="_blank" rel="noreferrer"><ExternalLink size={14} /></a>
          </Button>

          {updateAction && (
            <form action={updateAction}>
              <input type="hidden" name="id" value={link.id} />
              <input type="hidden" name="active" value={isActive ? 'false' : 'true'} />
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                title={isActive ? 'Disable' : 'Enable'}
                className={isActive ? 'text-muted-foreground' : 'text-green-600'}
              >
                <Power size={14} />
              </Button>
            </form>
          )}
        </div>
      </div>

      {/* Expanded Analytics */}
      {expanded && (
        <div className="border-t border-border bg-muted/10 px-4 py-4">
          {statsLoading ? (
            <LoadingSpinner className="py-12" />
          ) : !stats ? (
            <p className="text-sm text-muted-foreground text-center py-8">No clicks yet</p>
          ) : (
            <AnalyticsCharts stats={stats} />
          )}
        </div>
      )}
    </div>
  );
}
