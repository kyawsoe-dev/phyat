'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Link2,
  QrCode,
  Megaphone,
  Globe2,
  BarChart3,
  CreditCard,
  Settings,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/links', label: 'Links', icon: Link2 },
  { href: '/dashboard/qr', label: 'QR Codes', icon: QrCode },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/campaigns', label: 'Campaigns', icon: Megaphone },
  { href: '/dashboard/domains', label: 'Domains', icon: Globe2 },
  { href: '/dashboard/plans', label: 'Plans', icon: CreditCard },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export function DashboardSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col border-r border-border bg-[hsl(var(--card))] transition-all duration-200 sticky top-16 h-[calc(100vh-4rem)] self-start',
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
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
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
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
