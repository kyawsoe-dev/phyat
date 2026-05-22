'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Mail, Lock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { apiBaseUrl } from '@/lib/utils';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

      // Admin 2FA required
      if (data.requiresAdmin2fa) {
        router.push(`/admin/2fa/verify?token=${encodeURIComponent(data.accessToken)}`);
        return;
      }

      // User-level 2FA — admins should use regular sign-in page
      if (data.requires2fa) {
        router.push('/sign-in');
        return;
      }

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

      router.push('/admin');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

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
