import { getAdminToken } from '@/lib/admin-auth';
import { apiBaseUrl } from '@/lib/utils';
import { AdminTiersClient } from './tiers-client';

async function getTiersData() {
  const token = getAdminToken();
  if (!token) return null;
  try {
    const res = await fetch(`${apiBaseUrl}/plans?includeInactive=true`, {
      headers: { authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function AdminTiersPage() {
  const tiers = await getTiersData();
  if (!tiers) {
    return <div className="text-muted-foreground">Unable to load tiers.</div>;
  }
  return <AdminTiersClient initialTiers={tiers} />;
}
