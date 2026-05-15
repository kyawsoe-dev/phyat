import { NextRequest, NextResponse } from 'next/server';
import { authHeaders } from '@/lib/auth';
import { apiBaseUrl } from '@/lib/utils';

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  const response = await fetch(`${apiBaseUrl}/domains/${params.id}/verify`, {
    method: 'POST',
    headers: authHeaders(),
  });
  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
