import { NextRequest, NextResponse } from 'next/server';
import { authHeaders } from '@/lib/auth';
import { apiBaseUrl } from '@/lib/utils';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const response = await fetch(`${apiBaseUrl}/links/${params.id}`, {
    method: 'PUT',
    headers: { ...authHeaders(), 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const response = await fetch(`${apiBaseUrl}/links/${params.id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}