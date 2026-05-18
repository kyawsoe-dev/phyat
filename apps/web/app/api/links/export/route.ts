import { authHeaders } from '@/lib/auth';
import { apiBaseUrl } from '@/lib/utils';

export async function GET() {
  return fetch(`${apiBaseUrl}/links/export`, { headers: authHeaders(), cache: 'no-store' });
}
