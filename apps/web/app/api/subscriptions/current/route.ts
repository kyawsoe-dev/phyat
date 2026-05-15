import { NextResponse } from 'next/server';
import { authHeaders } from '@/lib/auth';
import { apiBaseUrl } from '@/lib/utils';

export async function GET() {
  const response = await fetch(`${apiBaseUrl}/subscriptions/current`, {
    headers: authHeaders(),
    cache: 'no-store',
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  return NextResponse.json(data, { status: response.status });
}
