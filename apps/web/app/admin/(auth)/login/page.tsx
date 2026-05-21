'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Key, Loader2, Smartphone, Mail, Lock } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { apiBaseUrl } from '@/lib/utils';

type Step = 'login' | 'check' | 'setup' | 'verify';

export default function AdminLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [setupData, setSetupData] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [jwtToken, setJwtToken] = useState('');

  useEffect(() => {
    if (setupData?.otpauthUrl && !qrDataUrl) {
      generateQrCode(setupData.otpauthUrl);
    }
  }, [setupData]);

  async function generateQrCode(text: string) {
    try {
      const QRCode = await import('qrcode');
      const url = await QRCode.toDataURL(text, { width: 200, margin: 2 });
      setQrDataUrl(url);
    } catch {
      setQrDataUrl('');
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${apiBaseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase(), password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? 'Invalid email or password.');
      }

      const data = await res.json();
      setJwtToken(data.accessToken);

      const meRes = await fetch(`${apiBaseUrl}/auth/me`, {
        headers: { authorization: `Bearer ${data.accessToken}` },
        cache: 'no-store',
      });

      if (!meRes.ok) throw new Error('Unable to verify account.');
      const me = await meRes.json() as { isAdmin: boolean };

      if (!me.isAdmin) {
        throw new Error('Access denied. Admin privileges required.');
      }

      await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ accessToken: data.accessToken }),
      });

      setStep('check');
      await check2faStatus(data.accessToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function check2faStatus(token: string) {
    try {
      const res = await fetch(`${apiBaseUrl}/admin/2fa/setup`, {
        headers: { authorization: `Bearer ${token}` },
        cache: 'no-store',
      });

      if (!res.ok) {
        setStep('verify');
        return;
      }

      const data = await res.json();
      if (data.otpauthUrl) {
        setSetupData(data);
        setStep('setup');
      } else {
        setStep('verify');
      }
    } catch {
      setStep('verify');
    }
  }

  async function handleSetupVerify(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${apiBaseUrl}/admin/2fa/verify-setup`, {
        method: 'POST',
        headers: { authorization: `Bearer ${jwtToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({ token: totp }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? 'Invalid code');
      }

      await doVerifyLogin(totp);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await doVerifyLogin(totp);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  }

  async function doVerifyLogin(code: string) {
    const res = await fetch(`${apiBaseUrl}/admin/2fa/verify`, {
      method: 'POST',
      headers: { authorization: `Bearer ${jwtToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ token: code }),
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
  }

  if (step === 'login') {
    return (
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 shadow-sm">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Shield size={28} />
          </div>
          <h1 className="text-xl font-bold">Admin Login</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Sign in with your admin credentials</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label htmlFor="email" className="text-sm font-medium mb-1.5 block">Email <span className="text-red-500">*</span></label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@example.com" className="pl-9" required />
            </div>
          </div>
          <div>
            <label htmlFor="password" className="text-sm font-medium mb-1.5 block">Password <span className="text-red-500">*</span></label>
            <PasswordInput id="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required />
          </div>

          {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-md">{error}</p>}

          <Button type="submit" className="w-full h-11" disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
            Sign in
          </Button>
        </form>
      </div>
    );
  }

  if (step === 'check') {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={28} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (step === 'setup') {
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
          <p className="font-mono text-sm tracking-wider select-all break-all">{setupData?.secret}</p>
        </div>

        <form onSubmit={handleSetupVerify} className="space-y-4">
          <div>
            <label htmlFor="totp-setup" className="text-sm font-medium mb-1.5 block">Authentication Code</label>
            <div className="relative">
              <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input id="totp-setup" value={totp} onChange={(e) => setTotp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" className="pl-9 text-center text-lg tracking-widest font-mono" maxLength={6} required />
            </div>
          </div>

          {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-md">{error}</p>}

          <Button type="submit" className="w-full h-11" disabled={totp.length !== 6 || loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
            Enable & Verify
          </Button>
        </form>
      </div>
    );
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
          <label htmlFor="totp-verify" className="text-sm font-medium mb-1.5 block">Authentication Code</label>
          <div className="relative">
            <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input id="totp-verify" value={totp} onChange={(e) => setTotp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" className="pl-9 text-center text-lg tracking-widest font-mono" maxLength={6} required />
          </div>
        </div>

        {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-md">{error}</p>}

        <Button type="submit" className="w-full h-11" disabled={totp.length !== 6 || loading}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
          Verify
        </Button>
      </form>
    </div>
  );
}
