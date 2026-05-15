import type { Metadata } from 'next';
import { revalidatePath } from 'next/cache';
import { requireUser, authHeaders } from '@/lib/auth';
import { apiBaseUrl } from '@/lib/utils';
import { QRContent } from './qr-content';

type LinkWithQR = {
  id: string;
  slug: string;
  title: string | null;
  destination: string;
  status: 'ACTIVE' | 'DISABLED';
  clickCount: number;
  createdAt: string;
  expiresAt: string | null;
  passwordHash: string | null;
  qrCodeDataUrl: string | null;
};

async function getLinksWithQR(): Promise<LinkWithQR[]> {
  try {
    const response = await fetch(`${apiBaseUrl}/links`, {
      headers: authHeaders(),
      cache: 'no-store',
    });
    if (!response.ok) return [];
    const data = await response.json() as { data: LinkWithQR[] };
    return (data.data ?? []).filter((l) => l.qrCodeDataUrl);
  } catch {
    return [];
  }
}

async function createQR(formData: FormData) {
  'use server';

  const payload = {
    destination: formData.get('destination'),
    title: formData.get('title') || undefined,
    customAlias: formData.get('customAlias') || undefined,
    expiresAt: formData.get('expiresAt') || undefined,
    password: formData.get('password') || undefined,
    generateQR: formData.get('generateQR') !== 'off',
  };

  const response = await fetch(`${apiBaseUrl}/links`, {
    method: 'POST',
    headers: { ...authHeaders(), 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Unable to create QR code.');
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/qr');
}

async function updateQR(formData: FormData) {
  'use server';

  const response = await fetch(`${apiBaseUrl}/links/${formData.get('id')}`, {
    method: 'PUT',
    headers: { ...authHeaders(), 'content-type': 'application/json' },
    body: JSON.stringify({
      active: formData.get('active') === 'true',
    }),
  });

  if (!response.ok) {
    throw new Error('Unable to update QR code.');
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/qr');
}

async function bulkCreateQR(formData: FormData) {
  'use server';

  const raw = formData.get('entries');
  if (!raw || typeof raw !== 'string') return;

  const entries = raw.split('\n').filter(Boolean).map((line) => {
    const [destination, title, customAlias] = line.split(',').map((s) => s.trim());
    return { destination, title: title || undefined, customAlias: customAlias || undefined, generateQR: true };
  });

  const response = await fetch(`${apiBaseUrl}/links/bulk`, {
    method: 'POST',
    headers: { ...authHeaders(), 'content-type': 'application/json' },
    body: JSON.stringify(entries),
  });

  if (!response.ok) throw new Error('Unable to bulk create.');

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/qr');
}

export const metadata: Metadata = {
  title: 'QR Codes',
};

export default async function QRPage() {
  await requireUser();
  const links = await getLinksWithQR();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  return (
    <QRContent
      links={links}
      appUrl={appUrl}
      createAction={createQR}
      updateAction={updateQR}
      bulkCreateAction={bulkCreateQR}
    />
  );
}
