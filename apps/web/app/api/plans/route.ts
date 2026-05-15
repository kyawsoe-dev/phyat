import { NextResponse } from 'next/server';
import { apiBaseUrl } from '@/lib/utils';

export async function GET() {
  const response = await fetch(`${apiBaseUrl}/plans`, { cache: 'no-store' });
  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
