import { NextResponse } from 'next/server';
import { setToken } from '@/lib/auth';
import { apiBaseUrl } from '@/lib/utils';

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { idToken?: string } | null;

  const response = await fetch(`${apiBaseUrl}/auth/google`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ idToken: body?.idToken }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unable to sign in with Google.' }));
    return NextResponse.json({ message: error.message ?? 'Unable to sign in with Google.' }, { status: response.status });
  }

  const session = await response.json();
  if (session.requires2fa) {
    return NextResponse.json({ requires2fa: true, tempToken: session.accessToken });
  }

  setToken(session.accessToken as string);

  return NextResponse.json({ ok: true });
}
