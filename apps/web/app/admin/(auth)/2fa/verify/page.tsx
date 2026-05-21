'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Key, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function Admin2faVerifyPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/2fa/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? 'Invalid code');
      }

      const data = await res.json();

      await fetch('/api/admin/2fa/set-session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ twofaToken: data.twofaToken }),
      });

      router.push('/admin');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 shadow-sm">
      <div className="text-center mb-6">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Shield size={28} />
        </div>
        <h1 className="text-xl font-bold">Two-Factor Authentication</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Enter the 6-digit code from your authenticator app.
        </p>
      </div>

      <form onSubmit={handleVerify} className="space-y-4">
        <div>
          <label htmlFor="token" className="text-sm font-medium mb-1.5 block">Authentication Code</label>
          <div className="relative">
            <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input id="token" value={token} onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" className="pl-9 text-center text-lg tracking-widest font-mono" maxLength={6} required />
          </div>
        </div>

        {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-md">{error}</p>}

        <Button type="submit" className="w-full h-11" disabled={token.length !== 6 || loading}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
          Verify
        </Button>
      </form>
    </div>
  );
}
