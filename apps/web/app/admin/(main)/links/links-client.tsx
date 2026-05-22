"use client";

import { useState, Fragment } from "react";
import {
  Trash2,
  RefreshCw,
  BarChart3,
  ChevronDown,
  ChevronRight,
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

  async function loadPage(page: number, searchTerm?: string) {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (searchTerm) params.set("search", searchTerm);

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

  function handleSearch() {
    loadPage(1, search || undefined);
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
      loadPage(data.page, search || undefined);
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
      loadPage(data.page, search || undefined);
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
      loadPage(data.page, search || undefined);
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
      const res = await fetch(`/api/analytics/${linkId}/stats`);
      if (res.ok) {
        const stats = await res.json();
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
        <div className="flex flex-1 gap-2">
          <Input
            placeholder="Search by slug, destination, title or user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="h-10"
          />
          <Button onClick={handleSearch} disabled={loading} className="h-10">
            Search
          </Button>
        </div>
        <Button
          variant="secondary"
          onClick={() => loadPage(1, search || undefined)}
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
                <th className="text-left p-3 font-medium">Owner</th>
                <th className="text-left p-3 font-medium">Short URL</th>
                <th className="text-left p-3 font-medium">Destination</th>
                <th className="text-left p-3 font-medium">Title</th>
                <th className="text-right p-3 font-medium">Clicks</th>
                <th className="text-right p-3 font-medium">Scans</th>
                <th className="text-left p-3 font-medium">Created</th>
                <th className="text-right p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.links.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="p-8 text-center text-muted-foreground"
                  >
                    No links found.
                  </td>
                </tr>
              )}

              {data.links.map((link) => (
                <Fragment key={link.id}>
                  {/* Main Row */}
                  <tr className="border-b last:border-0 hover:bg-muted/30">
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
                      <div className="flex justify-end gap-1.5">
                        {/* Analytics */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleAnalytics(link.id)}
                          title="Toggle analytics"
                          disabled={loadingAnalytics === link.id}
                        >
                          <BarChart3 size={14} />

                          {expandedAnalyticsId === link.id ? (
                            <ChevronDown size={14} className="ml-1" />
                          ) : (
                            <ChevronRight size={14} className="ml-1" />
                          )}
                        </Button>

                        {/* Edit */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditDialog(link)}
                          title="Edit link"
                          disabled={processingId === link.id}
                        >
                          Edit
                        </Button>

                        {/* Enable / Disable */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleStatus(link)}
                          disabled={processingId === link.id}
                          title={
                            link.status === "ACTIVE"
                              ? "Disable link"
                              : "Enable link"
                          }
                        >
                          {link.status === "ACTIVE" ? "Disable" : "Enable"}
                        </Button>

                        {/* Delete */}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => openDeleteDialog(link)}
                          disabled={processingId === link.id}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>

                  {/* Inline Analytics Row */}
                  {expandedAnalyticsId === link.id && (
                    <tr>
                      <td colSpan={8} className="p-0 bg-muted/30">
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
      <div className="flex justify-between text-sm text-muted-foreground">
        <div>
          Page {data.page} of {data.totalPages} • {data.total} total links
        </div>
        <div className="space-x-2">
          <Button
            size="sm"
            variant="secondary"
            disabled={data.page <= 1 || loading}
            onClick={() => loadPage(data.page - 1, search || undefined)}
          >
            Prev
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={data.page >= data.totalPages || loading}
            onClick={() => loadPage(data.page + 1, search || undefined)}
          >
            Next
          </Button>
        </div>
      </div>

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
