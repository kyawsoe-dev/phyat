import { NextRequest, NextResponse } from 'next/server';
import { apiBaseUrl } from '@/lib/utils';
import { getAdminToken } from '@/lib/admin-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } },
) {
  const token = getAdminToken();
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const path = params.path.join('/');
  const searchParams = request.nextUrl.searchParams.toString();
  const url = `${apiBaseUrl}/admin/${path}${searchParams ? `?${searchParams}` : ''}`;

  const response = await fetch(url, {
    headers: { authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  const data = await response.json().catch(() => null);
  return NextResponse.json(data, { status: response.status });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } },
) {
  const token = getAdminToken();
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const path = params.path.join('/');
  const body = await request.json().catch(() => ({}));
  const url = `${apiBaseUrl}/admin/${path}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const data = await response.json().catch(() => null);
  return NextResponse.json(data, { status: response.status });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string[] } },
) {
  const token = getAdminToken();
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const path = params.path.join('/');
  const body = await request.json().catch(() => ({}));
  const url = `${apiBaseUrl}/admin/${path}`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const data = await response.json().catch(() => null);
  return NextResponse.json(data, { status: response.status });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } },
) {
  const token = getAdminToken();
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const path = params.path.join('/');
  const url = `${apiBaseUrl}/admin/${path}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: { authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  const data = await response.json().catch(() => null);
  return NextResponse.json(data, { status: response.status });
}
