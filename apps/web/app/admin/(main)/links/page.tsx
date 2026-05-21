import { getAdminToken } from '@/lib/admin-auth';
import { apiBaseUrl } from '@/lib/utils';

async function getAllLinks() {
  // Placeholder: in real would need backend admin/links endpoint. For now empty.
  return { links: [], total: 0 };
}

export default async function AdminLinksPage() {
  const data = await getAllLinks();
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Links</h1>
      <p className="text-muted-foreground mb-6">Global link management / moderation (placeholder)</p>
      <div className="p-8 border rounded text-center text-muted-foreground">
        No admin links endpoint implemented in backend yet. {data.total} links.
        <div className="mt-4 text-xs">You can add GET /admin/links in backend if needed for full moderation.</div>
      </div>
    </div>
  );
}
