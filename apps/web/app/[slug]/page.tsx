import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { apiBaseUrl } from '@/lib/utils';
import { PasswordForm } from './password-form';

type GatewayMetadata = {
  slug: string;
  destination: string;
  title?: string | null;
  hasPassword: boolean;
  isExpired: boolean;
  status: 'ACTIVE' | 'DISABLED';
};

async function getMetadata(slug: string): Promise<GatewayMetadata | null> {
  const response = await fetch(`${apiBaseUrl}/links/${slug}/meta`, { cache: 'no-store' });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Unable to resolve link.');
  return response.json();
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const data = await getMetadata(params.slug);

  if (!data) {
    return {
      title: 'Link not found - Phyat',
      description: 'This Phyat link does not exist.',
    };
  }

  if (data.isExpired || data.status === 'DISABLED') {
    return {
      title: 'Link expired - Phyat',
      description: 'This Phyat link has expired or is disabled.',
    };
  }

  return {
    title: data.title || `Redirect to ${data.destination}`,
    description: data.title || data.destination,
    openGraph: {
      title: data.title || 'Phyat Link',
      description: data.destination,
      type: 'website',
      url: `${process.env.NEXT_PUBLIC_APP_URL}/${data.slug}`,
      images: [
        {
          url: `/api/og?title=${encodeURIComponent(data.title || 'Phyat Link')}&url=${encodeURIComponent(`phyat.app/${data.slug}`)}`,
          width: 1200,
          height: 630,
          alt: data.title || 'Phyat Link Preview',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: data.title || 'Phyat Link',
      description: data.destination,
    },
  };
}

export default async function GatewayPage({ params }: { params: { slug: string } }) {
  const metadata = await getMetadata(params.slug);

  if (!metadata) {
    return <StatusPage title="Link not found" message="This Phyat link does not exist." />;
  }

  if (metadata.isExpired || metadata.status === 'DISABLED') {
    return <StatusPage title="410 Gone" message="This Phyat link has expired or is disabled." />;
  }

  if (metadata.hasPassword) {
    return <PasswordForm slug={metadata.slug} />;
  }

  redirect(metadata.destination);
}

function StatusPage({ title, message }: { title: string; message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-sm text-center">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-2 text-muted-foreground">{message}</p>
      </div>
    </main>
  );
}
