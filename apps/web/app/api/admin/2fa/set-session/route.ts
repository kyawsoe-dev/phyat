import { NextRequest, NextResponse } from 'next/server';
import { encrypt } from '@/lib/crypto';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { twofaToken } = body;

  if (!twofaToken) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set('phyat_admin_2fa', encrypt(twofaToken), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/admin',
    maxAge: 60 * 60 * 24,
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('phyat_admin_2fa');
  return response;
}
