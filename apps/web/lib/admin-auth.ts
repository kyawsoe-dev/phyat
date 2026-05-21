import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const adminTokenCookie = 'phyat_admin_token';
const admin2faCookie = 'phyat_admin_2fa';

export function getAdminToken() {
  return cookies().get(adminTokenCookie)?.value;
}

export function setAdminToken(token: string) {
  cookies().set(adminTokenCookie, token, {
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
  return cookies().get(admin2faCookie)?.value;
}

export function clearAdmin2faToken() {
  cookies().delete(admin2faCookie);
}
