'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { apiBaseUrl } from '@/lib/utils';
import { decrypt } from '@/lib/crypto';

const cookieName = 'phyat_token';

function shortUrlForHost(shortHost: string, slug: string) {
  const protocol = shortHost.startsWith('localhost') || shortHost.startsWith('127.0.0.1') ? 'http' : 'https';
  return `${protocol}://${shortHost}/${slug}`;
}

export async function createLink(formData: FormData) {
  const raw = cookies().get(cookieName)?.value;
  const token = raw ? decrypt(raw) : undefined;
  if (!token) throw new Error('You must be signed in to create links.');

  const destination = formData.get('destination');
  if (!destination || typeof destination !== 'string' || !destination.trim()) {
    throw new Error('A valid destination URL is required.');
  }

  const payload: Record<string, string | boolean | undefined> = {
    destination: destination.trim(),
    title: (formData.get('title') as string) || undefined,
    customAlias: (formData.get('customAlias') as string) || undefined,
    expiresAt: (formData.get('expiresAt') as string) || undefined,
    password: (formData.get('password') as string) || undefined,
    generateQR: true,
  };

  const response = await fetch(`${apiBaseUrl}/links`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let message = 'Unable to create link.';
    try {
      const body = JSON.parse(await response.text());
      if (body.message && Array.isArray(body.message)) {
        message = body.message[0];
      } else if (typeof body.message === 'string') {
        message = body.message;
      }
    } catch {}
    return { error: message };
  }

  const link = await response.json();
  revalidatePath('/');
  revalidatePath('/dashboard');
  return {
    success: true,
    link: {
      id: link.id,
      slug: link.slug,
      shortHost: link.shortHost,
      shortUrl: shortUrlForHost(link.shortHost, link.slug),
      destination: link.destination,
      title: link.title ?? null,
      qrCodeDataUrl: link.qrCodeDataUrl ?? null,
    },
  };
}
