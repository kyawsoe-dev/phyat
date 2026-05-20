'use client';

import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (response: { credential?: string }) => void }) => void;
          renderButton: (element: HTMLElement, options: Record<string, string | number | boolean>) => void;
        };
      };
    };
  }
}

type GoogleSignInButtonProps = {
  redirectTo?: string;
};

export function GoogleSignInButton({ redirectTo = '/dashboard' }: GoogleSignInButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const handleCredential = useCallback(
    async (response: { credential?: string }) => {
      if (!response.credential) {
        setError('Unable to sign in with Google.');
        return;
      }

      setError(null);
      const result = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ idToken: response.credential }),
      });

      if (!result.ok) {
        const data = await result.json().catch(() => ({ message: 'Unable to sign in with Google.' }));
        setError(data.message ?? 'Unable to sign in with Google.');
        return;
      }

      router.push(redirectTo);
      router.refresh();
    },
    [redirectTo, router],
  );

  const renderGoogleButton = useCallback(() => {
    if (!clientId || !buttonRef.current || !window.google) return;

    buttonRef.current.innerHTML = '';
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleCredential,
    });
    window.google.accounts.id.renderButton(buttonRef.current, {
      theme: 'outline',
      size: 'large',
      type: 'standard',
      shape: 'rectangular',
      text: 'continue_with',
      width: 336,
    });
  }, [clientId, handleCredential]);

  useEffect(() => {
    renderGoogleButton();
  }, [renderGoogleButton]);

  if (!clientId) return null;

  return (
    <div className="space-y-2">
      <Script src="https://accounts.google.com/gsi/client" async defer onLoad={renderGoogleButton} />
      <div className="flex min-h-10 justify-center" ref={buttonRef} />
      {error && <p className="text-center text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
