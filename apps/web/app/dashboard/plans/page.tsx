import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { CreditCard, Check } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const plans = [
  {
    name: 'Free',
    price: '$0',
    detail: '5 links per month',
    features: ['Custom aliases', 'QR codes', 'Password links', 'Basic analytics'],
    current: true,
  },
  {
    name: 'Pro',
    price: '$13',
    detail: 'Unlimited links',
    features: ['Unlimited links', 'Expiration controls', 'Advanced analytics', 'Priority support'],
    popular: true,
  },
  {
    name: 'Developer',
    price: '$29',
    detail: 'API-first workflow',
    features: ['PH_API_KEY access', 'External shorten API', 'Unlimited links', 'Team-ready limits'],
  },
];

export const metadata: Metadata = {
  title: "Plans",
};

export default async function PlansPage() {
  await requireUser();

  return (
    <div className="space-y-6">
      <div className="text-center">
        <CreditCard className="mx-auto text-primary" size={40} />
        <h2 className="mt-4 text-2xl font-bold">Choose your plan</h2>
        <p className="mt-2 text-muted-foreground">Upgrade to unlock unlimited links and developer features.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        {plans.map((plan) => (
          <div key={plan.name} className={`relative rounded-md border p-6 shadow-sm ${plan.popular ? 'border-primary ring-2 ring-primary/20' : 'border-border'} bg-white`}>
            {plan.popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-0.5 text-xs font-bold text-white">Popular</span>}
            <h3 className="text-xl font-bold">{plan.name}</h3>
            <p className="mt-2 text-3xl font-bold text-primary">{plan.price}</p>
            <p className="mt-1 text-sm text-muted-foreground">{plan.detail}</p>
            <ul className="mt-6 space-y-2">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm"><Check size={16} className="text-primary" />{f}</li>
              ))}
            </ul>
            <Button asChild className={`mt-6 w-full`} variant={plan.current ? 'secondary' : 'primary'} disabled={plan.current}>
              <Link href={plan.current ? '/dashboard' : '/dashboard/plans'}>{plan.current ? 'Current plan' : 'Upgrade'}</Link>
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
