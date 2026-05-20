import { NextRequest, NextResponse } from 'next/server';
import { authHeaders } from '@/lib/auth';
import { apiBaseUrl } from '@/lib/utils';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const authorization = request.headers.get('authorization');
  const headers = authorization ? { authorization } : authHeaders();
  const response = await fetch(`${apiBaseUrl}/webhooks/${params.id}/test`, { method: 'POST', headers });
  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
