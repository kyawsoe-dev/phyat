import { NextResponse } from 'next/server';
import { authHeaders } from '@/lib/auth';
import { apiBaseUrl } from '@/lib/utils';

export async function GET() {
  const response = await fetch(`${apiBaseUrl}/usage/current`, { headers: authHeaders(), cache: 'no-store' });
  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
