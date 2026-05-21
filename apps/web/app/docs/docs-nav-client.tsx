'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { DocsSidebar } from './docs-sidebar';

export function DocsNavClient({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-foreground hover:bg-muted md:hidden"
              aria-label={open ? 'Close documentation menu' : 'Open documentation menu'}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
            <Logo href="/" className="flex-col" showText={false} />
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/"><ArrowLeft size={16} className="mr-1" /> Back to Home</Link>
          </Button>
        </nav>
      </header>

      <div className="mx-auto flex max-w-6xl px-6">
        <DocsSidebar open={open} onToggle={() => setOpen((v) => !v)} onClose={() => setOpen(false)} />
        {children}
      </div>
    </>
  );
}
