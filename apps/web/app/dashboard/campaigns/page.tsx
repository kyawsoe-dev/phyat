'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Megaphone, Plus, BarChart3, Link2, MousePointerClick,
  CalendarDays, Target, Pen, Trash2, X, ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading';
import { AnalyticsCharts } from '@/components/analytics-charts';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

type Campaign = {
  id: string;
  name: string;
  description: string | null;
  clickGoal: number | null;
  startDate: string | null;
  endDate: string | null;
  linkCount: number;
  totalClicks: number;
  createdAt: string;
};

type CampaignStats = {
  totalClicks: number;
  byCountry: Array<{ country: string; _count: { country: number } }>;
  byDevice: { mobile: number; desktop: number };
  byReferrer: Array<{ referrerDomain: string | null; _count: { referrerDomain: number } }>;
  overTime: Array<{ date: string; clicks: number }>;
  byCity: Array<{ city: string; country: string | null; _count: { city: number } }>;
};

type LinkOption = {
  id: string;
  slug: string;
  title: string | null;
  destination: string;
  clickCount: number;
  campaignId: string | null;
};

const emptyForm = {
  name: '',
  description: '',
  clickGoal: '',
  startDate: '',
  endDate: '',
  linkIds: [] as string[],
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [allLinks, setAllLinks] = useState<LinkOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [campaignLinks, setCampaignLinks] = useState<any[]>([]);
  const [campaignStats, setCampaignStats] = useState<CampaignStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showNewLinkForm, setShowNewLinkForm] = useState(false);
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [tierCode, setTierCode] = useState<string | null>(null);
  const canUseCampaignActions = tierCode !== null && tierCode !== 'FREE';

  async function loadCampaigns() {
    setLoading(true);
    try {
      const res = await fetch('/api/campaigns');
      if (res.ok) setCampaigns(await res.json());
    } catch {} finally {
      setLoading(false);
    }
  }

  const loadLinks = useCallback(async () => {
    try {
      const res = await fetch('/api/links');
      if (res.ok) {
        const json = await res.json();
        setAllLinks(json.data ?? []);
      }
    } catch {}
  }, []);

  useEffect(() => { loadCampaigns(); }, []);
  useEffect(() => { if (createOpen || editOpen) loadLinks(); }, [createOpen, editOpen, loadLinks]);
  useEffect(() => {
    fetch('/api/usage/current')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setTierCode(data?.tier?.code ?? 'FREE'))
      .catch(() => setTierCode('FREE'));
  }, []);

  function goToProPlan() {
    window.location.href = '/dashboard/plans?tier=PRO';
  }

  function setFormFromCampaign(c: Campaign, assigned: any[]) {
    setForm({
      name: c.name,
      description: c.description ?? '',
      clickGoal: c.clickGoal?.toString() ?? '',
      startDate: c.startDate ? c.startDate.slice(0, 10) : '',
      endDate: c.endDate ? c.endDate.slice(0, 10) : '',
      linkIds: assigned.map((l: any) => l.id),
    });
  }

  function toggleLinkId(id: string) {
    setForm((prev) => ({
      ...prev,
      linkIds: prev.linkIds.includes(id)
        ? prev.linkIds.filter((x) => x !== id)
        : [...prev.linkIds, id],
    }));
  }

  function toPayload() {
    return {
      name: form.name,
      description: form.description || undefined,
      clickGoal: form.clickGoal ? parseInt(form.clickGoal, 10) : undefined,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
    };
  }

  async function assignLinks(campaignId: string, linkIds: string[]) {
    await Promise.all(
      linkIds.map((linkId) =>
        fetch(`/api/campaigns/${campaignId}/links/${linkId}`, { method: 'POST' }),
      ),
    );
  }

  async function unassignLinks(campaignId: string, linkIds: string[]) {
    await Promise.all(
      linkIds.map((linkId) =>
        fetch(`/api/campaigns/${campaignId}/links/${linkId}`, { method: 'DELETE' }),
      ),
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(toPayload()),
    });
    if (res.ok) {
      const campaign = await res.json();
      if (form.linkIds.length > 0) await assignLinks(campaign.id, form.linkIds);
      setCreateOpen(false);
      setForm({ ...emptyForm });
      loadCampaigns();
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    const res = await fetch(`/api/campaigns/${editingId}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(toPayload()),
    });
    if (res.ok) {
      const currentLinks = allLinks.filter((l) => l.campaignId === editingId);
      const currentIds = currentLinks.map((l) => l.id);
      const toAdd = form.linkIds.filter((id) => !currentIds.includes(id));
      const toRemove = currentIds.filter((id) => !form.linkIds.includes(id));
      if (toRemove.length > 0) await unassignLinks(editingId, toRemove);
      if (toAdd.length > 0) await assignLinks(editingId, toAdd);
      setEditOpen(false);
      setEditingId(null);
      setForm({ ...emptyForm });
      loadCampaigns();
    }
  }

  async function handleCreateLink() {
    if (!newLinkUrl) return;
    const res = await fetch('/api/links', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ destination: newLinkUrl, title: newLinkTitle || undefined }),
    });
    if (res.ok) {
      setNewLinkUrl('');
      setNewLinkTitle('');
      setShowNewLinkForm(false);
      loadLinks();
    }
  }

  function openEdit(c: Campaign, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingId(c.id);
    fetch(`/api/campaigns/${c.id}/links`).then((r) => r.ok && r.json()).then((links) => {
      setFormFromCampaign(c, links);
    });
    setEditOpen(true);
  }

  async function handleDelete(id: string) {
    await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
    setDeleteConfirm(null);
    if (selectedCampaign === id) { setSelectedCampaign(null); setCampaignStats(null); setCampaignLinks([]); }
    loadCampaigns();
  }

  async function selectCampaign(id: string) {
    setSelectedCampaign(id);
    setStatsLoading(true);
    try {
      const [linksRes, statsRes] = await Promise.all([
        fetch(`/api/campaigns/${id}/links`),
        fetch(`/api/campaigns/${id}/stats`),
      ]);
      if (linksRes.ok) setCampaignLinks(await linksRes.json());
      if (statsRes.ok) setCampaignStats(await statsRes.json());
    } catch {} finally {
      setStatsLoading(false);
    }
  }

  function formatCount(n: number): string {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toLocaleString();
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString();
  }

  function clickGoalProgress(clickGoal: number | null, totalClicks: number): number {
    if (!clickGoal || clickGoal <= 0) return 0;
    return Math.min(Math.round((totalClicks / clickGoal) * 100), 100);
  }

  const availableLinks = allLinks.filter((l) => !l.campaignId || (editOpen && l.campaignId === editingId));

  function LinkSelector() {
    return (
      <div className="space-y-1">
        <label className="text-sm font-medium">Links</label>
        <div className="rounded-lg border border-border bg-card max-h-48 overflow-y-auto">
          {availableLinks.length === 0 && !showNewLinkForm && (
            <p className="p-3 text-xs text-muted-foreground text-center">No links available</p>
          )}
          {availableLinks.map((link) => (
            <label
              key={link.id}
              className={`flex items-center gap-3 px-3 py-2.5 text-sm cursor-pointer hover:bg-muted/50 transition-colors border-b border-border last:border-0 ${
                form.linkIds.includes(link.id) ? 'bg-primary/5' : ''
              }`}
            >
              <input
                type="checkbox"
                checked={form.linkIds.includes(link.id)}
                onChange={() => toggleLinkId(link.id)}
                className="accent-primary"
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{link.title || link.slug}</p>
                <p className="text-xs text-muted-foreground truncate">{link.destination}</p>
              </div>
              <span className="text-xs tabular-nums text-muted-foreground shrink-0">
                {formatCount(link.clickCount)} clicks
              </span>
            </label>
          ))}
        </div>
        {showNewLinkForm ? (
          <div className="flex items-center gap-2 mt-2">
            <Input
              value={newLinkUrl}
              onChange={(e) => setNewLinkUrl(e.target.value)}
              placeholder="https://example.com"
              className="flex-1"
            />
            <Input
              value={newLinkTitle}
              onChange={(e) => setNewLinkTitle(e.target.value)}
              placeholder="Title (optional)"
              className="flex-1"
            />
            <Button type="button" size="sm" onClick={handleCreateLink}>Add</Button>
            <button type="button" onClick={() => setShowNewLinkForm(false)} className="p-1 text-muted-foreground hover:text-foreground">
              <X size={16} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowNewLinkForm(true)}
            className="text-xs text-primary hover:underline mt-1"
          >
            + Create new link
          </button>
        )}
      </div>
    );
  }

  function toggleAnalytics(id: string) {
    if (!canUseCampaignActions) {
      goToProPlan();
      return;
    }

    if (selectedCampaign === id) {
      setSelectedCampaign(null);
      setCampaignStats(null);
      setCampaignLinks([]);
    } else {
      selectCampaign(id);
    }
  }

  function CampaignCard(c: Campaign) {
    const progress = clickGoalProgress(c.clickGoal, c.totalClicks);
    const isExpired = c.endDate && new Date(c.endDate) < new Date();
    const isActive = c.startDate && new Date(c.startDate) <= new Date() && (!c.endDate || new Date(c.endDate) >= new Date());
    const isSelected = selectedCampaign === c.id;
    const previewLinks = isSelected ? campaignLinks : [];

    return (
      <div
        key={c.id}
        className={`rounded-xl border border-border bg-card shadow-sm transition-colors ${
          isSelected ? 'ring-2 ring-primary' : ''
        }`}
      >
        <div className="p-5">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{c.name}</h3>
                {isExpired && <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Expired</span>}
                {isActive && <span className="text-[10px] font-medium text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/30 px-1.5 py-0.5 rounded">Active</span>}
              </div>
              {c.description && <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{c.description}</p>}
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-4">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); toggleAnalytics(c.id); }}
                className={`rounded-lg p-2 transition-colors ${
                  isSelected
                    ? 'bg-primary/10 text-primary hover:bg-primary/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
                title={canUseCampaignActions ? 'Analytics' : 'Analytics require Pro'}
              >
                <BarChart3 size={14} />
              </button>
              <button
                type="button"
                onClick={(e) => openEdit(c, e)}
                className="rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Edit"
              >
                <Pen size={14} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!canUseCampaignActions) {
                    goToProPlan();
                    return;
                  }
                  setDeleteConfirm(c.id);
                }}
                className="rounded-lg p-2 text-muted-foreground hover:text-red-500 hover:bg-muted transition-colors"
                title={canUseCampaignActions ? 'Delete' : 'Delete requires Pro'}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Link2 size={14} /> {c.linkCount} links
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <MousePointerClick size={14} /> {formatCount(c.totalClicks)} clicks
            </span>
            {c.clickGoal && (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Target size={14} /> Goal: {formatCount(c.clickGoal)}
              </span>
            )}
            {c.startDate && (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <CalendarDays size={14} /> {formatDate(c.startDate)}{c.endDate ? ` – ${formatDate(c.endDate)}` : ''}
              </span>
            )}
          </div>

          {c.clickGoal && c.clickGoal > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>{formatCount(c.totalClicks)} / {formatCount(c.clickGoal)} clicks</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    progress >= 100 ? 'bg-green-500' : 'bg-primary'
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {!isSelected && c.linkCount > 0 && (
            <div className="mt-3 space-y-1">
              {previewLinks.slice(0, 3).map((link: any) => (
                <div key={link.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ExternalLink size={12} className="shrink-0" />
                  <span className="truncate">{link.title || link.slug}</span>
                  <span className="shrink-0 tabular-nums">{link.clickCount} clicks</span>
                </div>
              ))}
              {c.linkCount > 3 && (
                <p className="text-xs text-muted-foreground">+{c.linkCount - 3} more</p>
              )}
            </div>
          )}
        </div>

        {isSelected && (
          <div className="border-t border-border px-5 py-5 bg-muted/10">
            {statsLoading ? (
              <LoadingSpinner className="py-8" />
            ) : (
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <BarChart3 size={16} className="text-muted-foreground" />
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Analytics</h4>
                </div>

                {campaignStats && (
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-lg border border-border bg-card p-4">
                      <p className="text-xs text-muted-foreground">Total Clicks</p>
                      <p className="text-2xl font-bold">{formatCount(campaignStats.totalClicks)}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-card p-4">
                      <p className="text-xs text-muted-foreground">Desktop</p>
                      <p className="text-2xl font-bold">{formatCount(campaignStats.byDevice.desktop)}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-card p-4">
                      <p className="text-xs text-muted-foreground">Mobile</p>
                      <p className="text-2xl font-bold">{formatCount(campaignStats.byDevice.mobile)}</p>
                    </div>
                  </div>
                )}

                {campaignStats && (
                  <AnalyticsCharts stats={campaignStats} />
                )}

                <div className="flex items-center gap-2">
                  <Link2 size={16} className="text-muted-foreground" />
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Links</h4>
                </div>

                {campaignLinks.length > 0 ? (
                  <div className="space-y-2">
                    {campaignLinks.map((link: any) => (
                      <div key={link.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-sm">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{link.title || link.slug}</p>
                          <p className="text-xs text-muted-foreground truncate">{link.destination}</p>
                        </div>
                        <div className="flex items-center gap-4 shrink-0 ml-4">
                          <span className={`text-xs font-semibold ${link.status === 'ACTIVE' ? 'text-green-600' : 'text-muted-foreground'}`}>
                            {link.status}
                          </span>
                          <span className="font-semibold tabular-nums">{link.clickCount}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No links assigned to this campaign.</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campaigns</h1>
          <p className="mt-1 text-sm text-muted-foreground">Group and track your links by campaign</p>
        </div>
        <Button onClick={() => { setForm({ ...emptyForm }); setCreateOpen(true); }}><Plus size={16} /> Create Campaign</Button>
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader><DialogTitle>Create Campaign</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Name</label>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Summer campaign" required />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                className="w-full rounded-lg border border-border bg-background p-3 text-sm shadow-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                rows={2}
                placeholder="Optional description"
              />
            </div>
            <LinkSelector />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Click Goal</label>
                <Input value={form.clickGoal} onChange={(e) => setForm((p) => ({ ...p, clickGoal: e.target.value }))} placeholder="e.g. 10000" type="number" min="1" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Start Date</label>
                <Input value={form.startDate} onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} type="date" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">End Date</label>
              <Input value={form.endDate} onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))} type="date" />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit">Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader><DialogTitle>Edit Campaign</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Name</label>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Summer campaign" required />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                className="w-full rounded-lg border border-border bg-background p-3 text-sm shadow-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                rows={2}
                placeholder="Optional description"
              />
            </div>
            <LinkSelector />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Click Goal</label>
                <Input value={form.clickGoal} onChange={(e) => setForm((p) => ({ ...p, clickGoal: e.target.value }))} placeholder="e.g. 10000" type="number" min="1" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Start Date</label>
                <Input value={form.startDate} onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} type="date" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">End Date</label>
              <Input value={form.endDate} onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))} type="date" />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Delete campaign?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Links in this campaign will not be deleted. They will just become unassigned.</p>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button type="button" variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      {loading ? (
        <LoadingSpinner className="py-20" />
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center rounded-xl border border-border bg-card shadow-sm">
          <Megaphone size={64} className="text-muted-foreground" />
          <h2 className="text-xl font-semibold">No campaigns yet</h2>
          <p className="text-muted-foreground">Create your first campaign to organize your links.</p>
          <Button onClick={() => setCreateOpen(true)}><Plus size={16} /> Create Campaign</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map(CampaignCard)}
        </div>
      )}
    </div>
  );
}
