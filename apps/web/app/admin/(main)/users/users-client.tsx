'use client';

import { useState } from 'react';
import { Search, ChevronLeft, ChevronRight, Trash2, Shield, ShieldOff, BarChart3, MousePointerClick, Scan, Globe, Monitor, Smartphone, Plus, Edit, Check, X, Loader2 } from 'lucide-react';
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

type User = {
  id: string;
  email: string;
  name: string | null;
  isAdmin: boolean;
  hasGoogle: boolean;
  hasPassword: boolean;
  user2faEnabled: boolean;
  admin2faEnabled: boolean;
  createdAt: string;
  tier: { code: string; name: string };
  linkCount: number;
};

type UsersData = {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

type UserAnalytics = {
  user: { id: string; email: string; name: string | null };
  totalClicks: number;
  totalScans: number;
  topLinks: Array<{ id: string; slug: string; destination: string; clickCount: number; scanCount: number }>;
  clicksByDay: Array<{ date: string; count: number }>;
  browserStats: Array<{ browser: string; count: number }>;
  osStats: Array<{ os: string; count: number }>;
  deviceStats: Array<{ device: string; count: number }>;
  countryStats: Array<{ country: string; count: number }>;
  referrerStats: Array<{ referrerDomain: string; count: number }>;
};

function SignInBadge({ hasGoogle, hasPassword }: { hasGoogle: boolean; hasPassword: boolean }) {
  if (hasGoogle && hasPassword) return <span className="text-xs text-muted-foreground" title="Google + Email">Both</span>;
  if (hasGoogle) return <span className="text-xs text-blue-600 flex items-center gap-1">G</span>;
  if (hasPassword) return <span className="text-xs text-muted-foreground">Email</span>;
  return <span className="text-xs text-muted-foreground">—</span>;
}

function TwofaBadge({ enabled }: { enabled: boolean }) {
  return enabled
    ? <span className="text-xs text-emerald-600 flex items-center gap-1"><Check size={10} /> On</span>
    : <span className="text-xs text-muted-foreground">Off</span>;
}

export function AdminUsersClient({ initialData }: { initialData: UsersData }) {
  const [data, setData] = useState(initialData);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [analyticsUser, setAnalyticsUser] = useState<User | null>(null);
  const [userAnalytics, setUserAnalytics] = useState<UserAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ email: '', name: '', password: '', tierCode: '', isAdmin: false });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ name: '', tierCode: '', isAdmin: false });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filteredUsers = data.users.filter((u) =>
    !search || u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.name || '').toLowerCase().includes(search.toLowerCase())
  );

  async function loadPage(page: number) {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (search) params.set('search', search);

    try {
      const res = await fetch(`/api/admin/users?${params}`);
      const result = await res.json();
      setData(result);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function toggleAdmin(userId: string, current: boolean) {
    try {
      await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ isAdmin: !current }),
      });
      loadPage(data.page);
    } catch {
      // ignore
    }
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setCreateError('');
    if (!createForm.email) { setCreateError('Email is required.'); return; }
    setCreating(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: createForm.email,
          name: createForm.name || undefined,
          password: createForm.password || undefined,
          tierCode: createForm.tierCode || undefined,
          isAdmin: createForm.isAdmin || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to create user');
      }
      setCreateOpen(false);
      setCreateForm({ email: '', name: '', password: '', tierCode: '', isAdmin: false });
      loadPage(1);
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  }

  function openEdit(user: User) {
    setEditTarget(user);
    setEditForm({ name: user.name || '', tierCode: user.tier.code, isAdmin: user.isAdmin });
    setEditError('');
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editTarget) return;
    setSavingEdit(true);
    setEditError('');
    try {
      const body: Record<string, unknown> = {};
      if (editForm.name !== (editTarget.name || '')) body.name = editForm.name;
      if (editForm.tierCode !== editTarget.tier.code) body.tierCode = editForm.tierCode;
      if (editForm.isAdmin !== editTarget.isAdmin) body.isAdmin = editForm.isAdmin;
      if (Object.keys(body).length === 0) { setEditOpen(false); return; }
      const res = await fetch(`/api/admin/users/${editTarget.id}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to update user');
      setEditOpen(false);
      loadPage(data.page);
    } catch {
      setEditError('Failed to save changes.');
    } finally {
      setSavingEdit(false);
    }
  }

  function openDelete(user: User) {
    setDeleteTarget(user);
    setDeleteOpen(true);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`/api/admin/users/${deleteTarget.id}`, { method: 'DELETE' });
      setDeleteOpen(false);
      setDeleteTarget(null);
      loadPage(data.page);
    } catch {
      // ignore
    } finally {
      setDeleting(false);
    }
  }

  async function openUserAnalytics(user: User) {
    setAnalyticsUser(user);
    setAnalyticsLoading(true);
    setUserAnalytics(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/analytics`);
      if (res.ok) {
        const result = await res.json();
        setUserAnalytics(result);
      }
    } catch {
      // ignore
    } finally {
      setAnalyticsLoading(false);
    }
  }

  const maxBrowserUA = Math.max(...(userAnalytics?.browserStats.map((b) => b.count) ?? [0]), 1);
  const maxOsUA = Math.max(...(userAnalytics?.osStats.map((o) => o.count) ?? [0]), 1);
  const maxDeviceUA = Math.max(...(userAnalytics?.deviceStats.map((d) => d.count) ?? [0]), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-muted-foreground">Manage all platform users</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}><Plus size={16} className="mr-1" /> Add User</Button>
      </div>

      <div className="flex gap-2 max-w-md">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="pl-9 pr-9"
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground bg-muted/30">
                <th className="px-4 py-3 font-medium w-10">#</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Login</th>
                <th className="px-4 py-3 font-medium">2FA</th>
                <th className="px-4 py-3 font-medium">Tier</th>
                <th className="px-4 py-3 font-medium">Links</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user, idx) => (
                <tr key={user.id} className="border-b border-border/50 text-foreground hover:bg-muted/20">
                  <td className="px-4 py-3 text-muted-foreground text-xs tabular-nums">{(data.page - 1) * data.limit + idx + 1}</td>
                  <td className="px-4 py-3 font-medium">{user.name ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                  <td className="px-4 py-3"><SignInBadge hasGoogle={user.hasGoogle} hasPassword={user.hasPassword} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">User:</span> <TwofaBadge enabled={user.user2faEnabled} />
                      {user.isAdmin && <><span className="text-muted-foreground">Admin:</span> <TwofaBadge enabled={user.admin2faEnabled} /></>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full border px-2 py-0.5 text-xs font-medium">{user.tier.name}</span>
                  </td>
                  <td className="px-4 py-3">{user.linkCount}</td>
                  <td className="px-4 py-3">
                    {user.isAdmin ? (
                      <span className="text-emerald-600 flex items-center gap-1 text-xs">
                        <Shield size={12} /> Admin
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">User</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openUserAnalytics(user)}
                        className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        title="View analytics"
                      >
                        <BarChart3 size={14} />
                      </button>
                      <button
                        onClick={() => openEdit(user)}
                        className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        title="Edit user"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => toggleAdmin(user.id, user.isAdmin)}
                        className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        title={user.isAdmin ? 'Remove admin' : 'Make admin'}
                      >
                        {user.isAdmin ? <ShieldOff size={14} /> : <Shield size={14} />}
                      </button>
                      <button
                        onClick={() => openDelete(user)}
                        className="rounded p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 transition-colors"
                        title="Delete user"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {data.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            Showing {(data.page - 1) * data.limit + 1}–{Math.min(data.page * data.limit, data.total)} of {data.total}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="secondary"
              size="sm"
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
                  variant={data.page === pageNum ? 'primary' : 'secondary'}
                  size="sm"
                  disabled={loading}
                  onClick={() => loadPage(pageNum)}
                  className="min-w-[32px]"
                >
                  {pageNum}
                </Button>
              );
            })}
            <Button
              variant="secondary"
              size="sm"
              disabled={data.page >= data.totalPages || loading}
              onClick={() => loadPage(data.page + 1)}
            >
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}

      {/* Create User Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
            <DialogDescription>Create a new user account manually.</DialogDescription>
          </DialogHeader>
          <form onSubmit={createUser} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Email *</label>
              <Input value={createForm.email} onChange={e => setCreateForm({ ...createForm, email: e.target.value })} required placeholder="user@example.com" />
            </div>
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} placeholder="Optional" />
            </div>
            <div>
              <label className="text-sm font-medium">Password</label>
              <Input type="password" value={createForm.password} onChange={e => setCreateForm({ ...createForm, password: e.target.value })} placeholder="Leave empty for Google-only" />
            </div>
            <div>
              <label className="text-sm font-medium">Tier</label>
              <select value={createForm.tierCode} onChange={e => setCreateForm({ ...createForm, tierCode: e.target.value })} className="w-full h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm">
                <option value="">Default (FREE)</option>
                <option value="FREE">FREE</option>
                <option value="PRO">PRO</option>
                <option value="DEVELOPER">DEVELOPER</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={createForm.isAdmin} onChange={e => setCreateForm({ ...createForm, isAdmin: e.target.checked })} />
              Grant admin privileges
            </label>
            {createError && <p className="text-sm text-red-600">{createError}</p>}
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</Button>
              <Button type="submit" disabled={creating}>{creating ? <><Loader2 size={14} className="animate-spin mr-1" /> Creating...</> : 'Create User'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>{editTarget?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">Tier</label>
              <select value={editForm.tierCode} onChange={e => setEditForm({ ...editForm, tierCode: e.target.value })} className="w-full h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm">
                <option value="FREE">FREE</option>
                <option value="PRO">PRO</option>
                <option value="DEVELOPER">DEVELOPER</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={editForm.isAdmin} onChange={e => setEditForm({ ...editForm, isAdmin: e.target.checked })} />
              Admin privileges
            </label>
            {editError && <p className="text-sm text-red-600">{editError}</p>}
            <DialogFooter>
              <Button variant="secondary" onClick={() => setEditOpen(false)} disabled={savingEdit}>Cancel</Button>
              <Button onClick={saveEdit} disabled={savingEdit}>{savingEdit ? <><Loader2 size={14} className="animate-spin mr-1" /> Saving...</> : 'Save Changes'}</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Delete User?</DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>{deleteTarget?.email}</strong> and all associated data. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end gap-2 pt-4">
            <Button variant="secondary" onClick={() => setDeleteOpen(false)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>{deleting ? 'Deleting...' : 'Delete User'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Analytics Dialog */}
      <Dialog open={!!analyticsUser} onOpenChange={(open) => !open && setAnalyticsUser(null)}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Analytics for {analyticsUser?.name ?? analyticsUser?.email}</DialogTitle>
            <DialogDescription>
              Aggregated analytics across all links owned by this user.
            </DialogDescription>
          </DialogHeader>

          {analyticsLoading && (
            <div className="text-center py-8 text-muted-foreground">Loading analytics...</div>
          )}

          {userAnalytics && !analyticsLoading && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border bg-card p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <MousePointerClick size={14} /> Total Clicks
                  </div>
                  <p className="text-2xl font-bold">{userAnalytics.totalClicks.toLocaleString()}</p>
                </div>
                <div className="rounded-lg border bg-card p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Scan size={14} /> Total Scans
                  </div>
                  <p className="text-2xl font-bold">{userAnalytics.totalScans.toLocaleString()}</p>
                </div>
              </div>

              {userAnalytics.topLinks.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Top Links</h3>
                  <div className="space-y-2">
                    {userAnalytics.topLinks.map((link) => (
                      <div key={link.id} className="flex items-center justify-between text-sm bg-muted/30 rounded-lg p-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate">{link.destination}</p>
                          <p className="text-xs text-muted-foreground">/{link.slug}</p>
                        </div>
                        <span className="font-medium shrink-0 ml-2">{link.clickCount} clicks</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-1"><Globe size={12} /> Browser</h3>
                  <div className="space-y-1">
                    {userAnalytics.browserStats.slice(0, 5).map((b) => (
                      <div key={b.browser} className="flex items-center gap-2 text-xs">
                        <span className="w-16 truncate text-muted-foreground">{b.browser}</span>
                        <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary/60 rounded-full" style={{ width: `${(b.count / maxBrowserUA) * 100}%` }} />
                        </div>
                        <span className="w-8 text-right tabular-nums text-muted-foreground">{b.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-1"><Monitor size={12} /> OS</h3>
                  <div className="space-y-1">
                    {userAnalytics.osStats.slice(0, 5).map((o) => (
                      <div key={o.os} className="flex items-center gap-2 text-xs">
                        <span className="w-16 truncate text-muted-foreground">{o.os}</span>
                        <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary/60 rounded-full" style={{ width: `${(o.count / maxOsUA) * 100}%` }} />
                        </div>
                        <span className="w-8 text-right tabular-nums text-muted-foreground">{o.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-1"><Smartphone size={12} /> Device</h3>
                  <div className="space-y-1">
                    {userAnalytics.deviceStats.slice(0, 5).map((d) => (
                      <div key={d.device} className="flex items-center gap-2 text-xs">
                        <span className="w-16 truncate text-muted-foreground">{d.device}</span>
                        <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary/60 rounded-full" style={{ width: `${(d.count / maxDeviceUA) * 100}%` }} />
                        </div>
                        <span className="w-8 text-right tabular-nums text-muted-foreground">{d.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-1"><Globe size={12} /> Countries</h3>
                  <div className="space-y-1">
                    {userAnalytics.countryStats.slice(0, 8).map((c) => (
                      <div key={c.country} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{c.country}</span>
                        <span className="font-medium">{c.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-1">Referrers</h3>
                  <div className="space-y-1">
                    {userAnalytics.referrerStats.slice(0, 8).map((r) => (
                      <div key={r.referrerDomain} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground truncate">{r.referrerDomain}</span>
                        <span className="font-medium">{r.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}