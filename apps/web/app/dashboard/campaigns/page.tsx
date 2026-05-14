import { requireUser } from '@/lib/auth';
import { Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default async function CampaignsPage() {
  await requireUser();

  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <Megaphone size={64} className="text-muted-foreground" />
      <h2 className="text-xl font-semibold">Campaigns coming soon</h2>
      <p className="text-muted-foreground">Group links into campaigns, track conversion funnels, and compare performance.</p>
      <Button asChild><a href="/dashboard">Back to dashboard</a></Button>
    </div>
  );
}
