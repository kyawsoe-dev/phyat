import { NextResponse } from 'next/server';
import { apiBaseUrl } from '@/lib/utils';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const includeInactive = searchParams.get('includeInactive');
  const url = `${apiBaseUrl}/plans${includeInactive ? `?includeInactive=${includeInactive}` : ''}`;
  const response = await fetch(url, { cache: 'no-store' });
  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
