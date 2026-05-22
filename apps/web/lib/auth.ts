import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { apiBaseUrl } from './utils';
import { encrypt, decrypt } from './crypto';

const cookieName = 'phyat_token';

export type User = {
  id: string;
  email: string;
  name?: string | null;
  tier: {
    code: 'FREE' | 'PRO' | 'DEVELOPER';
    name: string;
    maxLinks: number | null;
    maxLinksPerMonth?: number | null;
    maxQrCodesPerMonth?: number | null;
    maxCustomDomains?: number | null;
    maxApiKeys?: number | null;
    customDomains?: boolean;
    apiAccess?: boolean;
    webhooks?: boolean;
    advancedAnalytics?: boolean;
    bulkImport?: boolean;
    exportData?: boolean;
  };
};

export function getToken() {
  const value = cookies().get(cookieName)?.value;
  return value ? decrypt(value) : undefined;
}

export async function getCurrentUser(): Promise<User | null> {
  const token = getToken();
  if (!token) return null;
  try {
    const response = await fetch(`${apiBaseUrl}/auth/me`, {
      headers: { authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

export function setToken(token: string) {
  cookies().set(cookieName, encrypt(token), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearToken() {
  cookies().delete(cookieName);
}

export async function requireUser() {
  const token = getToken();
  if (!token) redirect('/sign-in');

  const response = await fetch(`${apiBaseUrl}/auth/me`, {
    headers: { authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (!response.ok) {
    redirect('/sign-in');
  }

  return response.json() as Promise<{
    id: string;
    email: string;
    name?: string | null;
    isAdmin: boolean;
    createdAt: string;
    tier: User['tier'];
  }>;
}

export function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { authorization: `Bearer ${token}` } : {};
}
