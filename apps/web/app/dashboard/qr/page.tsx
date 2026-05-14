import { requireUser, authHeaders } from '@/lib/auth';
import { apiBaseUrl } from '@/lib/utils';
import { QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QRCardClient } from './qr-card-client';

type LinkWithQR = {
  slug: string;
  title: string | null;
  destination: string;
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

export default async function QRPage() {
  await requireUser();
  const links = await getLinksWithQR();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  if (links.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <QrCode size={64} className="text-muted-foreground" />
        <h2 className="text-xl font-semibold">No QR codes yet</h2>
        <p className="text-muted-foreground">QR codes are generated automatically when you create a short link.</p>
        <Button asChild><a href="/dashboard">Create a link</a></Button>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {links.map((link) => (
        <QRCardClient key={link.slug} link={link} appUrl={appUrl} />
      ))}
    </div>
  );
}
