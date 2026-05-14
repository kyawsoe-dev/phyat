'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, X, Settings, LogOut, ChevronDown, CreditCard, LayoutDashboard, Link2, QrCode, Megaphone, Globe2, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';

type NavUser = {
  email: string;
  name?: string | null;
  tier: { code: string; name: string; maxLinks: number | null };
};

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/links', label: 'Links', icon: Link2 },
  { href: '/dashboard/qr', label: 'QR Codes', icon: QrCode },
  { href: '/dashboard/campaigns', label: 'Campaigns', icon: Megaphone },
  { href: '/dashboard/domains', label: 'Domains', icon: Globe2 },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/plans', label: 'Plans', icon: CreditCard },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

function getInitials(user: NavUser) {
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

export function DashboardNavbar({ user }: { user: NavUser }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();

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
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  function signOut() {
    fetch('/api/auth/signout', { method: 'POST' }).finally(() => {
      router.push('/sign-in');
    });
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 border-b border-border bg-[hsl(var(--card)/0.95)] backdrop-blur">
        <div className="flex h-16">
          {/* Logo section - matches sidebar width on desktop */}
          <div className="hidden lg:flex lg:w-60 items-center border-r border-border px-4 shrink-0">
            <Logo href="/dashboard" className="flex-col" showText={false} textClassName="text-xl font-black tracking-tight" />
          </div>

          {/* Content section */}
          <div className="flex flex-1 items-center justify-between px-4 sm:px-6">
            {/* Left side */}
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline text-sm font-semibold text-foreground">Dashboard</span>
              <div className="flex items-center gap-3 lg:hidden">
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-foreground hover:bg-muted"
                  aria-label="Toggle navigation menu"
                  onClick={() => setMobileOpen(true)}
                >
                  <Menu size={18} />
                </button>
                <Logo href="/dashboard" className="flex-col" showText={false} />
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2 ml-auto">
              <ThemeToggle />
              {/* User */}
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
                <div className="absolute right-0 top-full mt-1.5 w-56 rounded-md border border-border bg-[hsl(var(--card))] shadow-lg z-50 py-1">
                  <div className="border-b border-border px-4 py-3">
                    <p className="text-sm font-medium">{user.name || 'User'}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                    <span className={cn('mt-1.5 inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase leading-none', tierBadgeColor(user.tier.code))}>
                      {user.tier.name}
                    </span>
                  </div>
                  <a
                    href="/dashboard/settings"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <Settings size={15} /> Settings
                  </a>
                  <a
                    href="/dashboard/plans"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <CreditCard size={15} /> Plans
                  </a>
                  <hr className="border-border my-1" />
                  <Link
                    href="/"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <Globe2 size={15} /> Back to Landing Page
                  </Link>
                  <hr className="border-border my-1" />
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-muted transition-colors"
                    onClick={signOut}
                  >
                    <LogOut size={15} /> Sign out
                  </button>
                </div>
              )}
            </div>
            </div>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-dvh w-[min(84vw,340px)] flex-col border-r border-border bg-[hsl(var(--card))] p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <Logo href="/dashboard" className="flex-col" showText={false} />
              <button
                className="rounded-md border border-border p-2"
                type="button"
                aria-label="Close navigation menu"
                onClick={() => setMobileOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 space-y-2 flex-1 overflow-y-auto">
              <div className="flex items-center gap-3 px-3 py-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {getInitials(user)}
                </div>
                <div>
                  <p className="text-sm font-medium">{user.name || user.email}</p>
                  <p className="text-xs text-muted-foreground">{user.tier.name} plan</p>
                </div>
              </div>
              <hr className="border-border" />
              <nav className="space-y-0.5 pt-2">
                {navItems.map(({ href, label, icon: Icon }) => {
                  const isActive = pathname === href;
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                    >
                      <Icon size={18} />
                      {label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="mt-auto pt-4 border-t border-border">
              <Button variant="secondary" className="w-full" onClick={signOut}>
                Sign out
              </Button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
