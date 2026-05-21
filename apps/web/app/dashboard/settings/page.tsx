import type { Metadata } from 'next';
import { requireUser, authHeaders } from '@/lib/auth';
import { apiBaseUrl } from '@/lib/utils';
import { SettingsClient } from './settings-client';

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
        revokedAt?: string | null;
      }>
    >;
  } catch {
    return [];
  }
}

async function getStats() {
  try {
    const [linksRes, campaignsRes, domainsRes] = await Promise.all([
      fetch(`${apiBaseUrl}/links`, { headers: authHeaders(), cache: 'no-store' }),
      fetch(`${apiBaseUrl}/campaigns`, { headers: authHeaders(), cache: 'no-store' }),
      fetch(`${apiBaseUrl}/domains`, { headers: authHeaders(), cache: 'no-store' }),
    ]);

    const linksData = linksRes.ok ? await linksRes.json() : { data: [] };
    const campaigns = campaignsRes.ok ? await campaignsRes.json() : [];
    const domains = domainsRes.ok ? await domainsRes.json() : [];

    const links = linksData.data ?? [];
    return {
      linkCount: links.length,
      qrCount: links.filter((l: any) => l.qrCodeDataUrl).length,
      campaignCount: campaigns.length,
      domainCount: domains.length,
    };
  } catch {
    return { linkCount: 0, qrCount: 0, campaignCount: 0, domainCount: 0 };
  }
}

export const metadata: Metadata = {
  title: 'Settings',
};

export default async function SettingsPage() {
  const user = await requireUser();
  const [apiKeys, stats] = await Promise.all([getApiKeys(), getStats()]);

  return (
    <SettingsClient
      user={{
        id: user.id,
        email: user.email,
        name: user.name ?? null,
        createdAt: user.createdAt,
        user2faEnabled: Boolean((user as any).user2faEnabled),
        hasPassword: Boolean((user as any).hasPassword),
        tier: {
          code: user.tier.code,
          name: user.tier.name,
          maxLinks: user.tier.maxLinks,
          apiAccess: Boolean(user.tier.apiAccess),
        },
      }}
      stats={stats}
      initialApiKeys={apiKeys}
    />
  );
}
