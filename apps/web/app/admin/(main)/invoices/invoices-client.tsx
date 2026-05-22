'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

type Invoice = {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  description?: string | null;
  status: 'PAID' | 'UNPAID' | 'CANCELLED' | 'REFUNDED';
  issuedAt: string;
  paidAt?: string | null;
  user?: { id: string; email: string; name?: string | null };
};

type InvoicesData = {
  invoices: Invoice[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export function AdminInvoicesClient({ initialData }: { initialData: InvoicesData }) {
  const [data, setData] = useState(initialData);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ userId: '', amount: 0, description: '' });
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ amount: 0, status: 'UNPAID', paidAt: '' });

  // Dialog states (replace native alert/confirm)
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Client-side filtered invoices (search by user email)
  const filteredInvoices = data.invoices.filter((inv) =>
    !search || (inv.user?.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (inv.user?.name || '').toLowerCase().includes(search.toLowerCase())
  );

  async function loadPage(page: number, st?: string) {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (st) params.set('status', st);
    try {
      const res = await fetch(`/api/admin/invoices?${params}`);
      const result = await res.json();
      setData(result);
    } catch {}
    setLoading(false);
  }

  async function createInvoice(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm.userId || !createForm.amount) {
      setErrorMessage('User ID and amount required');
      setErrorDialogOpen(true);
      return;
    }
    try {
      await fetch('/api/admin/invoices', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          userId: createForm.userId,
          amount: Number(createForm.amount),
          description: createForm.description || undefined,
        }),
      });
      setShowCreate(false);
      setCreateForm({ userId: '', amount: 0, description: '' });
      loadPage(1, statusFilter || undefined);
    } catch {
      setErrorMessage('Create failed');
      setErrorDialogOpen(true);
    }
  }

  function startEdit(inv: Invoice) {
    setEditId(inv.id);
    setEditForm({
      amount: inv.amount,
      status: inv.status,
      paidAt: inv.paidAt ? inv.paidAt.substring(0, 10) : '',
    });
  }

  async function saveEdit() {
    if (!editId) return;
    try {
      await fetch(`/api/admin/invoices/${editId}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          amount: Number(editForm.amount),
          status: editForm.status,
          paidAt: editForm.paidAt ? new Date(editForm.paidAt).toISOString() : null,
        }),
      });
      setEditId(null);
      loadPage(data.page, statusFilter || undefined);
    } catch {
      setErrorMessage('Update failed');
      setErrorDialogOpen(true);
    }
  }

  function openDeleteDialog(id: string) {
    setDeleteId(id);
    setDeleteDialogOpen(true);
  }

  async function confirmDelete() {
    if (!deleteId) return;
    setDeleteDialogOpen(false);
    try {
      await fetch(`/api/admin/invoices/${deleteId}`, { method: 'DELETE' });
      loadPage(data.page, statusFilter || undefined);
    } catch {
      setErrorMessage('Delete failed');
      setErrorDialogOpen(true);
    }
    setDeleteId(null);
  }

  async function quickMarkPaid(id: string) {
    try {
      await fetch(`/api/admin/invoices/${id}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'PAID', paidAt: new Date().toISOString() }),
      });
      loadPage(data.page, statusFilter || undefined);
    } catch {
      setErrorMessage('Failed');
      setErrorDialogOpen(true);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Invoices</h1>
          <p className="text-muted-foreground">Manage manual invoices and billing records</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>+ New Invoice</Button>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
          <div className="bg-card border rounded-lg p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold mb-4">Create Invoice</h3>
            <form onSubmit={createInvoice} className="space-y-3">
              <Input placeholder="User ID (cuid)" value={createForm.userId} onChange={e => setCreateForm({ ...createForm, userId: e.target.value })} required />
              <Input type="number" placeholder="Amount in cents (e.g. 2900)" value={createForm.amount} onChange={e => setCreateForm({ ...createForm, amount: Number(e.target.value) })} required />
              <Input placeholder="Description (optional)" value={createForm.description} onChange={e => setCreateForm({ ...createForm, description: e.target.value })} />
              <div className="flex gap-2 pt-2">
                <Button type="submit">Create</Button>
                <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex gap-2 items-center">
        <div className="relative flex-1 max-w-xs">
          <Input
            placeholder="Search by user email or name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); loadPage(1, e.target.value || undefined); }}
          className="h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="">All Statuses</option>
          <option value="PAID">PAID</option>
          <option value="UNPAID">UNPAID</option>
          <option value="CANCELLED">CANCELLED</option>
          <option value="REFUNDED">REFUNDED</option>
        </select>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-3 text-left">User</th>
              <th className="p-3 text-left">Amount</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Description</th>
              <th className="p-3 text-left">Issued</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No invoices.</td></tr>}
            {filteredInvoices.map((inv) => (
              <tr key={inv.id} className="border-t">
                <td className="p-3 text-xs">{inv.user?.email || inv.userId}</td>
                <td className="p-3 font-mono">${(inv.amount / 100).toFixed(2)}</td>
                <td className="p-3">
                  <span className={`px-2 py-px rounded text-[10px] ${inv.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{inv.status}</span>
                </td>
                <td className="p-3 text-xs truncate max-w-[180px]">{inv.description || '—'}</td>
                <td className="p-3 text-xs">{new Date(inv.issuedAt).toLocaleDateString()}</td>
                <td className="p-3 text-right space-x-1">
                  {inv.status !== 'PAID' && <Button size="sm" variant="secondary" onClick={() => quickMarkPaid(inv.id)}>Mark Paid</Button>}
                  <Button size="sm" variant="secondary" onClick={() => startEdit(inv)}>Edit</Button>
                  <Button size="sm" variant="destructive" onClick={() => openDeleteDialog(inv.id)}>Delete</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit modal */}
      {editId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setEditId(null)}>
          <div className="bg-card p-6 border rounded w-full max-w-sm" onClick={e=>e.stopPropagation()}>
            <h3 className="font-medium mb-3">Edit Invoice</h3>
            <div className="space-y-3">
              <Input type="number" value={editForm.amount} onChange={e => setEditForm({ ...editForm, amount: Number(e.target.value) })} />
              <select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value as any })} className="w-full border rounded p-2 bg-background">
                {['UNPAID','PAID','CANCELLED','REFUNDED'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <Input type="date" value={editForm.paidAt} onChange={e => setEditForm({ ...editForm, paidAt: e.target.value })} />
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={saveEdit}>Save</Button>
              <Button variant="secondary" onClick={() => setEditId(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      <div className="text-sm flex justify-between text-muted-foreground">
        <span>Page {data.page} / {data.totalPages} • Total {data.total}</span>
        <div>
          <Button size="sm" variant="secondary" disabled={data.page <= 1} onClick={() => loadPage(data.page - 1, statusFilter || undefined)}>←</Button>
          <Button size="sm" variant="secondary" disabled={data.page >= data.totalPages} onClick={() => loadPage(data.page + 1, statusFilter || undefined)} className="ml-1">→</Button>
        </div>
      </div>

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

      {/* Delete Confirmation Dialog (replaces native confirm) */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Delete Invoice?</DialogTitle>
            <DialogDescription>
              This will permanently delete the invoice record. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end gap-2 pt-4">
            <Button variant="secondary" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
