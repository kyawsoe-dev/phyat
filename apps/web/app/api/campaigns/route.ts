import { NextRequest, NextResponse } from 'next/server';
import { authHeaders } from '@/lib/auth';
import { apiBaseUrl } from '@/lib/utils';

export async function GET() {
  const response = await fetch(`${apiBaseUrl}/campaigns`, { headers: authHeaders() });
  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const response = await fetch(`${apiBaseUrl}/campaigns`, {
    method: 'POST',
    headers: { ...authHeaders(), 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
