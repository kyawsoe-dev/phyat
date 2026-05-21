import { getAdminToken } from '@/lib/admin-auth';
import { apiBaseUrl } from '@/lib/utils';
import { AdminUpgradeRequestsClient } from './upgrade-requests-client';

async function getRequestsData(page = 1, status?: string) {
  const token = getAdminToken();
  if (!token) return null;

  const params = new URLSearchParams({ page: String(page), limit: '20' });
  if (status) params.set('status', status);

  try {
    const res = await fetch(`${apiBaseUrl}/admin/upgrade-requests?${params}`, {
      headers: { authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function AdminUpgradeRequestsPage({
  searchParams,
}: {
  searchParams: Record<string, string>;
}) {
  const page = Number(searchParams.page) || 1;
  const status = searchParams.status;
  const data = await getRequestsData(page, status);

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Unable to load upgrade requests.
      </div>
    );
  }

  return <AdminUpgradeRequestsClient initialData={data} />;
}
