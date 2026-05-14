import { NextRequest, NextResponse } from 'next/server';
import { authHeaders } from '@/lib/auth';
import { apiBaseUrl } from '@/lib/utils';

export async function GET(request: NextRequest, { params }: { params: { linkId: string } }) {
  const { searchParams } = new URL(request.url);
  const take = searchParams.get('take') ?? '50';

  const response = await fetch(`${apiBaseUrl}/analytics/links/${params.linkId}?take=${take}`, {
    headers: authHeaders(),
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
