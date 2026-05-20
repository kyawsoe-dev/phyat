import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { UpgradeRequired } from '@/components/upgrade-required';

export const metadata: Metadata = {
  title: 'Domains',
};

export default async function DomainsLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (!user.tier.customDomains) {
    return (
      <UpgradeRequired
        title="Custom domains require Pro"
        description="Free accounts can use the default short domain. Upgrade to connect branded domains and set a default domain."
      />
    );
  }

  return children;
}
