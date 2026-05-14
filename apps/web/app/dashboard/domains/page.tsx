import { requireUser } from '@/lib/auth';
import { Globe2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default async function DomainsPage() {
  await requireUser();

  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <Globe2 size={64} className="text-muted-foreground" />
      <h2 className="text-xl font-semibold">Custom domains coming soon</h2>
      <p className="text-muted-foreground">Brand your short links with your own domain name. Point a CNAME and you are ready.</p>
      <Button asChild><a href="/dashboard">Back to dashboard</a></Button>
    </div>
  );
}
