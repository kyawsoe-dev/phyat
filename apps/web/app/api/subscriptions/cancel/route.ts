import { NextResponse } from 'next/server';
import { authHeaders } from '@/lib/auth';
import { apiBaseUrl } from '@/lib/utils';

export async function POST() {
  const response = await fetch(`${apiBaseUrl}/subscriptions/cancel`, {
    method: 'POST',
    headers: authHeaders(),
  });
  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
