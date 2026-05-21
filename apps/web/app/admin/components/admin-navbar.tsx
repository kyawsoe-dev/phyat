'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ChevronDown, LogOut, Settings, Menu, X, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { adminNavItems } from './admin-sidebar';

type AdminUser = {
  email: string;
  name?: string | null;
};

function getInitials(user: AdminUser) {
  if (user.name) {
    return user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  }
  return user.email[0].toUpperCase();
}

export function AdminNavbar({ user }: { user: AdminUser }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

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
    setSignOutOpen(false);
    fetch('/api/auth/signout', { method: 'POST' }).finally(() => {
      fetch('/api/admin/login', { method: 'DELETE' });
      fetch('/api/admin/2fa/set-session', { method: 'DELETE' });
      router.push('/sign-in');
    });
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 border-b border-border bg-[hsl(var(--card)/0.95)] backdrop-blur">
        <div className="flex h-16">
          <div className="hidden lg:flex lg:w-60 items-center border-r border-border px-4 shrink-0">
            <Logo href="/admin" className="flex-col" showText={false} textClassName="text-xl font-black tracking-tight" />
          </div>

          <div className="flex flex-1 items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-foreground hover:bg-muted lg:hidden"
                aria-label="Toggle navigation menu"
                onClick={() => setMobileOpen(true)}
              >
                <Menu size={18} />
              </button>
              <Logo href="/admin" className="flex-col lg:hidden" showText={false} />
            </div>
            <div className="hidden sm:block text-md text-muted-foreground">Welcome back to admin dashboard</div>

            <div className="flex items-center gap-2 ml-auto">
              <ThemeToggle />
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-md px-3 py-1.5 hover:bg-muted transition-colors"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {getInitials(user)}
                  </div>
                  <div className="hidden text-left sm:block leading-none">
                    <p className="text-sm font-medium">{user.name || user.email}</p>
                  </div>
                  <ChevronDown size={14} className={cn('text-muted-foreground transition-transform shrink-0', dropdownOpen && 'rotate-180')} />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-56 rounded-md border border-border bg-card shadow-lg z-50 py-1">
                    <div className="border-b border-border px-4 py-3">
                      <p className="text-sm font-medium">{user.name || 'Admin'}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <Link
                      href="/admin/settings"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <Settings size={15} /> Settings
                    </Link>
                    <hr className="border-border my-1" />
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-muted transition-colors"
                      onClick={() => { setDropdownOpen(false); setSignOutOpen(true); }}
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
          <aside className="absolute left-0 top-0 flex h-dvh w-[min(84vw,340px)] flex-col border-r border-border bg-card p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <Logo href="/admin" className="flex-col" showText={false} />
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
                  <p className="text-xs text-muted-foreground">Admin</p>
                </div>
              </div>
              <hr className="border-border" />
              <nav className="space-y-0.5 pt-2">
                {adminNavItems.map(({ href, label, icon: Icon }) => {
                  const isActive = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
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
              <Button variant="secondary" className="w-full" onClick={() => { setMobileOpen(false); setSignOutOpen(true); }}>
                Sign out
              </Button>
            </div>
          </aside>
        </div>
      )}

      <Dialog open={signOutOpen} onOpenChange={setSignOutOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
              <AlertTriangle size={24} />
            </div>
            <DialogTitle className="text-center">Sign out</DialogTitle>
            <DialogDescription className="text-center">
              Are you sure you want to sign out of the admin panel?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center gap-2 pt-2">
            <Button variant="secondary" onClick={() => setSignOutOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={signOut}>Sign out</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
