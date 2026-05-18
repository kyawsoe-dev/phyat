"use client";

import { useState } from "react";
import {
  Copy,
  Edit,
  Power,
  BarChart3,
  Check,
  Download,
  Search,
  ChevronRight,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  ExternalLink,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading";
import { CreateLinkForm } from "./create-link-form";
import { BulkUploadDialog } from "@/components/bulk-upload-dialog";
import { AnalyticsCharts } from "@/components/analytics-charts";

export type LinkRow = {
  id: string;
  shortHost: string;
  slug: string;
  title?: string | null;
  notes?: string | null;
  tags?: string[];
  destination: string;
  expiresAt?: string | null;
  passwordHash?: string | null;
  status: "ACTIVE" | "DISABLED";
  clickCount: number;
  qrCodeDataUrl?: string | null;
  createdAt: string;
  domainId?: string | null;
  domain?: { domain: string } | null;
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

export function LinkTable({
  links,
  updateAction,
  deleteAction,
  editAction,
  createAction,
  bulkCreateAction,
  nextCursor,
}: {
  links: LinkRow[];
  updateAction: (formData: FormData) => void | Promise<void>;
  deleteAction?: (formData: FormData) => void | Promise<void>;
  editAction?: (formData: FormData) => void | Promise<void>;
  createAction?: (formData: FormData) => Promise<void>;
  bulkCreateAction?: (formData: FormData) => Promise<void>;
  nextCursor?: string | null;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingLink, setEditingLink] = useState<LinkRow | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<LinkRow | null>(
    null,
  );
  const [linkStats, setLinkStats] = useState<Record<string, LinkStats>>({});
  const [statsLoading, setStatsLoading] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    destination: "",
    expiresAt: "",
    password: "",
    notes: "",
    tags: "",
    utmSource: "",
    utmMedium: "",
    utmCampaign: "",
    redirectType: "TEMPORARY",
    removePassword: false,
  });
  const [showEditAdvanced, setShowEditAdvanced] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "DISABLED">("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const filtered = links.filter((l) => {
    if (search) {
      const q = search.toLowerCase();
      if (
        !l.slug.toLowerCase().includes(q) &&
        !l.destination.toLowerCase().includes(q) &&
        !(l.title ?? "").toLowerCase().includes(q)
      )
        return false;
    }
    if (statusFilter !== "ALL" && l.status !== statusFilter) return false;
    if (startDate && new Date(l.createdAt) < new Date(startDate)) return false;
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      if (new Date(l.createdAt) > end) return false;
    }
    return true;
  });

  function toggleExpand(linkId: string) {
    if (expandedId === linkId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(linkId);
    if (!linkStats[linkId]) {
      fetchStats(linkId);
    }
  }

  async function fetchStats(linkId: string) {
    setStatsLoading(linkId);
    try {
      const res = await fetch(`/api/analytics/${linkId}/stats`);
      if (res.ok) {
        const data = (await res.json()) as LinkStats;
        setLinkStats((prev) => ({ ...prev, [linkId]: data }));
      }
    } catch {
      // ignore
    } finally {
      setStatsLoading(null);
    }
  }

  function copyUrl(slug: string, shortHost: string, domain?: { domain: string } | null) {
    const base = domain ? `https://${domain.domain}` : shortHost.startsWith('localhost') ? `http://${shortHost}` : `https://${shortHost}`;
    const url = `${base}/${slug}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setCopiedId(slug);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function startEdit(link: LinkRow) {
    setEditingLink(link);
    setEditForm({
      title: link.title ?? "",
      notes: link.notes ?? "",
      tags: (link.tags ?? []).join(", "),
      destination: link.destination,
      expiresAt: link.expiresAt ? link.expiresAt.slice(0, 16) : "",
      password: "",
      utmSource: link.utmParams?.utm_source ?? "",
      utmMedium: link.utmParams?.utm_medium ?? "",
      utmCampaign: link.utmParams?.utm_campaign ?? "",
      redirectType: link.redirectType ?? "TEMPORARY",
      removePassword: false,
    });
    setShowEditAdvanced(false);
  }

  function handleEditSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingLink || !editAction) return;
    const formData = new FormData(event.currentTarget);
    formData.set("id", editingLink.id);
    formData.set("active", "true");
    editAction(formData);
    setEditingLink(null);
  }

  function linkUrl(slug: string, shortHost: string, domain?: { domain: string } | null): string {
    const base = domain ? `https://${domain.domain}` : shortHost.startsWith('localhost') ? `http://${shortHost}` : `https://${shortHost}`;
    return `${base}/${slug}`;
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
          <h1 className="text-2xl font-bold tracking-tight">Links</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create, manage, and track your shortened URLs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/api/links/export" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border px-3 text-sm font-medium hover:bg-muted">
            <Download size={16} /> Export
          </a>
          {bulkCreateAction && <BulkUploadDialog onCreate={bulkCreateAction} />}
          {createAction && <CreateLinkForm createLink={createAction} />}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-background shadow-sm overflow-hidden">
        {/* Search & Filters */}
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
              onChange={(e) => setStatusFilter(e.target.value as "ALL" | "ACTIVE" | "DISABLED")}
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
          <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Search size={20} className="text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">
              {search || statusFilter !== "ALL" || startDate || endDate ? "No links match your filters" : "No links yet"}
            </p>
            <p className="text-sm text-muted-foreground">
              {search || statusFilter !== "ALL" || startDate || endDate
                ? "Try adjusting your search or filter criteria."
                : "Create your first shortened URL to get started."}
            </p>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="hidden border-b border-border bg-muted/30 px-5 py-3 md:grid md:grid-cols-[40px_1fr_100px_100px_120px] md:gap-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                #
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Short Link
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Status
              </span>
              <span className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Clicks
              </span>
              <span className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Actions
              </span>
            </div>

            {/* Rows */}
            {filtered.map((link, index) => {
              const isExpanded = expandedId === link.id;
              const isActive = link.status === "ACTIVE";
              const stats = linkStats[link.id];

              return (
                <div
                  key={link.id}
                  className="border-b border-border last:border-b-0"
                >
                  {/* Row */}
                  <div className="px-5 py-4 transition-colors hover:bg-muted/20">
                    <div className="flex items-center gap-4">
                      {/* Index */}
                      <span className="hidden w-8 shrink-0 text-xs font-semibold text-muted-foreground md:block">
                        {index + 1}
                      </span>

                      {/* Main Content */}
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-center gap-2.5">
                          {/* Status Dot */}
                          <span
                            className={`h-2 w-2 shrink-0 rounded-full ${
                              isActive
                                ? "bg-green-500"
                                : "bg-muted-foreground/40"
                            }`}
                          />
                          {/* Short URL */}
                          <a
                            href={linkUrl(link.slug, link.shortHost, (link as any).domain)}
                            target="_blank"
                            rel="noreferrer"
                            className="truncate text-sm font-semibold text-primary hover:underline"
                          >
                            {linkUrl(link.slug, link.shortHost, (link as any).domain)}
                          </a>
                          <ExternalLink
                            size={12}
                            className="shrink-0 text-muted-foreground/50"
                          />
                        </div>
                        <p className="truncate pl-[18px] text-xs text-muted-foreground">
                          {link.title ? (
                            <>
                              <span className="font-medium text-foreground/70">
                                {link.title}
                              </span>
                              <span className="mx-1.5 text-muted-foreground/40">
                                &middot;
                              </span>
                            </>
                          ) : null}
                          {link.destination}
                        </p>
                        {link.tags && link.tags.length > 0 && (
                          <div className="pl-[18px] flex flex-wrap gap-1">
                            {link.tags.slice(0, 4).map((tag) => (
                              <span key={tag} className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`hidden shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold md:inline-flex ${
                          isActive
                            ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {isActive ? "Active" : "Disabled"}
                      </span>

                      {/* Click Count */}
                      <div className="hidden shrink-0 text-right md:block">
                        <span className="text-sm font-bold tabular-nums">
                          {formatCount(link.clickCount)}
                        </span>
                        <span className="ml-1 text-xs text-muted-foreground">
                          cls
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          title="Copy short URL"
                          onClick={() => copyUrl(link.slug, link.shortHost, (link as any).domain)}
                          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          {copiedId === link.slug ? (
                            <Check size={15} className="text-green-600" />
                          ) : (
                            <Copy size={15} />
                          )}
                        </button>

                        <button
                          type="button"
                          title="Analytics"
                          onClick={() => toggleExpand(link.id)}
                          className={`rounded-lg p-2 transition-colors hover:bg-muted ${
                            isExpanded
                              ? "text-primary"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <BarChart3 size={15} />
                        </button>

                        <button
                          type="button"
                          title="Edit"
                          onClick={() => startEdit(link)}
                          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          <Edit size={15} />
                        </button>

                        <form action={updateAction} className="inline">
                          <input name="id" type="hidden" value={link.id} />
                          <input
                            name="active"
                            type="hidden"
                            value={isActive ? "false" : "true"}
                          />
                          <button
                            type="submit"
                            title={isActive ? "Disable" : "Enable"}
                            className={`rounded-lg p-2 transition-colors hover:bg-muted ${
                              isActive
                                ? "text-muted-foreground hover:text-foreground"
                                : "text-muted-foreground hover:text-green-600"
                            }`}
                          >
                            <Power size={15} />
                          </button>
                        </form>

                        {/* {deleteAction && (
                          <button
                            type="button"
                            title="Delete"
                            onClick={() => setShowDeleteConfirm(link)}
                            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-red-500"
                          >
                            <Trash2 size={15} />
                          </button>
                        )} */}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Analytics */}
                  {isExpanded && (
                    <div className="border-t border-border bg-muted/10 px-5 py-5">
                      {statsLoading === link.id ? (
                        <LoadingSpinner className="py-12" />
                      ) : !stats ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          No clicks yet
                        </p>
                      ) : (
                        <AnalyticsCharts stats={stats} />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        {/* Load More */}
        {nextCursor && (
          <div className="border-t border-border px-5 py-4 text-center">
            <Button variant="ghost" className="h-9 px-4 text-xs">
              Load more <ChevronRight size={14} />
            </Button>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      {editingLink && (
        <Dialog open={true} onOpenChange={() => setEditingLink(null)}>
          <DialogContent className="sm:max-w-[640px]">
            <DialogHeader>
              <DialogTitle className="text-lg">Edit link</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditSubmit}>
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-sm font-medium" htmlFor="edit-destination">
                      Destination URL
                    </label>
                    <Input
                      id="edit-destination"
                      name="destination"
                      placeholder="https://example.com"
                      type="url"
                      required
                      value={editForm.destination}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, destination: e.target.value }))
                      }
                      className="h-9"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium" htmlFor="edit-title">
                      Title
                    </label>
                    <Input
                      id="edit-title"
                      name="title"
                      placeholder="Campaign title"
                      value={editForm.title}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, title: e.target.value }))
                      }
                      className="h-9"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium" htmlFor="edit-expiresAt">
                      Expiration
                    </label>
                    <Input
                      id="edit-expiresAt"
                      name="expiresAt"
                      type="datetime-local"
                      value={editForm.expiresAt}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, expiresAt: e.target.value }))
                      }
                      className="h-9"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowEditAdvanced(!showEditAdvanced)}
                  className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  {showEditAdvanced ? <ChevronDown size={13} /> : <ChevronRightIcon size={13} />}
                  {showEditAdvanced ? "Hide" : "Show"} advanced options
                </button>

                {showEditAdvanced && (
                  <div className="space-y-3 rounded-lg border border-border p-3 bg-muted/10">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-sm font-medium" htmlFor="edit-notes">Notes</label>
                        <Input
                          id="edit-notes"
                          name="notes"
                          placeholder="Internal note"
                          value={editForm.notes}
                          onChange={(e) =>
                            setEditForm((p) => ({ ...p, notes: e.target.value }))
                          }
                          className="h-9"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium" htmlFor="edit-tags">Tags</label>
                        <Input
                          id="edit-tags"
                          name="tags"
                          placeholder="social, spring-sale"
                          value={editForm.tags}
                          onChange={(e) =>
                            setEditForm((p) => ({ ...p, tags: e.target.value }))
                          }
                          className="h-9"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium">UTM params</label>
                      <div className="grid grid-cols-3 gap-2">
                        <Input
                          name="utmSource"
                          placeholder="Source"
                          value={editForm.utmSource}
                          onChange={(e) => setEditForm((p) => ({ ...p, utmSource: e.target.value }))}
                          className="h-9"
                        />
                        <Input
                          name="utmMedium"
                          placeholder="Medium"
                          value={editForm.utmMedium}
                          onChange={(e) => setEditForm((p) => ({ ...p, utmMedium: e.target.value }))}
                          className="h-9"
                        />
                        <Input
                          name="utmCampaign"
                          placeholder="Campaign"
                          value={editForm.utmCampaign}
                          onChange={(e) => setEditForm((p) => ({ ...p, utmCampaign: e.target.value }))}
                          className="h-9"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-sm font-medium" htmlFor="edit-redirectType">Redirect</label>
                        <select
                          id="edit-redirectType"
                          name="redirectType"
                          className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm shadow-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                          value={editForm.redirectType}
                          onChange={(e) => setEditForm((p) => ({ ...p, redirectType: e.target.value }))}
                        >
                          <option value="TEMPORARY">302 temporary</option>
                          <option value="PERMANENT">301 permanent</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium" htmlFor="edit-password">
                          {editingLink.passwordHash ? "Change password" : "Password"}
                        </label>
                        <Input
                          id="edit-password"
                          name="password"
                          type="password"
                          placeholder={editingLink.passwordHash ? "New password" : "Optional"}
                          minLength={6}
                          value={editForm.password}
                          onChange={(e) =>
                            setEditForm((p) => ({ ...p, password: e.target.value }))
                          }
                          className="h-9"
                        />
                      </div>
                    </div>

                    {editingLink.passwordHash && (
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          name="removePassword"
                          checked={editForm.removePassword}
                          onChange={(e) =>
                            setEditForm((p) => ({
                              ...p,
                              removePassword: e.target.checked,
                            }))
                          }
                          className="rounded border-border"
                        />
                        Remove password protection
                      </label>
                    )}
                  </div>
                )}
              </div>

              <DialogFooter className="mt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditingLink(null)}
                  className="h-9"
                >
                  Cancel
                </Button>
                <Button type="submit" className="h-9">Save changes</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <Dialog open={true} onOpenChange={() => setShowDeleteConfirm(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete link?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              This will permanently delete{" "}
              <strong>
                {linkUrl(showDeleteConfirm.slug, showDeleteConfirm.shortHost, (showDeleteConfirm as any).domain)}
              </strong>
              . This action cannot be undone.
            </p>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowDeleteConfirm(null)}
              >
                Cancel
              </Button>
              <form action={deleteAction}>
                <input type="hidden" name="id" value={showDeleteConfirm.id} />
                <Button type="submit" variant="destructive">
                  Delete link
                </Button>
              </form>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
