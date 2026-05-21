'use client';

import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ThemeToggle } from './theme-toggle';
import { Logo } from './logo';
import type { User } from '@/lib/auth';

const navLinks = [
  { href: '#home', label: 'Home' },
  { href: '#platform', label: 'Platform' },
  { href: '#solutions', label: 'Solutions' },
  { href: '#plans', label: 'Plans' },
];

function getInitials(user: User) {
  if (user.name) {
    return user.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  return user.email[0].toUpperCase();
}

export function LandingNav({ user }: { user?: User | null }) {
  const [active, setActive] = useState('top');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const sections = navLinks
      .filter((l) => l.href !== '#home')
      .map((link) => document.querySelector(link.href))
      .filter((section): section is Element => Boolean(section));

    const handleScroll = () => {
      if (window.scrollY < 100) {
        setActive('top');
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible?.target.id) {
          setActive(visible.target.id);
        }
      },
      { rootMargin: '-18% 0px -55% 0px', threshold: [0.1, 0.25, 0.5] },
    );

    sections.forEach((section) => observer.observe(section));
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-[hsl(var(--card)/0.9)] backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Logo href="/" className="flex-col" showText={false} onClick={() => setActive('top')} />

        <div className="hidden items-center gap-2 rounded-md border border-border bg-muted/40 p-1 text-sm font-medium lg:flex">
          {navLinks.map((link) => {
            const isActive = link.href === '#home'
              ? active === 'top'
              : active === link.href.slice(1);
            return (
              <a
                key={link.href}
                href={link.href}
                onClick={link.href === '#home' ? () => { window.scrollTo({ top: 0, behavior: 'smooth' }); setActive('top'); } : undefined}
                className={cn(
                  'rounded-sm px-3 py-2 text-muted-foreground hover:bg-card hover:text-foreground',
                  isActive && 'bg-card text-primary shadow-sm',
                )}
              >
                {link.label}
              </a>
            );
          })}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          {user ? (
            <>
              <Button asChild className="hidden sm:inline-flex">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
              <Link
                href="/sign-in"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground"
                title={user.name ?? user.email}
              >
                {getInitials(user)}
              </Link>
            </>
          ) : (
            <>
              <Button asChild className="hidden sm:inline-flex" variant="ghost">
                <Link href="/sign-in">Sign in</Link>
              </Button>
              <Button asChild className="hidden px-3 sm:inline-flex sm:px-4">
                <Link href="/sign-up">Start free</Link>
              </Button>
            </>
          )}
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-card text-foreground lg:hidden"
            aria-label="Open navigation menu"
            onClick={() => setOpen(true)}
          >
            <Menu size={20} />
          </button>
        </div>
      </nav>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button className="absolute inset-0 bg-black/40" type="button" aria-label="Close navigation menu" onClick={() => setOpen(false)} />
            <aside className="absolute right-0 top-0 flex h-dvh w-[min(84vw,340px)] flex-col border-l border-border bg-card p-5 shadow-2xl">
              <div className="flex items-center justify-between">
                <Logo className="flex-col" showText={false} />
              <button className="rounded-md border border-border p-2" type="button" aria-label="Close navigation menu" onClick={() => setOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="mt-8 space-y-2">
              {navLinks.map((link) => {
                const isActive = link.href === '#home'
                  ? active === 'top'
                  : active === link.href.slice(1);
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={(e) => {
                      if (link.href === '#home') {
                        e.preventDefault();
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                        setActive('top');
                      }
                      setOpen(false);
                    }}
                    className={cn(
                      'block rounded-md px-4 py-3 text-base font-semibold text-muted-foreground hover:bg-muted hover:text-foreground',
                      isActive && 'bg-muted text-primary',
                    )}
                  >
                    {link.label}
                  </a>
                );
              })}
            </div>

            <div className="mt-auto grid gap-3">
              {user ? (
                <>
                  <div className="px-4 py-2 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">{user.name ?? user.email}</p>
                    <p className="text-xs">{user.tier.name} plan</p>
                  </div>
                  <Button asChild variant="secondary">
                    <Link href="/dashboard">Dashboard</Link>
                  </Button>
                  <Button asChild>
                    <Link href="/sign-in">Sign out</Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild variant="secondary">
                    <Link href="/sign-in">Sign in</Link>
                  </Button>
                  <Button asChild>
                    <Link href="/sign-up">Start free</Link>
                  </Button>
                </>
              )}
            </div>
          </aside>
        </div>
      )}
    </header>
  );
}
