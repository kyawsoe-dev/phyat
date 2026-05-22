'use client';

import Link from "next/link";
import { useFormState } from "react-dom";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Logo } from "@/components/logo";
import { AlertCircle, Shield, Loader2, Smartphone } from "lucide-react";
import { signIn, setSessionToken } from "./actions";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

export default function SignInPage() {
  const [state, formAction] = useFormState(signIn, undefined);
  const [totp, setTotp] = useState('');
  const [totpError, setTotpError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [googleTempToken, setGoogleTempToken] = useState<string | null>(null);
  const router = useRouter();

  const tempToken = state?.tempToken ?? googleTempToken;

  async function handleTotpVerify() {
    if (!tempToken) return;
    setTotpError('');
    setVerifying(true);

    try {
      const res = await fetch('/api/auth/2fa/verify-login', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${tempToken}`,
        },
        body: JSON.stringify({ totp }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Invalid code');
      }

      const session = await res.json();

      await fetch('/api/auth/me', {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({}),
      });

      await setSessionToken(session.accessToken);

      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setTotpError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setVerifying(false);
    }
  }

  if (state?.requires2fa || googleTempToken) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-sm rounded-md border border-border bg-card p-6 shadow-soft space-y-5">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Smartphone size={24} />
            </div>
            <h1 className="text-lg font-bold">Two-Factor Authentication</h1>
            <p className="text-sm text-muted-foreground">Enter the 6-digit code from your authenticator app.</p>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Authentication Code</label>
            <Input
              value={totp}
              onChange={(e) => setTotp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="text-center text-lg tracking-widest font-mono"
              maxLength={6}
            />
          </div>
          {totpError && (
            <div className="flex items-center gap-2 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
              <AlertCircle size={16} className="shrink-0" />
              {totpError}
            </div>
          )}
          <Button className="w-full" onClick={handleTotpVerify} disabled={totp.length !== 6 || verifying}>
            {verifying ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
            Verify
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <form
        action={formAction}
        className="w-full max-w-sm rounded-md border border-border bg-card p-6 shadow-soft"
      >
        <div className="mb-6 flex flex-col items-center gap-1">
          <Logo className="flex-col" showText={false} />
          <p className="text-center text-sm text-muted-foreground">
            Fast URL shortening for smart links.
          </p>
        </div>

        {state?.error && (
          <div className="mb-4 flex items-center gap-2 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
            <AlertCircle size={16} className="shrink-0" />
            {state.error}
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium">
              Email <span className="text-red-500">*</span>
            </label>
            <Input
              id="email"
              name="email"
              placeholder="you@example.com"
              required
              type="email"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium">
              Password <span className="text-red-500">*</span>
            </label>
            <PasswordInput
              id="password"
              name="password"
              placeholder="Password"
              required
              minLength={6}
            />
          </div>
          <Button className="w-full" type="submit">
            Sign in
          </Button>
        </div>
        {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
          <div className="my-4 flex items-center gap-3 text-xs uppercase text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            <span>or</span>
            <div className="h-px flex-1 bg-border" />
          </div>
        )}
        <GoogleSignInButton onRequires2fa={(token) => setGoogleTempToken(token)} />
        <p className="mt-5 text-center text-sm text-muted-foreground">
          New to Phyat?{" "}
          <Link className="font-medium text-primary" href="/sign-up">
            Create an account
          </Link>
        </p>
      </form>
    </main>
  );
}
