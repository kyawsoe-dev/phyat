import { getAdminToken } from '@/lib/admin-auth';
import { apiBaseUrl } from '@/lib/utils';
import { AdminAnalyticsClient } from './analytics-client';

async function getAnalyticsData(days = 30) {
  const token = getAdminToken();
  if (!token) return null;

  try {
    const res = await fetch(`${apiBaseUrl}/admin/analytics?days=${days}`, {
      headers: { authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function AdminAnalyticsPage() {
  const data = await getAnalyticsData();

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Unable to load analytics data.
      </div>
    );
  }

  return <AdminAnalyticsClient initialData={data} />;
}
