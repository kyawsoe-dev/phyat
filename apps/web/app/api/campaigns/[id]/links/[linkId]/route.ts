import { NextRequest, NextResponse } from 'next/server';
import { authHeaders } from '@/lib/auth';
import { apiBaseUrl } from '@/lib/utils';

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string; linkId: string } },
) {
  const response = await fetch(`${apiBaseUrl}/campaigns/${params.id}/links/${params.linkId}`, {
    method: 'POST',
    headers: authHeaders(),
  });
  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; linkId: string } },
) {
  const response = await fetch(`${apiBaseUrl}/campaigns/${params.id}/links/${params.linkId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
