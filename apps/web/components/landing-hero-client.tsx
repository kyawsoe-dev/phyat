'use client';

import { Sparkles, Link2, LockKeyhole, Clock3, QrCode, Menu, X, AlertCircle, ChevronDown, Settings, CreditCard, LogOut, LayoutDashboard } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/theme-toggle';
import { Logo } from '@/components/logo';
import { cn } from '@/lib/utils';
import { createLink } from '@/app/actions';
import type { User } from '@/lib/auth';

function getInitials(user: User) {
  if (user.name) {
    return user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  }
  return user.email[0].toUpperCase();
}

function tierBadgeColor(code: string) {
  switch (code) {
    case 'PRO': return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700';
    case 'DEVELOPER': return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700';
    default: return 'bg-muted text-muted-foreground border-border';
  }
}

export function LandingHeroClient({ user }: { user?: User | null }) {
  const [open, setOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const form = e.currentTarget;
    const data = new FormData(form);
    const result = await createLink(data);
    if (result.error) {
      setError(result.error);
    } else {
      setSuccess('Link created! Redirecting...');
      form.reset();
      setTimeout(() => setSuccess(''), 3000);
    }
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const sections = document.querySelectorAll('section[id]');
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: '-40% 0px -55% 0px' },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-20 border-b border-border bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:bg-gray-950/95 dark:supports-[backdrop-filter]:bg-gray-950/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          {/* Left side */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-foreground hover:bg-muted lg:hidden"
              aria-label="Open navigation menu"
              onClick={() => setOpen(true)}
            >
              <Menu size={18} />
            </button>
            <Logo href="/" className="flex-col" showText={false} onClick={() => setOpen(false)} />
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {/* Desktop nav links */}
            <div className="hidden lg:flex items-center gap-6 text-sm font-medium text-foreground">
              <a href="#platform" className={cn('transition-colors', activeSection === 'platform' ? 'text-primary' : 'hover:text-primary')}>Platform</a>
              <a href="#solutions" className={cn('transition-colors', activeSection === 'solutions' ? 'text-primary' : 'hover:text-primary')}>Solutions</a>
              <a href="#plans" className={cn('transition-colors', activeSection === 'plans' ? 'text-primary' : 'hover:text-primary')}>Plans</a>
            </div>

            <ThemeToggle />

            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  className="flex items-center gap-2.5 rounded-md px-3 py-1.5 hover:bg-muted transition-colors"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {getInitials(user)}
                  </div>
                  <div className="hidden text-left sm:block leading-none">
                    <p className="text-sm font-medium">{user.name || user.email}</p>
                    <span className={cn('mt-1 inline-block rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none', tierBadgeColor(user.tier.code))}>
                      {user.tier.name}
                    </span>
                  </div>
                  <ChevronDown size={14} className={cn('text-muted-foreground transition-transform shrink-0', dropdownOpen && 'rotate-180')} />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-56 rounded-md border border-border bg-white shadow-lg z-50 py-1 dark:bg-gray-950">
                    <div className="border-b border-border px-4 py-3">
                      <p className="text-sm font-medium">{user.name || 'User'}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                      <span className={cn('mt-1.5 inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase leading-none', tierBadgeColor(user.tier.code))}>
                        {user.tier.name}
                      </span>
                    </div>
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <LayoutDashboard size={15} /> Dashboard
                    </Link>
                    <Link
                      href="/dashboard/settings"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <Settings size={15} /> Settings
                    </Link>
                    <Link
                      href="/dashboard/plans"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <CreditCard size={15} /> Plans
                    </Link>
                    <hr className="border-border my-1" />
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-muted transition-colors"
                      onClick={() => {
                        fetch('/api/auth/signout', { method: 'POST' }).finally(() => {
                          window.location.href = '/';
                        });
                      }}
                    >
                      <LogOut size={15} /> Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button asChild className="hidden sm:inline-flex" variant="ghost">
                  <Link href="/sign-in">Sign in</Link>
                </Button>
                <Button asChild className="hidden px-3 sm:inline-flex sm:px-4">
                  <Link href="/sign-up">Start free</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button className="absolute inset-0 bg-black/40" type="button" aria-label="Close navigation menu" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-dvh w-[min(84vw,340px)] flex-col border-r border-border bg-white p-5 shadow-2xl dark:bg-gray-950">
            <div className="flex items-center justify-between">
              <Logo href="/" className="flex-col" showText={false} onClick={() => setOpen(false)} />
              <button className="rounded-md border border-border p-2" type="button" aria-label="Close navigation menu" onClick={() => setOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 flex-1 space-y-2 overflow-y-auto">
              {user && (
                <>
                  <div className="flex items-center gap-3 px-3 py-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                      {getInitials(user)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{user.name ?? user.email}</p>
                      <p className="text-xs text-muted-foreground">{user.tier.name} plan</p>
                    </div>
                  </div>
                  <hr className="border-border" />
                </>
              )}

              <nav className="space-y-0.5 pt-2">
                <a href="#platform" className="block rounded-md px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" onClick={() => setOpen(false)}>Platform</a>
                <a href="#solutions" className="block rounded-md px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" onClick={() => setOpen(false)}>Solutions</a>
                <a href="#plans" className="block rounded-md px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" onClick={() => setOpen(false)}>Plans</a>
              </nav>
            </div>

            <div className="pt-4 border-t border-border">
              {user ? (
                <div className="grid gap-2">
                  <Button asChild variant="secondary" className="w-full"><Link href="/dashboard" onClick={() => setOpen(false)}>Dashboard</Link></Button>
                  <button
                    type="button"
                    className="flex w-full items-center justify-center gap-2 rounded-md px-4 py-2 text-sm text-red-600 hover:bg-muted transition-colors"
                    onClick={() => {
                      fetch('/api/auth/signout', { method: 'POST' }).finally(() => {
                        window.location.href = '/';
                      });
                    }}
                  >
                    <LogOut size={15} /> Sign out
                  </button>
                </div>
              ) : (
                <div className="grid gap-2">
                  <Button asChild variant="secondary" className="w-full"><Link href="/sign-in" onClick={() => setOpen(false)}>Sign in</Link></Button>
                  <Button asChild className="w-full"><Link href="/sign-up" onClick={() => setOpen(false)}>Start free</Link></Button>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      <div className="relative overflow-hidden border-b border-border bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.16),transparent_32%),linear-gradient(180deg,hsl(var(--card)),transparent)]">
        <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(hsl(166_74%_70%)_1px,transparent_1px)] [background-size:42px_42px]" />
        <section className="mx-auto max-w-6xl px-6 pt-24 pb-16">
          <div className="text-center">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-[hsl(var(--card))] px-3 py-1 text-sm font-medium text-muted-foreground shadow-sm">
            <Sparkles size={15} className="text-primary" /> Link management for Myanmar builders
          </div>
          <h1 className="mx-auto max-w-4xl text-5xl font-bold tracking-normal text-foreground md:text-6xl">
            Transform your long links into powerful Phyat URLs
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
            Shorten, customize, protect, and track links with a clean dashboard and developer-ready API.
          </p>

          <div className="mx-auto mt-9 rounded-md border border-border bg-[hsl(var(--card))] p-5 text-left shadow-xl">
            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
                <AlertCircle size={16} className="shrink-0" />
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                {success}
              </div>
            )}
            <form onSubmit={user ? handleSubmit : undefined} className="space-y-4">
              <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                <Input
                  name="destination"
                  placeholder="Paste your URL here... e.g. https://mysite.com/very-long-page"
                  type="url"
                  required={!!user}
                />
                {user ? (
                  <Button type="submit" className="h-10 px-8">
                    <Sparkles size={16} /> Shorten URL
                  </Button>
                ) : (
                  <Button asChild className="h-10 px-8">
                    <Link href="/sign-in"><Sparkles size={16} /> Shorten URL</Link>
                  </Button>
                )}
              </div>
              {user && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Input name="title" placeholder="Campaign title" />
                  <Input name="customAlias" placeholder="Custom back-half" pattern="[a-zA-Z0-9_-]{3,48}" />
                  <Input name="expiresAt" type="datetime-local" />
                  <Input name="password" placeholder="Optional password" type="password" minLength={6} />
                </div>
              )}
            </form>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                [Link2, 'Custom Link'],
                [LockKeyhole, 'Password Protection'],
                [Clock3, 'Set Expiration'],
                [QrCode, 'Generate QR Code'],
              ].map(([Icon, label]) => (
                <div key={label as string} className="flex min-h-24 items-center justify-center gap-3 rounded-md border border-border bg-[hsl(var(--card))] px-3 text-sm font-semibold">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-primary">
                    <Icon size={18} />
                  </span>
                  {label as string}
                </div>
              ))}
            </div>
          </div>

          <p className="mt-8 text-sm font-medium text-muted-foreground">
            No credit card. 30-second setup. Secure by default.
          </p>
          <div className="mx-auto mt-8 grid grid-cols-2 gap-6 md:grid-cols-4">
            {([['10M+', 'Links shortened'], ['50K+', 'Active users'], ['99.9%', 'Uptime'], ['24/7', 'Support']] as const).map(([value, label]) => (
              <div key={label}>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-sm text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      </div>
    </>
  );
}
