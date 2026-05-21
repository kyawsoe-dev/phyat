import { getAdminToken } from '@/lib/admin-auth';
import { apiBaseUrl } from '@/lib/utils';
import { AdminInvoicesClient } from './invoices-client';

async function getInvoicesData(page = 1, search?: string, status?: string) {
  const token = getAdminToken();
  if (!token) return null;

  const params = new URLSearchParams({ page: String(page), limit: '20' });
  if (search) params.set('search', search);
  if (status) params.set('status', status);

  try {
    const res = await fetch(`${apiBaseUrl}/admin/invoices?${params}`, {
      headers: { authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function AdminInvoicesPage({
  searchParams,
}: {
  searchParams: Record<string, string>;
}) {
  const page = Number(searchParams.page) || 1;
  const search = searchParams.search;
  const status = searchParams.status;
  const data = await getInvoicesData(page, search, status);

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Unable to load invoices.
      </div>
    );
  }

  return <AdminInvoicesClient initialData={data} />;
}
