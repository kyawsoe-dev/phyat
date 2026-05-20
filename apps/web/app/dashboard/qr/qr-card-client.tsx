'use client';

import { useState } from 'react';
import {
  Download,
  ExternalLink,
  Check,
  Power,
  BarChart3,
  ImageIcon,
  Link,
  Pen,
  Monitor,
  Smartphone,
  MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading';

type LinkQR = {
  id: string;
  shortHost: string;
  slug: string;
  title: string | null;
  destination: string;
  status: 'ACTIVE' | 'DISABLED';
  clickCount: number;
  createdAt: string;
  passwordHash: string | null;
  expiresAt: string | null;
  qrCodeDataUrl: string | null;
  notes?: string | null;
  tags?: string[] | null;
  utmParams?: { utm_source?: string; utm_medium?: string; utm_campaign?: string } | null;
  redirectType?: string;
};

type LinkStats = {
  totalClicks: number;
  byCountry: Array<{ country: string; _count: { country: number } }>;
  byDevice: { mobile: number; desktop: number };
  byReferrer: Array<{ referrerDomain: string | null; _count: { referrerDomain: number } }>;
  overTime: Array<{ date: string; clicks: number }>;
  byCity: Array<{ city: string; country: string | null; _count: { city: number } }>;
};

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function QRCardClient({
  link,
  updateAction,
  onEdit,
  canViewAnalytics = true,
}: {
  link: LinkQR;
  updateAction?: (formData: FormData) => void | Promise<void>;
  onEdit?: (link: LinkQR) => void;
  canViewAnalytics?: boolean;
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
    const url = `${link.shortHost.startsWith('localhost') ? 'http://' : 'https://'}${link.shortHost}/${link.slug}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  }

  async function toggleExpand() {
    if (!canViewAnalytics) {
      window.location.href = '/dashboard/plans?tier=PRO';
      return;
    }

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
    <div className="rounded-md border border-border bg-card shadow-sm overflow-hidden">
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
            title={canViewAnalytics ? 'QR analytics' : 'QR analytics require Pro'}
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
          <p className="truncate text-muted-foreground text-xs">{link.shortHost.startsWith('localhost') ? 'http://' : 'https://'}{link.shortHost}/{link.slug}</p>
        </div>

        {/* Actions */}
        <div className="mt-4 flex flex-wrap gap-2">
          <a href={link.qrCodeDataUrl ?? '#'} download={`${link.slug}-qr.png`} className="flex-1">
            <Button variant="secondary" className="w-full" size="sm">
              <Download size={14} /> Download
            </Button>
          </a>

          <Button variant="ghost" size="sm" onClick={copyDataUrl} title="Copy QR image">
            {copiedDataUrl ? <Check size={14} className="text-green-600" /> : <ImageIcon size={14} />}
          </Button>

          <Button variant="ghost" size="sm" onClick={copyShortUrl} title="Copy short URL">
            {copiedUrl ? <Check size={14} className="text-green-600" /> : <Link size={14} />}
          </Button>

          <Button asChild variant="ghost" size="sm">
            <a href={`/${link.slug}`} target="_blank" rel="noreferrer"><ExternalLink size={14} /></a>
          </Button>

          {onEdit && (
            <Button variant="ghost" size="sm" onClick={() => onEdit(link)} title="Edit">
              <Pen size={14} />
            </Button>
          )}

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
        <div className="border-t border-border bg-muted/10 px-4 py-3">
          {statsLoading ? (
            <LoadingSpinner className="py-8" />
          ) : !stats ? (
            <div className="py-6 text-center">
              <BarChart3 size={20} className="mx-auto mb-2 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No scans yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Stat pills */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-background p-2.5 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Total</p>
                  <p className="text-lg font-bold tabular-nums">{formatCount(stats.totalClicks)}</p>
                </div>
                <div className="rounded-lg bg-background p-2.5 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Desktop</p>
                  <p className="text-lg font-bold tabular-nums">{formatCount(stats.byDevice.desktop)}</p>
                </div>
                <div className="rounded-lg bg-background p-2.5 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Mobile</p>
                  <p className="text-lg font-bold tabular-nums">{formatCount(stats.byDevice.mobile)}</p>
                </div>
              </div>

              {/* Device bar */}
              {stats.totalClicks > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Device split</span>
                  </div>
                  <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                    {stats.byDevice.desktop > 0 && (
                      <div
                        className="bg-blue-500 transition-all"
                        style={{ width: `${(stats.byDevice.desktop / stats.totalClicks) * 100}%` }}
                      />
                    )}
                    {stats.byDevice.mobile > 0 && (
                      <div
                        className="bg-emerald-500 transition-all"
                        style={{ width: `${(stats.byDevice.mobile / stats.totalClicks) * 100}%` }}
                      />
                    )}
                  </div>
                  <div className="flex gap-4 text-xs">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Monitor size={11} /> Desktop {stats.totalClicks > 0 ? Math.round((stats.byDevice.desktop / stats.totalClicks) * 100) : 0}%
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Smartphone size={11} /> Mobile {stats.totalClicks > 0 ? Math.round((stats.byDevice.mobile / stats.totalClicks) * 100) : 0}%
                    </span>
                  </div>
                </div>
              )}

              {/* Top countries */}
              {stats.byCountry.length > 0 && (
                <div className="space-y-1.5">
                  <p className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    <MapPin size={10} /> Top countries
                  </p>
                  <div className="space-y-1">
                    {stats.byCountry.slice(0, 5).map((c, i) => (
                      <div key={c.country} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 truncate">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="truncate">{c.country || 'Unknown'}</span>
                        </span>
                        <span className="font-semibold tabular-nums shrink-0">{c._count.country}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top cities */}
              {stats.byCity.length > 0 && (
                <div className="space-y-1.5">
                  <p className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    <MapPin size={10} /> Top cities
                  </p>
                  <div className="space-y-1">
                    {stats.byCity.slice(0, 5).map((c, i) => (
                      <div key={c.city} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 truncate">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: COLORS[(i + 3) % COLORS.length] }} />
                          <span className="truncate">{c.city}{c.country ? `, ${c.country}` : ''}</span>
                        </span>
                        <span className="font-semibold tabular-nums shrink-0">{c._count.city}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Over time mini */}
              {stats.overTime.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Recent activity</p>
                  <div className="flex items-end gap-px h-10">
                    {stats.overTime.slice(-14).map((d) => {
                      const maxVal = Math.max(...stats.overTime.slice(-14).map((x) => x.clicks), 1);
                      return (
                        <div
                          key={d.date}
                          className="flex-1 bg-blue-500/70 rounded-t-sm min-w-[2px]"
                          style={{ height: `${Math.max((d.clicks / maxVal) * 100, 8)}%` }}
                          title={`${d.date}: ${d.clicks}`}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
