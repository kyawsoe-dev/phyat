import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { apiBaseUrl } from '@/lib/utils';
import { getAdminToken, getAdmin2faToken } from '@/lib/admin-auth';
import { AdminSidebar } from '../components/admin-sidebar';
import { AdminNavbar } from '../components/admin-navbar';

export const metadata: Metadata = {
  title: 'Admin Panel',
};

export default async function AdminMainLayout({ children }: { children: React.ReactNode }) {
  const token = getAdminToken();
  if (!token) redirect('/admin/login');

  const meResponse = await fetch(`${apiBaseUrl}/auth/me`, {
    headers: { authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (!meResponse.ok) redirect('/admin/login');
  const user = await meResponse.json() as { isAdmin: boolean; name?: string | null; email: string };

  if (!user.isAdmin) redirect('/dashboard');

  const twofaToken = getAdmin2faToken();
  if (!twofaToken) {
    redirect('/admin/login');
  }

  const twofaResponse = await fetch(`${apiBaseUrl}/auth/me`, {
    headers: { authorization: `Bearer ${twofaToken}` },
    cache: 'no-store',
  });

  if (!twofaResponse.ok) {
    redirect('/admin/login');
  }

  return (
    <div className="min-h-screen bg-background pt-16">
      <AdminNavbar user={{ email: user.email, name: user.name }} />
      <div className="flex min-h-[calc(100vh-4rem)]">
        <AdminSidebar />
        <main className="flex-1 min-w-0 px-6 py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
