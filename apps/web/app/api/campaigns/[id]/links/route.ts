import { NextRequest, NextResponse } from 'next/server';
import { authHeaders } from '@/lib/auth';
import { apiBaseUrl } from '@/lib/utils';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const response = await fetch(`${apiBaseUrl}/campaigns/${params.id}/links`, { headers: authHeaders() });
  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
