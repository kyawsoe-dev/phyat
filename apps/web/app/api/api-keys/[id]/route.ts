import { NextRequest, NextResponse } from 'next/server';
import { authHeaders } from '@/lib/auth';
import { apiBaseUrl } from '@/lib/utils';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const response = await fetch(`${apiBaseUrl}/api-keys/${params.id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
