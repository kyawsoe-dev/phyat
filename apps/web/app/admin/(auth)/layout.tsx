import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getAdminToken, getAdmin2faToken } from '@/lib/admin-auth';

export const metadata: Metadata = {
  title: 'Admin Authentication',
};

export default function AdminAuthLayout({ children }: { children: React.ReactNode }) {
  const token = getAdminToken();
  const twofaToken = getAdmin2faToken();

  if (token && twofaToken) {
    redirect('/admin');
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-12">
      {children}
    </div>
  );
}
