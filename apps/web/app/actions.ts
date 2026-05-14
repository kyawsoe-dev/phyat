'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { apiBaseUrl } from '@/lib/utils';

const cookieName = 'phyat_token';

export async function createLink(formData: FormData) {
  const token = cookies().get(cookieName)?.value;
  if (!token) throw new Error('You must be signed in to create links.');

  const destination = formData.get('destination');
  if (!destination || typeof destination !== 'string' || !destination.trim()) {
    throw new Error('A valid destination URL is required.');
  }

  const payload: Record<string, string | undefined> = {
    destination: destination.trim(),
    title: (formData.get('title') as string) || undefined,
    customAlias: (formData.get('customAlias') as string) || undefined,
    expiresAt: (formData.get('expiresAt') as string) || undefined,
    password: (formData.get('password') as string) || undefined,
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

  revalidatePath('/');
  revalidatePath('/dashboard');
  return { success: true };
}
