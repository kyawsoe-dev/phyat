'use client';

import { useState, useEffect } from 'react';
import { Globe, Plus, Check, X, Loader2, Trash2, ExternalLink, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

type Domain = {
  id: string;
  domain: string;
  verified: boolean;
  verificationToken: string;
  isDefault: boolean;
  _count: { links: number };
  createdAt: string;
};

export default function DomainsPage() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  async function loadDomains() {
    setLoading(true);
    try {
      const res = await fetch('/api/domains');
      if (res.ok) setDomains(await res.json());
    } catch {} finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadDomains(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);
    const res = await fetch('/api/domains', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ domain: newDomain }),
    });
    if (res.ok) {
      setAddOpen(false);
      setNewDomain('');
      loadDomains();
    } else {
      const data = await res.json();
      setAddError(data.message || 'Failed to add domain.');
    }
  }

  async function handleVerify(id: string) {
    setVerifying(id);
    setVerifyError(null);
    const res = await fetch(`/api/domains/${id}/verify`, { method: 'POST' });
    if (res.ok) {
      loadDomains();
    } else {
      const data = await res.json();
      setVerifyError(data.message || 'Verification failed.');
    }
    setVerifying(null);
  }

  async function handleSetDefault(id: string) {
    await fetch(`/api/domains/${id}/default`, { method: 'PUT' });
    loadDomains();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/domains/${id}`, { method: 'DELETE' });
    setDeleteConfirm(null);
    loadDomains();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Custom Domains</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Use your own domain for shortened links
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}><Plus size={16} /> Add Domain</Button>
      </div>

      {/* Add Domain Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader><DialogTitle>Add Custom Domain</DialogTitle></DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Domain</label>
              <Input
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="example.com"
                required
              />
            </div>
            {addError && <p className="text-sm text-red-600">{addError}</p>}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit">Add</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Remove domain?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Links using this domain will be unassigned from it. They will still work with the default short domain.
          </p>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button type="button" variant="destructive" onClick={() => handleDelete(deleteConfirm!)}>Remove</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Content */}
      {loading ? (
        <LoadingSpinner className="py-20" />
      ) : domains.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center rounded-xl border border-border bg-background shadow-sm">
          <Globe size={64} className="text-muted-foreground" />
          <h2 className="text-xl font-semibold">No custom domains</h2>
          <p className="text-muted-foreground">
            Add your own domain to create branded short links.
          </p>
          <Button onClick={() => setAddOpen(true)}><Plus size={16} /> Add Domain</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Setup Instructions */}
          <div className="rounded-xl border border-border bg-background shadow-sm p-5">
            <h3 className="text-sm font-semibold mb-2">How to set up a custom domain</h3>
            <ol className="space-y-1.5 text-sm text-muted-foreground list-decimal list-inside">
              <li>Add your domain below</li>
              <li>Add the following CNAME record to your DNS: <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">CNAME @ phyat.app</code></li>
              <li>Add a TXT record with the verification token shown for your domain</li>
              <li>Click Verify to confirm ownership</li>
            </ol>
          </div>

          {domains.map((d) => (
            <div
              key={d.id}
              className={`rounded-xl border bg-background shadow-sm ${
                d.verified ? 'border-border' : 'border-amber-200 dark:border-amber-800'
              }`}
            >
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{d.domain}</h3>
                      {d.verified ? (
                        <span className="flex items-center gap-1 text-[10px] font-medium text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/30 px-1.5 py-0.5 rounded">
                          <Check size={10} /> Verified
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30 px-1.5 py-0.5 rounded">
                          <X size={10} /> Pending
                        </span>
                      )}
                      {d.isDefault && (
                        <span className="text-[10px] font-medium text-blue-700 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {d._count.links} link{d._count.links !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-4">
                    {!d.verified && (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => handleVerify(d.id)}
                        disabled={verifying === d.id}
                      >
                        {verifying === d.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        Verify
                      </Button>
                    )}
                    {d.verified && !d.isDefault && (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => handleSetDefault(d.id)}
                      >
                        Set as Default
                      </Button>
                    )}
                    <button
                      type="button"
                      onClick={() => setDeleteConfirm(d.id)}
                      className="rounded-lg p-2 text-muted-foreground hover:text-red-500 hover:bg-muted transition-colors"
                      title="Remove"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {!d.verified && (
                  <div className="mt-4 rounded-lg bg-muted/50 p-4 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      Add this TXT record to your DNS:
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs bg-background border border-border rounded px-3 py-2 font-mono break-all">
                        phyat-verify={d.verificationToken}
                      </code>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(`phyat-verify=${d.verificationToken}`);
                        }}
                        className="shrink-0 rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title="Copy"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                    {verifyError && (
                      <p className="text-xs text-red-600">{verifyError}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      DNS changes may take up to 48 hours to propagate. Click Verify after adding the record.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
