import { getAdminToken } from '@/lib/admin-auth';
import { apiBaseUrl } from '@/lib/utils';
import { AdminSettingsClient } from './settings-client';

async function getAdminMe() {
  const token = getAdminToken();
  if (!token) return null;

  try {
    const res = await fetch(`${apiBaseUrl}/auth/me`, {
      headers: { authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function AdminSettingsPage() {
  const admin = await getAdminMe();

  if (!admin) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Unable to load admin profile.
      </div>
    );
  }

  return <AdminSettingsClient admin={admin} />;
}
