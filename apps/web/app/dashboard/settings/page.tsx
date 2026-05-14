import type { Metadata } from 'next';
import { requireUser, authHeaders } from '@/lib/auth';
import { apiBaseUrl } from '@/lib/utils';
import { User, Bell, Shield, KeyRound } from 'lucide-react';
import { DeveloperApiPanel } from '../developer-api-panel';

async function getApiKeys() {
  try {
    const response = await fetch(`${apiBaseUrl}/api-keys`, {
      headers: authHeaders(),
      cache: 'no-store',
    });
    if (!response.ok) return [];
    return response.json() as Promise<
      Array<{
        id: string;
        name: string;
        prefix: string;
        lastFour: string;
        createdAt: string;
        lastUsedAt?: string | null;
      }>
    >;
  } catch {
    return [];
  }
}

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const user = await requireUser();
  const apiKeys = await getApiKeys();

  return (
    <div className="space-y-8">
      <section className="rounded-md border border-border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <User size={20} className="text-primary" />
          <h2 className="text-lg font-semibold">Profile</h2>
        </div>
        <div className="mt-4 space-y-3 text-sm">
          <div>
            <span className="text-muted-foreground">Email</span>
            <p className="font-medium">{user.email}</p>
          </div>
          {user.name && (
            <div>
              <span className="text-muted-foreground">Name</span>
              <p className="font-medium">{user.name}</p>
            </div>
          )}
          <div>
            <span className="text-muted-foreground">Plan</span>
            <p className="font-medium">{user.tier.name}</p>
          </div>
        </div>
      </section>

      <DeveloperApiPanel apiKeys={apiKeys} />

      <section className="rounded-md border border-border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Bell size={20} className="text-primary" />
          <h2 className="text-lg font-semibold">Notifications</h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">Notification preferences coming soon.</p>
      </section>

      <section className="rounded-md border border-border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Shield size={20} className="text-primary" />
          <h2 className="text-lg font-semibold">Security</h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">Password and session management coming soon.</p>
      </section>
    </div>
  );
}
