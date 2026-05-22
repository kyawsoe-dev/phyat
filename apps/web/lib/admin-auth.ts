import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { encrypt, decrypt } from './crypto';

const adminTokenCookie = 'phyat_admin_token';
const admin2faCookie = 'phyat_admin_2fa';

export function getAdminToken() {
  const value = cookies().get(adminTokenCookie)?.value;
  return value ? decrypt(value) : undefined;
}

export function setAdminToken(token: string) {
  cookies().set(adminTokenCookie, encrypt(token), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearAdminToken() {
  cookies().delete(adminTokenCookie);
}

export function getAdmin2faToken() {
  const value = cookies().get(admin2faCookie)?.value;
  return value ? decrypt(value) : undefined;
}

export function clearAdmin2faToken() {
  cookies().delete(admin2faCookie);
}
