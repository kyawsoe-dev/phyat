import { NextRequest, NextResponse } from 'next/server';
import { apiBaseUrl } from '@/lib/utils';

export async function POST(request: NextRequest) {
  const authorization = request.headers.get('authorization');
  const body = await request.json().catch(() => null);

  const response = await fetch(`${apiBaseUrl}/api/v1/shorten`, {
    method: 'POST',
    headers: {
      ...(authorization ? { authorization } : {}),
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({ message: 'Unable to shorten link.' }));
  return NextResponse.json(data, { status: response.status });
}
