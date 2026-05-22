"use client";

import { useState, Fragment } from "react";
import {
  Trash2,
  RefreshCw,
  BarChart3,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Copy,
  Check,
  Edit,
  Power,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { AnalyticsCharts } from "@/components/analytics-charts";

type LinkItem = {
  id: string;
  slug: string;
  destination: string;
  title?: string | null;
  status: string;
  clickCount: number;
  scanCount: number;
  createdAt: string;
  user: { id: string; email: string; name?: string | null };
  analyticsCount: number;
};

type LinksData = {
  links: LinkItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export function AdminLinksClient({ initialData }: { initialData: LinksData }) {
  const [data, setData] = useState(initialData);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Inline analytics like user dashboard
  const [expandedAnalyticsId, setExpandedAnalyticsId] = useState<string | null>(
    null,
  );
  const [analyticsData, setAnalyticsData] = useState<Record<string, any>>({});
  const [loadingAnalytics, setLoadingAnalytics] = useState<string | null>(null);

  // Copy state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function handleCopy(slug: string) {
    navigator.clipboard.writeText(`${window.location.origin}/${slug}`).then(() => {
      setCopiedId(slug);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  // Dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LinkItem | null>(null);

  // Error dialog (replaces native alert)
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Edit dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<LinkItem | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    notes: "",
    destination: "",
    tags: "",
  });

  // Client-side filtered links
  const filteredLinks = data.links.filter((link) =>
    !search ||
    link.slug.toLowerCase().includes(search.toLowerCase()) ||
    link.destination.toLowerCase().includes(search.toLowerCase()) ||
    (link.title || '').toLowerCase().includes(search.toLowerCase()) ||
    link.user.email.toLowerCase().includes(search.toLowerCase()) ||
    (link.user.name || '').toLowerCase().includes(search.toLowerCase())
  );

  async function loadPage(page: number) {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });

    try {
      const res = await fetch(`/api/admin/links?${params}`);
      const result = await res.json();
      setData(result);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  function openDeleteDialog(link: LinkItem) {
    setDeleteTarget(link);
    setDeleteDialogOpen(true);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteDialogOpen(false);
    setProcessingId(id);

    try {
      const res = await fetch(`/api/admin/links/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      loadPage(data.page);
    } catch {
      alert("Failed to delete link");
    } finally {
      setProcessingId(null);
      setDeleteTarget(null);
    }
  }

  // Edit link (like user dashboard)
  function openEditDialog(link: LinkItem) {
    setEditingLink(link);
    setEditForm({
      title: link.title || "",
      notes: "", // notes not in current LinkItem, can extend later
      destination: link.destination,
      tags: "",
    });
    setEditDialogOpen(true);
  }

  async function saveEdit() {
    if (!editingLink) return;
    const id = editingLink.id;

    setProcessingId(id);

    try {
      const tagsArray = editForm.tags
        ? editForm.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : undefined;

      const res = await fetch(`/api/admin/links/${id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: editForm.title || undefined,
          destination: editForm.destination,
          notes: editForm.notes || undefined,
          tags: tagsArray,
        }),
      });

      if (!res.ok) throw new Error("Update failed");

      setEditDialogOpen(false);
      setEditingLink(null);
      loadPage(data.page);
    } catch {
      alert("Failed to update link");
    } finally {
      setProcessingId(null);
    }
  }

  // Toggle status (Active <-> DISABLED)
  async function toggleStatus(link: LinkItem) {
    const newStatus = link.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
    setProcessingId(link.id);

    try {
      const res = await fetch(`/api/admin/links/${link.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Status update failed");
      loadPage(data.page);
    } catch {
      alert("Failed to update link status");
    } finally {
      setProcessingId(null);
    }
  }

  async function toggleAnalytics(linkId: string) {
    if (expandedAnalyticsId === linkId) {
      setExpandedAnalyticsId(null);
      return;
    }

    setExpandedAnalyticsId(linkId);
    setLoadingAnalytics(linkId);

    try {
      const res = await fetch(`/api/admin/analytics/links/${linkId}/stats`);
      if (res.ok) {
        const raw = await res.json();
        // Transform admin format → AnalyticsCharts format
        const mobileCount = raw.deviceStats?.find((d: any) => d.device?.toLowerCase() === 'mobile')?.count ?? 0;
        const allDeviceCounts = raw.deviceStats?.reduce((s: number, d: any) => s + d.count, 0) ?? 0;
        const desktopCount = raw.totalClicks - mobileCount;
        const stats = {
          totalClicks: raw.totalClicks,
          byCountry: (raw.countryStats ?? []).map((c: any) => ({ country: c.country, _count: { country: c.count } })),
          byDevice: { mobile: mobileCount, desktop: Math.max(0, desktopCount) },
          byReferrer: (raw.referrerStats ?? []).map((r: any) => ({ referrerDomain: r.referrerDomain, _count: { referrerDomain: r.count } })),
          overTime: (raw.clicksByDay ?? []).map((d: any) => ({ date: d.date, clicks: d.count })),
          byCity: [],
        };
        setAnalyticsData((prev) => ({ ...prev, [linkId]: stats }));
      }
    } catch (e) {
      console.error("Failed to load analytics for link", linkId);
    } finally {
      setLoadingAnalytics(null);
    }
  } // close toggleAnalytics

  return (
    <div className="space-y-6">
      {/* Search + Refresh */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Input
            placeholder="Search by slug, destination, title or user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 pl-9 pr-9"
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              ✕
            </button>
          )}
        </div>
        <Button
          variant="secondary"
          onClick={() => loadPage(1)}
          disabled={loading}
          className="h-10"
        >
          <RefreshCw size={16} className="mr-2" /> Refresh
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left p-3 font-medium w-10">#</th>
                <th className="text-left p-3 font-medium">Owner</th>
                <th className="text-left p-3 font-medium">Short URL</th>
                <th className="text-left p-3 font-medium">Destination</th>
                <th className="text-left p-3 font-medium">Title</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-right p-3 font-medium">Clicks</th>
                <th className="text-right p-3 font-medium">Scans</th>
                <th className="text-left p-3 font-medium">Created</th>
                <th className="text-right p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLinks.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    className="p-8 text-center text-muted-foreground"
                  >
                    {data.links.length === 0 ? 'No links found.' : 'No links match your search.'}
                  </td>
                </tr>
              )}

              {filteredLinks.map((link, idx) => (
                <Fragment key={link.id}>
                  {/* Main Row */}
                  <tr className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-3 text-muted-foreground text-xs tabular-nums">{(data.page - 1) * data.limit + idx + 1}</td>
                    <td className="p-3">
                      <div className="text-xs">
                        {link.user.name || link.user.email}
                      </div>

                      <div className="text-[10px] text-muted-foreground">
                        {link.user.email}
                      </div>
                    </td>

                    <td className="p-3 font-mono text-xs">{link.slug}</td>

                    <td className="p-3 max-w-[280px] truncate text-xs text-muted-foreground">
                      {link.destination}
                    </td>

                    <td className="p-3 max-w-[180px] truncate text-xs">
                      {link.title || "—"}
                    </td>

                    <td className="p-3">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        link.status === "ACTIVE"
                          ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {link.status === "ACTIVE" ? "Active" : "Disabled"}
                      </span>
                    </td>

                    <td className="p-3 text-right font-medium">
                      {link.clickCount}
                    </td>

                    <td className="p-3 text-right font-medium">
                      {link.scanCount}
                    </td>

                    <td className="p-3 text-xs text-muted-foreground">
                      {new Date(link.createdAt).toLocaleDateString()}
                    </td>

                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1">
                        {/* Copy */}
                        <button
                          type="button"
                          title="Copy short URL"
                          onClick={() => handleCopy(link.slug)}
                          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          {copiedId === link.slug ? (
                            <Check size={15} className="text-green-600" />
                          ) : (
                            <Copy size={15} />
                          )}
                        </button>

                        {/* Analytics */}
                        <button
                          type="button"
                          title="Toggle analytics"
                          onClick={() => toggleAnalytics(link.id)}
                          disabled={loadingAnalytics === link.id}
                          className={`rounded-lg p-2 transition-colors hover:bg-muted ${expandedAnalyticsId === link.id ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                          <BarChart3 size={15} />
                        </button>

                        {/* Edit */}
                        <button
                          type="button"
                          title="Edit link"
                          onClick={() => openEditDialog(link)}
                          disabled={processingId === link.id}
                          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          <Edit size={15} />
                        </button>

                        {/* Enable / Disable */}
                        <button
                          type="button"
                          title={link.status === "ACTIVE" ? "Disable link" : "Enable link"}
                          onClick={() => toggleStatus(link)}
                          disabled={processingId === link.id}
                          className={`rounded-lg p-2 transition-colors hover:bg-muted ${link.status === "ACTIVE" ? 'text-muted-foreground hover:text-foreground' : 'text-muted-foreground hover:text-green-600'}`}
                        >
                          <Power size={15} />
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          title="Delete link"
                          onClick={() => openDeleteDialog(link)}
                          disabled={processingId === link.id}
                          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Inline Analytics Row */}
                  {expandedAnalyticsId === link.id && (
                    <tr>
                      <td colSpan={10} className="p-0 bg-muted/30">
                        <div className="p-6 border-t">
                          <div className="flex items-center gap-2 mb-4">
                            <BarChart3 size={18} />

                            <h4 className="font-semibold">
                              Analytics for {link.slug}
                            </h4>

                            {loadingAnalytics === link.id && (
                              <span className="text-xs text-muted-foreground">
                                Loading...
                              </span>
                            )}
                          </div>

                          {analyticsData[link.id] ? (
                            <AnalyticsCharts stats={analyticsData[link.id]} />
                          ) : (
                            <div className="text-sm text-muted-foreground py-8 text-center">
                              Loading analytics data...
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {data.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            Showing {(data.page - 1) * data.limit + 1}–{Math.min(data.page * data.limit, data.total)} of {data.total}
          </p>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="secondary"
              disabled={data.page <= 1 || loading}
              onClick={() => loadPage(data.page - 1)}
            >
              <ChevronLeft size={14} />
            </Button>
            {Array.from({ length: Math.min(data.totalPages, 7) }, (_, i) => {
              let pageNum: number;
              if (data.totalPages <= 7) {
                pageNum = i + 1;
              } else if (data.page <= 4) {
                pageNum = i + 1;
              } else if (data.page >= data.totalPages - 3) {
                pageNum = data.totalPages - 6 + i;
              } else {
                pageNum = data.page - 3 + i;
              }
              return (
                <Button
                  key={pageNum}
                  size="sm"
                  variant={data.page === pageNum ? 'primary' : 'secondary'}
                  disabled={loading}
                  onClick={() => loadPage(pageNum)}
                  className="min-w-[32px]"
                >
                  {pageNum}
                </Button>
              );
            })}
            <Button
              size="sm"
              variant="secondary"
              disabled={data.page >= data.totalPages || loading}
              onClick={() => loadPage(data.page + 1)}
            >
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}

      {/* Edit Dialog (similar to user dashboard) */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Link</DialogTitle>
            <DialogDescription>
              Update details for slug:{" "}
              <span className="font-mono">{editingLink?.slug}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                value={editForm.title}
                onChange={(e) =>
                  setEditForm({ ...editForm, title: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Destination</label>
              <Input
                value={editForm.destination}
                onChange={(e) =>
                  setEditForm({ ...editForm, destination: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Notes</label>
              <Input
                value={editForm.notes}
                onChange={(e) =>
                  setEditForm({ ...editForm, notes: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">
                Tags (comma separated)
              </label>
              <Input
                value={editForm.tags}
                onChange={(e) =>
                  setEditForm({ ...editForm, tags: e.target.value })
                }
                placeholder="tag1, tag2, tag3"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={saveEdit} disabled={!!processingId}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Delete Link?</DialogTitle>
            <DialogDescription>
              This will permanently delete the link{" "}
              <span className="font-mono">{deleteTarget?.slug}</span> and all
              its analytics data. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end gap-2 pt-4">
            <Button
              variant="secondary"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={!!processingId}
            >
              Delete Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
