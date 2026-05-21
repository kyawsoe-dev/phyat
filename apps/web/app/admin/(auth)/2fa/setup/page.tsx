'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Smartphone, Key, Shield, Loader2, Check } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function Admin2faSetupPage() {
  const router = useRouter();
  const [secret, setSecret] = useState('');
  const [otpauthUrl, setOtpauthUrl] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    fetchSetupData();
  }, []);

  useEffect(() => {
    if (otpauthUrl && !qrDataUrl) {
      generateQrCode(otpauthUrl);
    }
  }, [otpauthUrl]);

  async function generateQrCode(text: string) {
    try {
      const QRCode = await import('qrcode');
      const url = await QRCode.toDataURL(text, { width: 200, margin: 2 });
      setQrDataUrl(url);
    } catch {
      setQrDataUrl('');
    }
  }

  async function fetchSetupData() {
    try {
      const res = await fetch('/api/admin/2fa/setup');
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.message?.includes('already enabled')) {
          setEnabled(true);
        }
        return;
      }
      const data = await res.json();
      setSecret(data.secret);
      setOtpauthUrl(data.otpauthUrl);
    } catch {
      setError('Failed to load setup data');
    } finally {
      setFetching(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/2fa/verify-setup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? 'Invalid code');
      }

      router.push('/admin');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={28} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (enabled) {
    return (
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 shadow-sm text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
          <Check size={28} />
        </div>
        <h1 className="text-xl font-bold mb-2">2FA Already Enabled</h1>
        <p className="text-sm text-muted-foreground mb-6">Two-factor authentication is already active for your admin account.</p>
        <Button onClick={() => router.push('/admin')} className="w-full">Go to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 shadow-sm">
      <div className="text-center mb-6">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Smartphone size={28} />
        </div>
        <h1 className="text-xl font-bold">Set Up 2FA</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Scan the QR code with your authenticator app, then enter the code below.
        </p>
      </div>

      {qrDataUrl && (
        <div className="flex justify-center mb-5">
          <div className="rounded-xl border border-border bg-white p-3">
            <Image src={qrDataUrl} alt="2FA QR Code" width={180} height={180} unoptimized />
          </div>
        </div>
      )}

      <div className="mb-6 rounded-lg border border-border bg-muted/30 p-3 text-center">
        <p className="text-xs font-medium text-muted-foreground mb-1">Or enter this key manually</p>
        <p className="font-mono text-sm tracking-wider select-all break-all">{secret}</p>
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
          Enable 2FA
        </Button>
      </form>
    </div>
  );
}
