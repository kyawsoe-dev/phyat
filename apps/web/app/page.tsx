import type { Metadata } from 'next';
import {
  BarChart3,
  Check,
  Cloud,
  Globe2,
  KeyRound,
  QrCode,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getCurrentUser } from '@/lib/auth';
import { LandingHeroClient } from '@/components/landing-hero-client';

const stats = [
  ['10M+', 'Links shortened'],
  ['50K+', 'Active users'],
  ['99.9%', 'Uptime'],
  ['24/7', 'Support'],
] as const;

const platformFeatures = [
  {
    icon: Cloud,
    title: 'PostgreSQL hot path',
    copy: 'Unique B-tree indexing on every slug keeps redirects fast without Redis cost.',
    tone: 'bg-blue-50 border-blue-100 text-blue-700 dark:bg-blue-950/35 dark:border-blue-900/60 dark:text-blue-300',
  },
  {
    icon: Zap,
    title: 'High performance',
    copy: 'Prisma findUnique lookup, async analytics, and redirect-first service boundaries.',
    tone: 'bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-950/35 dark:border-emerald-900/60 dark:text-emerald-300',
  },
  {
    icon: ShieldCheck,
    title: 'Maximum security',
    copy: 'JWT sessions, hashed passwords, hashed API keys, and tenant-scoped access.',
    tone: 'bg-violet-50 border-violet-100 text-violet-700 dark:bg-violet-950/35 dark:border-violet-900/60 dark:text-violet-300',
  },
  {
    icon: BarChart3,
    title: 'Advanced analytics',
    copy: 'Track user agent, referrer, click volume, and mock GeoIP for every redirect.',
    tone: 'bg-orange-50 border-orange-100 text-orange-700 dark:bg-orange-950/35 dark:border-orange-900/60 dark:text-orange-300',
  },
];

const plans = [
  {
    name: 'Free',
    price: '$0',
    detail: '5 links per month',
    features: ['Custom aliases', 'QR codes', 'Password links', 'Basic analytics'],
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
  title: 'URL Shortener for Myanmar Builders',
  description: 'Shorten, customize, protect, and track links with a clean dashboard and developer-ready API.',
};

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <main className="min-h-screen bg-background">
      <LandingHeroClient user={user} />

      <section id="platform" className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold">Powerful Platform</h2>
          <p className="mt-3 text-lg text-muted-foreground">
            The core Phyat modules are built for speed, security, and multi-tenant growth.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {platformFeatures.map((feature) => (
            <article key={feature.title} className={`rounded-md border p-7 ${feature.tone}`}>
              <feature.icon size={42} className="rounded-md bg-[hsl(var(--card))] p-2 shadow-sm" />
              <h3 className="mt-5 text-xl font-semibold text-foreground">{feature.title}</h3>
              <p className="mt-2 leading-7 text-muted-foreground">{feature.copy}</p>
            </article>
          ))}
        </div>
        <div className="mt-8 grid gap-6 rounded-md bg-muted p-7 md:grid-cols-3">
          {([
            [Globe2, 'Custom domains', 'Brand-ready short URLs for campaigns and teams.'],
            [QrCode, 'Unlimited clicks', 'No redirect cap on links across every tier.'],
            [KeyRound, 'Robust API', 'Use PH_API_KEY with the external shorten endpoint.'],
          ] as const).map(([Icon, title, copy]) => (
            <div key={title} className="text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-[hsl(var(--card))] text-primary">
                <Icon size={22} />
              </span>
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.12),transparent_34%),hsl(var(--card))] px-6 py-20 text-foreground">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <BarChart3 className="mx-auto rounded-md bg-primary p-2 text-primary-foreground" size={52} />
            <h2 className="mt-6 text-4xl font-bold">Results that Impress</h2>
            <p className="mx-auto mt-3 max-w-2xl text-lg text-muted-foreground">
              See click growth, protected links, API usage, and QR engagement from one workspace.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {([['1,247', 'Clicks today', 'Live campaign traffic'],
              ['8.5%', 'Conversion rate', 'Track campaign performance'],
              ['Yangon', 'Top city', 'Mock GeoIP insight'],
            ] as const).map(([value, label, copy]) => (
              <div key={label} className="rounded-md border border-border bg-background p-6 shadow-sm">
                <p className="text-4xl font-bold text-primary">{value}</p>
                <h3 className="mt-3 font-semibold">{label}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="solutions" className="mx-auto grid max-w-6xl gap-8 px-6 py-20 lg:grid-cols-2">
        <div>
          <h2 className="text-3xl font-bold">Smart Solutions</h2>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            Phyat now has the essentials from a mature short-link platform: branded links, password gates, expiration, analytics, QR codes, and developer integration.
          </p>
          <div className="mt-6 space-y-3">
            {['Custom aliases', 'Password protection', 'Expiration controls', 'Developer API keys'].map((item) => (
              <p key={item} className="flex items-center gap-3 font-medium">
                <Check size={18} className="text-primary" /> {item}
              </p>
            ))}
          </div>
          <div className="mt-8 flex gap-3">
            <Button asChild><Link href="/sign-up">Start free</Link></Button>
            <Button asChild variant="secondary"><a href="#plans">View plans</a></Button>
          </div>
        </div>
        <div className="rounded-md bg-primary/10 p-8">
          <div className="rotate-2 rounded-md bg-[hsl(var(--card))] p-6 shadow-lg">
            <p className="text-sm text-muted-foreground">Your Custom Link</p>
            <p className="mt-2 text-xl font-bold text-primary">phyat.app/promo2026</p>
            <div className="mt-5 h-3 rounded-full bg-muted">
              <div className="h-3 w-3/4 rounded-full bg-primary" />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Conversion rate</p>
          </div>
        </div>
      </section>

      <section id="plans" className="border-t border-border bg-[hsl(var(--muted)/0.65)] px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold">Choose your Plan</h2>
            <p className="mt-3 text-lg text-muted-foreground">Start small, then unlock unlimited links or developer access.</p>
          </div>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {plans.map((plan) => (
              <article key={plan.name} className={`relative rounded-md border bg-[hsl(var(--card))] p-7 shadow-sm ${plan.popular ? 'border-primary ring-2 ring-primary/20' : 'border-border'}`}>
                {plan.popular && (
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-bold uppercase text-white">Popular</span>
                )}
                <h3 className="text-2xl font-bold">{plan.name}</h3>
                <p className="mt-4 text-4xl font-bold text-primary">{plan.price}</p>
                <p className="mt-1 text-muted-foreground">{plan.detail}</p>
                <div className="mt-6 space-y-3">
                  {plan.features.map((feature) => (
                    <p key={feature} className="flex items-center gap-3 text-sm">
                      <Check size={17} className="text-primary" /> {feature}
                    </p>
                  ))}
                </div>
                <Button asChild className="mt-7 w-full" variant={plan.popular ? 'primary' : 'secondary'}>
                  <Link href="/sign-up">Choose {plan.name}</Link>
                </Button>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
