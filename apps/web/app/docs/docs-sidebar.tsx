'use client';

import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';

const sections = [
  { id: 'introduction', label: 'Introduction' },
  { id: 'authentication', label: 'Authentication' },
  { id: 'shorten-api', label: 'Shorten API' },
  { id: 'webhooks', label: 'Webhooks' },
  { id: 'qr-codes', label: 'QR Codes' },
  { id: 'rate-limits', label: 'Rate Limits' },
  { id: 'examples', label: 'Code Examples' },
];

export function DocsSidebar({ open, onToggle, onClose }: { open: boolean; onToggle: () => void; onClose: () => void }) {
  const [active, setActive] = useState('introduction');

  useEffect(() => {
    const elements = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => Boolean(el));

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) {
          setActive(visible.target.id);
        }
      },
      { rootMargin: '-80px 0px -55% 0px', threshold: [0.1, 0.25, 0.5] },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const sidebarContent = (
    <nav className="space-y-1">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">On this page</p>
      {sections.map(({ id, label }) => (
        <a
          key={id}
          href={`#${id}`}
          onClick={onClose}
          className={`block rounded-md px-3 py-1.5 text-sm transition-colors ${
            active === id
              ? 'bg-primary/10 font-medium text-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          {label}
        </a>
      ))}
      <div className="mt-6 pt-4 border-t border-border">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resources</p>
        <a href="/dashboard/settings" onClick={onClose} className="block rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          API Keys
        </a>

      </div>
    </nav>
  );

  return (
    <>
      <aside className="hidden w-56 shrink-0 py-10 md:block">
        <div className="sticky top-24">
          {sidebarContent}
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-20 md:hidden">
          <button className="absolute inset-0 bg-black/40" type="button" aria-label="Close" onClick={onClose} />
          <aside className="absolute left-0 top-0 flex h-dvh w-[min(80vw,300px)] flex-col border-r border-border bg-card shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between p-5 pb-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Documentation</p>
              <button type="button" className="rounded-md border border-border p-1.5" aria-label="Close" onClick={onClose}>
                <X size={16} />
              </button>
            </div>
            <div className="p-5 pt-4">
              {sidebarContent}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
