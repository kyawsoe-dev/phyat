'use client';

import { Download, Copy, ExternalLink, Check } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

type LinkQR = {
  slug: string;
  title: string | null;
  destination: string;
  qrCodeDataUrl: string | null;
};

export function QRCardClient({ link, appUrl }: { link: LinkQR; appUrl: string }) {
  const [copied, setCopied] = useState(false);

  async function copyDataUrl() {
    if (!link.qrCodeDataUrl) return;
    try {
      await navigator.clipboard.writeText(link.qrCodeDataUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  }

  return (
    <div className="rounded-md border border-border bg-white p-4 shadow-sm">
      {link.qrCodeDataUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={link.qrCodeDataUrl} alt={`QR for ${link.slug}`} className="mx-auto w-48 h-48" />
      )}
      <div className="mt-4 space-y-1 text-sm">
        <p className="font-medium truncate">{link.title || link.slug}</p>
        <p className="truncate text-muted-foreground">{appUrl}/{link.slug}</p>
      </div>
      <div className="mt-4 flex gap-2">
        <a href={link.qrCodeDataUrl ?? '#'} download={`${link.slug}-qr.png`} className="flex-1">
          <Button variant="secondary" className="w-full" size="sm">
            <Download size={14} /> Download
          </Button>
        </a>
        <Button variant="ghost" size="sm" onClick={copyDataUrl}>
          {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
        </Button>
        <Button asChild variant="ghost" size="sm">
          <a href={`/${link.slug}`} target="_blank" rel="noreferrer"><ExternalLink size={14} /></a>
        </Button>
      </div>
    </div>
  );
}
