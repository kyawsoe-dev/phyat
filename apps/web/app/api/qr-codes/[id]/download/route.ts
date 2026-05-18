import { NextRequest } from 'next/server';
import { authHeaders } from '@/lib/auth';
import { apiBaseUrl } from '@/lib/utils';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  return fetch(`${apiBaseUrl}/qr-codes/${params.id}/download`, { headers: authHeaders(), cache: 'no-store' });
}
