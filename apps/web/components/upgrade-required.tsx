import Link from 'next/link';
import { LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';

type UpgradeRequiredProps = {
  title: string;
  description: string;
  requiredPlan?: string;
};

export function UpgradeRequired({ title, description, requiredPlan = 'Pro' }: UpgradeRequiredProps) {
  return (
    <div className="mx-auto flex min-h-[55vh] max-w-xl flex-col items-center justify-center text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-md border border-border bg-card text-muted-foreground">
        <LockKeyhole size={22} />
      </div>
      <h1 className="mt-5 text-2xl font-bold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      <Button className="mt-6" asChild>
        <Link href={`/dashboard/plans?tier=${requiredPlan.toUpperCase()}`}>
          Upgrade to {requiredPlan}
        </Link>
      </Button>
    </div>
  );
}
