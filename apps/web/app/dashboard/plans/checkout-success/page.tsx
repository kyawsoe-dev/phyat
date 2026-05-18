'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, Loader2 } from 'lucide-react';

export default function CheckoutStatus() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'checking' | 'success' | 'failed'>('checking');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const checkoutStatus = searchParams.get('checkout');

    if (checkoutStatus === 'cancelled') {
      setStatus('failed');
      const timer = setTimeout(() => router.replace('/dashboard/plans'), 4000);
      return () => clearTimeout(timer);
    }

    if (sessionId) {
      // Poll for subscription confirmation – Stripe webhook receives the session first,
      // so we re-fetch the subscription a few times until it reflects the new tier.
      let attempts = 0;
      const maxAttempts = 10;

      const poll = async () => {
        attempts++;
        try {
          const res = await fetch('/api/subscriptions/current', { cache: 'no-store' });
          const sub = await res.json();
          // If we got an active sub whose status event has fired (status !== ACTIVE still works for polling after initial check),
          // we're good. After the webhook the DB row will reflect the new tierCode.
          if (sub?.id) {
            await fetch('/api/subscriptions/current', { cache: 'no-store' });
            setStatus('success');
            setTimeout(() => router.replace('/dashboard/plans'), 3000);
            return;
          }
        } catch (_) {/* ignore */}
        if (attempts < maxAttempts) setTimeout(poll, 2000);
        else {
          setStatus('failed');
          setTimeout(() => router.replace('/dashboard/plans'), 4000);
        }
      };

      setTimeout(poll, 1500);
    }
  }, [searchParams, router]);

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30">
          <Check size={32} className="text-green-600 dark:text-green-400" />
        </div>
        <h1 className="text-2xl font-bold">Payment Successful</h1>
        <p className="text-muted-foreground max-w-sm">
          Your subscription has been activated. Redirecting you to the plans page…
        </p>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <h1 className="text-2xl font-bold">Checkout Cancelled</h1>
        <p className="text-muted-foreground max-w-sm">
          {error ?? 'Your payment was cancelled. You will be redirected shortly…'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <Loader2 size={48} className="animate-spin text-primary" />
      <h1 className="text-2xl font-bold">Confirming Payment</h1>
      <p className="text-muted-foreground max-w-sm">
        We are confirming your payment with Stripe. This may take a few seconds…
      </p>
    </div>
  );
}
