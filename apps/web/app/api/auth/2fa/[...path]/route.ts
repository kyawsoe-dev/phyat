import { NextRequest, NextResponse } from 'next/server';
import { authHeaders } from '@/lib/auth';
import { apiBaseUrl } from '@/lib/utils';

function buildHeaders(request: NextRequest): Record<string, string> {
  const incomingAuth = request.headers.get('authorization');
  if (incomingAuth) {
    return { authorization: incomingAuth, 'content-type': 'application/json' };
  }
  return { ...authHeaders(), 'content-type': 'application/json' };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } },
) {
  const path = params.path.join('/');
  const searchParams = request.nextUrl.searchParams.toString();
  const url = `${apiBaseUrl}/auth/2fa/${path}${searchParams ? `?${searchParams}` : ''}`;

  const response = await fetch(url, {
    headers: buildHeaders(request),
    cache: 'no-store',
  });

  const data = await response.json().catch(() => null);
  return NextResponse.json(data, { status: response.status });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } },
) {
  const path = params.path.join('/');
  const body = await request.json().catch(() => ({}));
  const url = `${apiBaseUrl}/auth/2fa/${path}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: buildHeaders(request),
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const data = await response.json().catch(() => null);
  return NextResponse.json(data, { status: response.status });
}
