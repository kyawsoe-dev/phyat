'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeft,
  AlertTriangle,
  Layers,
  Link as LinkIcon,
  FileText,
  ArrowUp,
} from 'lucide-react';
import { useAdmin } from '../admin-context';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export const adminNavItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/tiers', label: 'Tiers', icon: Layers },
  { href: '/admin/links', label: 'Links', icon: LinkIcon },
  { href: '/admin/invoices', label: 'Invoices', icon: FileText },
  { href: '/admin/upgrade-requests', label: 'Requests', icon: ArrowUp },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const { pendingRequestsCount } = useAdmin();

  function handleSignOut() {
    fetch('/api/auth/signout', { method: 'POST' }).finally(() => {
      fetch('/api/admin/login', { method: 'DELETE' });
      fetch('/api/admin/2fa/set-session', { method: 'DELETE' });
      router.push('/admin/login');
    });
  }

  return (
    <>
      <aside
        className={cn(
          'hidden lg:flex flex-col border-r border-border bg-card transition-all duration-200 sticky top-16 h-[calc(100vh-4rem)] self-start',
          collapsed ? 'w-16' : 'w-60',
        )}
      >
        <div className={cn('flex items-center border-b border-border', collapsed ? 'justify-center py-3' : 'justify-between px-4 py-3')}>
          {!collapsed && <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Navigation</span>}
          <button
            type="button"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>
        <nav className="flex-1 space-y-0.5 px-2 py-3">
          {adminNavItems.map(({ href, label, icon: Icon }) => {
            const isActive =
              href === '/admin'
                ? pathname === '/admin'
                : pathname.startsWith(href);
            const showBadge = label === 'Requests' && pendingRequestsCount > 0;

            return (
              <Link
                key={href}
                href={href}
                title={collapsed ? label : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-md text-sm font-medium transition-colors',
                  collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <Icon size={18} className="shrink-0" />
                {!collapsed && (
                  <span className="truncate flex-1">{label}</span>
                )}
                {showBadge && (
                  <span
                    className={cn(
                      'ml-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-semibold text-white',
                      collapsed && 'absolute -top-0.5 -right-0.5'
                    )}
                  >
                    {pendingRequestsCount > 99 ? '99+' : pendingRequestsCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className={cn('border-t border-border', collapsed ? 'p-2' : 'p-3')}>
          <button
            type="button"
            title={collapsed ? 'Sign out' : undefined}
            onClick={() => setSignOutOpen(true)}
            className={cn(
              'flex w-full items-center gap-2 rounded-md text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors',
              collapsed ? 'justify-center px-0 py-2' : 'px-3 py-2',
            )}
          >
            <LogOut size={16} />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

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
            <Button variant="destructive" onClick={handleSignOut}>Sign out</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
