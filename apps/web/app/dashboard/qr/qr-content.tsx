'use client';

import { useState } from 'react';
import { Plus, Search, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BulkUploadDialog } from '@/components/bulk-upload-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { QRCardClient } from './qr-card-client';

type LinkQR = {
  id: string;
  slug: string;
  title: string | null;
  destination: string;
  status: 'ACTIVE' | 'DISABLED';
  clickCount: number;
  createdAt: string;
  expiresAt: string | null;
  passwordHash: string | null;
  qrCodeDataUrl: string | null;
};

export function QRContent({
  links,
  appUrl,
  createAction,
  updateAction,
  bulkCreateAction,
}: {
  links: LinkQR[];
  appUrl: string;
  createAction?: (formData: FormData) => Promise<void>;
  updateAction?: (formData: FormData) => void | Promise<void>;
  bulkCreateAction?: (formData: FormData) => Promise<void>;
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'DISABLED'>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [createPending, setCreatePending] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const filtered = links.filter((l) => {
    if (search) {
      const q = search.toLowerCase();
      if (
        !l.slug.toLowerCase().includes(q) &&
        !l.destination.toLowerCase().includes(q) &&
        !(l.title ?? '').toLowerCase().includes(q)
      )
        return false;
    }
    if (statusFilter !== 'ALL' && l.status !== statusFilter) return false;
    if (startDate && new Date(l.createdAt) < new Date(startDate)) return false;
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      if (new Date(l.createdAt) > end) return false;
    }
    return true;
  });

  const hasActiveFilters = search || statusFilter !== 'ALL' || startDate || endDate;

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!createAction) return;
    setCreatePending(true);
    setCreateError(null);
    const formData = new FormData(event.currentTarget);
    try {
      await createAction(formData);
      setCreateOpen(false);
    } catch {
      setCreateError('Unable to create QR code.');
    } finally {
      setCreatePending(false);
    }
  }

  function formatCount(n: number): string {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toLocaleString();
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">QR Codes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Download and manage QR codes for your shortened URLs
          </p>
        </div>
        <div className="flex items-center gap-2">
          {bulkCreateAction && <BulkUploadDialog onCreate={bulkCreateAction} />}
          {createAction && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus size={16} /> Create QR
            </Button>
          )}
        </div>
      </div>

      {/* Create QR Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Create QR Code</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="title">Title</label>
              <Input id="title" name="title" placeholder="Campaign title" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="destination">Destination URL</label>
              <Input id="destination" name="destination" placeholder="https://example.com" required type="url" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="customAlias">Custom back-half</label>
              <Input id="customAlias" name="customAlias" placeholder="Custom back-half" pattern="[a-zA-Z0-9_-]{3,48}" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="expiresAt">Expiration</label>
              <Input id="expiresAt" name="expiresAt" type="datetime-local" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="password">Password (optional)</label>
              <Input id="password" name="password" placeholder="Optional password" type="password" minLength={6} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="generateQR" defaultChecked className="rounded border-border" />
              Generate QR code
            </label>
            {createError && <p className="text-sm text-red-600">{createError}</p>}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createPending}><Plus size={16} /> {createPending ? 'Creating...' : 'Create QR'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Search & Filters */}
      <div className="rounded-xl border border-border bg-background shadow-sm overflow-hidden">
        <div className="border-b border-border px-4 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px] flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                className="h-10 w-full rounded-lg border border-border bg-background pl-10 pr-4 text-sm shadow-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="Search by slug, URL or title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm shadow-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'DISABLED')}
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="DISABLED">Disabled</option>
            </select>
            <input
              type="date"
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm shadow-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="Start date"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <input
              type="date"
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm shadow-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="End date"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            {hasActiveFilters ? (
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Search size={20} className="text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">No QR codes match your filters</p>
                <p className="text-sm text-muted-foreground">Try adjusting your search or filter criteria.</p>
              </>
            ) : (
              <>
                <QrCode size={64} className="text-muted-foreground" />
                <h2 className="text-xl font-semibold">No QR codes yet</h2>
                <p className="text-muted-foreground">QR codes are generated automatically when you create a short link.</p>
                {createAction && (
                  <Button onClick={() => setCreateOpen(true)}>
                    <Plus size={16} /> Create QR
                  </Button>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="p-4">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((link) => (
                <QRCardClient key={link.slug} link={link} appUrl={appUrl} updateAction={updateAction} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
