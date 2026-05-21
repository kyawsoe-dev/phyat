import { getAdminToken } from '@/lib/admin-auth';
import { apiBaseUrl } from '@/lib/utils';
import { AdminDashboardClient } from './admin-dashboard-client';

async function getDashboardData() {
  const token = getAdminToken();
  if (!token) return null;

  try {
    const [dashboardRes, healthRes] = await Promise.all([
      fetch(`${apiBaseUrl}/admin/dashboard`, {
        headers: { authorization: `Bearer ${token}` },
        cache: 'no-store',
      }),
      fetch(`${apiBaseUrl}/admin/health`, {
        headers: { authorization: `Bearer ${token}` },
        cache: 'no-store',
      }),
    ]);

    if (!dashboardRes.ok || !healthRes.ok) return null;

    const [dashboard, health] = await Promise.all([
      dashboardRes.json(),
      healthRes.json(),
    ]);

    return { dashboard, health };
  } catch {
    return null;
  }
}

export default async function AdminDashboardPage() {
  const data = await getDashboardData();

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Unable to load dashboard data.
      </div>
    );
  }

  return <AdminDashboardClient data={data.dashboard} health={data.health} />;
}
