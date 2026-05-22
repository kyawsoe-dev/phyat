import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { apiBaseUrl } from '@/lib/utils';
import { getAdminToken, getAdmin2faToken } from '@/lib/admin-auth';

export const metadata: Metadata = {
  title: 'Admin Authentication',
};

export default async function AdminAuthLayout({ children }: { children: React.ReactNode }) {
  const token = getAdminToken();
  const twofaToken = getAdmin2faToken();

  // Only skip login if BOTH cookies exist AND the token is still valid
  if (token && twofaToken) {
    try {
      const me = await fetch(`${apiBaseUrl}/auth/me`, {
        headers: { authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (me.ok) {
        const user = await me.json() as { isAdmin: boolean };
        if (user.isAdmin) {
          redirect('/admin');
        }
      }
    } catch {
      // Token invalid — let user log in again
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-12">
      {children}
    </div>
  );
}
