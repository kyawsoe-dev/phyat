'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAdmin } from '../../admin-context';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

type RequestItem = {
  id: string;
  userId: string;
  status: 'PENDING' | 'APPROVED' | 'DENIED';
  adminNote?: string | null;
  createdAt: string;
  updatedAt: string;
  user: { id: string; email: string; name: string | null };
  tier: { name: string; code: string };
};

type RequestsData = {
  requests: RequestItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export function AdminUpgradeRequestsClient({ initialData }: { initialData: RequestsData }) {
  const router = useRouter();
  const { refreshPendingCount } = useAdmin();

  const [data, setData] = useState(initialData);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Dialog states (replacing native confirm / prompt / alert)
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [approveTargetId, setApproveTargetId] = useState<string | null>(null);

  const [denyDialogOpen, setDenyDialogOpen] = useState(false);
  const [denyTargetId, setDenyTargetId] = useState<string | null>(null);
  const [denyNote, setDenyNote] = useState('');

  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function loadPage(page: number, status?: string) {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (status) params.set('status', status);
    try {
      const res = await fetch(`/api/admin/upgrade-requests?${params}`);
      const result = await res.json();
      setData(result);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  function handleFilterChange(newStatus: string) {
    setStatusFilter(newStatus);
    loadPage(1, newStatus || undefined);
  }

  // Open nice confirmation dialog instead of native confirm()
  function openApproveDialog(id: string) {
    setApproveTargetId(id);
    setApproveDialogOpen(true);
  }

  async function confirmApprove() {
    if (!approveTargetId) return;
    const id = approveTargetId;
    setApproveDialogOpen(false);
    setProcessingId(id);

    try {
      const res = await fetch(`/api/admin/upgrade-requests/${id}/approve`, { method: 'PUT' });
      if (!res.ok) throw new Error('Failed to approve');
      loadPage(data.page, statusFilter || undefined);
      refreshPendingCount(); // update sidebar badge
    } catch {
      setErrorMessage('Failed to approve the upgrade request.');
      setErrorDialogOpen(true);
    } finally {
      setProcessingId(null);
      setApproveTargetId(null);
    }
  }

  // Open nice dialog for deny (with note) instead of native prompt()
  function openDenyDialog(id: string) {
    setDenyTargetId(id);
    setDenyNote('');
    setDenyDialogOpen(true);
  }

  async function confirmDeny() {
    if (!denyTargetId) return;
    const id = denyTargetId;
    setDenyDialogOpen(false);
    setProcessingId(id);

    try {
      const res = await fetch(`/api/admin/upgrade-requests/${id}/deny`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ note: denyNote }),
      });
      if (!res.ok) throw new Error('Failed to deny');
      loadPage(data.page, statusFilter || undefined);
      refreshPendingCount(); // update sidebar badge
    } catch {
      setErrorMessage('Failed to deny the upgrade request.');
      setErrorDialogOpen(true);
    } finally {
      setProcessingId(null);
      setDenyTargetId(null);
      setDenyNote('');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Upgrade Requests</h1>
          <p className="text-muted-foreground">Review and approve user tier upgrade requests</p>
        </div>
        <Button variant="secondary" onClick={() => loadPage(1, statusFilter || undefined)} disabled={loading}>
          <RefreshCw size={16} className="mr-2" /> Refresh
        </Button>
      </div>

      <div className="flex gap-2">
        {['', 'PENDING', 'APPROVED', 'DENIED'].map((s) => (
          <Button
            key={s || 'all'}
            variant={statusFilter === s ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => handleFilterChange(s)}
          >
            {s || 'All'}
          </Button>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left p-3 font-medium">User</th>
                <th className="text-left p-3 font-medium">Requested Tier</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Requested</th>
                <th className="text-left p-3 font-medium">Note</th>
                <th className="text-right p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.requests.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No requests found.</td></tr>
              )}
              {data.requests.map((req) => (
                <tr key={req.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-3">
                    <div>{req.user.name || req.user.email}</div>
                    <div className="text-xs text-muted-foreground">{req.user.email}</div>
                  </td>
                  <td className="p-3 font-medium">{req.tier.name} <span className="text-xs text-muted-foreground">({req.tier.code})</span></td>
                  <td className="p-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      req.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                      req.status === 'APPROVED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">{new Date(req.createdAt).toLocaleString()}</td>
                  <td className="p-3 text-xs max-w-[200px] truncate" title={req.adminNote || ''}>{req.adminNote || '—'}</td>
                  <td className="p-3 text-right space-x-2">
                    {req.status === 'PENDING' && (
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="text-green-600"
                          onClick={() => openApproveDialog(req.id)}
                          disabled={processingId === req.id}
                        >
                          <Check size={14} className="mr-1" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="text-red-600"
                          onClick={() => openDenyDialog(req.id)}
                          disabled={processingId === req.id}
                        >
                          <X size={14} className="mr-1" /> Deny
                        </Button>
                      </>
                    )}
                    {req.status !== 'PENDING' && <span className="text-muted-foreground text-xs">Processed</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-between text-sm text-muted-foreground">
        <div>Page {data.page} of {data.totalPages} • {data.total} total</div>
        <div className="space-x-2">
          <Button size="sm" variant="secondary" disabled={data.page <= 1 || loading} onClick={() => loadPage(data.page - 1, statusFilter || undefined)}>Prev</Button>
          <Button size="sm" variant="secondary" disabled={data.page >= data.totalPages || loading} onClick={() => loadPage(data.page + 1, statusFilter || undefined)}>Next</Button>
        </div>
      </div>

      {/* Approve Confirmation Dialog (like sign-out dialog) */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Approve Upgrade Request?</DialogTitle>
            <DialogDescription>
              This will immediately upgrade the user to the requested tier. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end gap-2 pt-4">
            <Button variant="secondary" onClick={() => setApproveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmApprove} disabled={!!processingId}>
              Confirm Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deny Dialog with Note (replaces native prompt) */}
      <Dialog open={denyDialogOpen} onOpenChange={setDenyDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Deny Upgrade Request</DialogTitle>
            <DialogDescription>
              Optionally add a note that will be visible to the user.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <label className="text-sm font-medium mb-1.5 block">Note (optional)</label>
            <textarea
              value={denyNote}
              onChange={(e) => setDenyNote(e.target.value)}
              placeholder="Reason for denial..."
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <DialogFooter className="sm:justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setDenyDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeny} disabled={!!processingId}>
              Confirm Deny
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error Dialog (replaces native alert) */}
      <Dialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Something went wrong</DialogTitle>
            <DialogDescription>{errorMessage}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setErrorDialogOpen(false)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
