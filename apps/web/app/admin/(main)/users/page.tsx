import { getAdminToken } from '@/lib/admin-auth';
import { apiBaseUrl } from '@/lib/utils';
import { AdminUsersClient } from './users-client';

async function getUsersData(page = 1, search?: string, tier?: string) {
  const token = getAdminToken();
  if (!token) return null;

  const params = new URLSearchParams({ page: String(page), limit: '20' });
  if (search) params.set('search', search);
  if (tier) params.set('tier', tier);

  try {
    const res = await fetch(`${apiBaseUrl}/admin/users?${params}`, {
      headers: { authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Record<string, string>;
}) {
  const page = Number(searchParams.page) || 1;
  const search = searchParams.search;
  const tier = searchParams.tier;
  const data = await getUsersData(page, search, tier);

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Unable to load users.
      </div>
    );
  }

  return <AdminUsersClient initialData={data} />;
}
