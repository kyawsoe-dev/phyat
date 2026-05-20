import { NextRequest, NextResponse } from 'next/server';
import { authHeaders } from '@/lib/auth';
import { apiBaseUrl } from '@/lib/utils';

function headers(request: NextRequest) {
  const authorization = request.headers.get('authorization');
  const phApiKey = request.headers.get('ph-api-key');
  if (authorization) return { authorization };
  if (phApiKey) return { 'ph-api-key': phApiKey };
  return authHeaders();
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json();
  const response = await fetch(`${apiBaseUrl}/webhooks/${params.id}`, { method: 'PUT', headers: { ...headers(request), 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const response = await fetch(`${apiBaseUrl}/webhooks/${params.id}`, { method: 'DELETE', headers: headers(request) });
  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
