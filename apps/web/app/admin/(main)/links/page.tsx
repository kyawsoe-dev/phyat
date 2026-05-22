import { getAdminToken } from '@/lib/admin-auth';
import { apiBaseUrl } from '@/lib/utils';
import { AdminLinksClient } from './links-client';

async function getAllLinks(page = 1, search?: string) {
  const token = getAdminToken();
  if (!token) return { links: [], total: 0, page: 1, limit: 20, totalPages: 0 };

  const params = new URLSearchParams({ page: String(page), limit: '20' });
  if (search) params.set('search', search);

  try {
    const res = await fetch(`${apiBaseUrl}/admin/links?${params}`, {
      headers: { authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return { links: [], total: 0, page: 1, limit: 20, totalPages: 0 };
    return res.json();
  } catch {
    return { links: [], total: 0, page: 1, limit: 20, totalPages: 0 };
  }
}

export default async function AdminLinksPage({
  searchParams,
}: {
  searchParams: Record<string, string>;
}) {
  const page = Number(searchParams.page) || 1;
  const search = searchParams.search;
  const data = await getAllLinks(page, search);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Links</h1>
        <p className="text-muted-foreground">Global link management &amp; moderation across all users</p>
      </div>

      <AdminLinksClient initialData={data} />
    </div>
  );
}
