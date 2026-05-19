import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { apiBaseUrl } from "@/lib/utils";
import { PasswordForm } from "./password-form";
import { Logo } from "../../components/logo";
type GatewayMetadata = {
  slug: string;
  shortHost: string;
  destination: string;
  title?: string | null;
  hasPassword: boolean;
  isExpired: boolean;
  status: "ACTIVE" | "DISABLED";
};

async function getMetadata(
  slug: string,
  shortHost?: string,
): Promise<GatewayMetadata | null> {
  const params = new URLSearchParams();
  if (shortHost) params.set("shortHost", shortHost);
  const response = await fetch(`${apiBaseUrl}/links/${slug}/meta?${params}`, {
    cache: "no-store",
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Unable to resolve link.");
  return response.json();
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const headersList = await headers();
  const host = headersList.get("host") ?? undefined;
  const data = await getMetadata(params.slug, host);

  if (!data) {
    return {
      title: "Link not found",
      description: "This Phyat link does not exist.",
    };
  }

  if (data.isExpired || data.status === "DISABLED") {
    return {
      title: "Link expired",
      description: "This Phyat link has expired or is disabled.",
    };
  }

  return {
    title: data.title || `Redirect to ${data.destination}`,
    description: data.title || data.destination,
    openGraph: {
      title: data.title || "Phyat Link",
      description: data.destination,
      type: "website",
      url: `${process.env.NEXT_PUBLIC_APP_URL}/${data.slug}`,
      images: [
        {
          url: `/api/og?title=${encodeURIComponent(data.title || "Phyat Link")}&url=${encodeURIComponent(`phyat.app/${data.slug}`)}`,
          width: 1200,
          height: 630,
          alt: data.title || "Phyat Link Preview",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: data.title || "Phyat Link",
      description: data.destination,
    },
  };
}

export default async function GatewayPage({
  params,
}: {
  params: { slug: string };
}) {
  const headersList = await headers();
  const host = headersList.get("host") ?? undefined;
  const metadata = await getMetadata(params.slug, host);

  if (!metadata) {
    return (
      <StatusPage
        title="Link not found"
        message="This Phyat link does not exist."
      />
    );
  }

  if (metadata.isExpired) {
    return (
      <StatusPage title="410 Gone" message="This Phyat link has expired." />
    );
  }

  if (metadata.status === "DISABLED") {
    return (
      <StatusPage title="410 Gone" message="This Phyat link is disabled." />
    );
  }

  if (metadata.hasPassword) {
    return <PasswordForm slug={metadata.slug} shortHost={metadata.shortHost} />;
  }

  const qs = new URLSearchParams();
  qs.set("shortHost", metadata.shortHost);

  const fetchHeaders: Record<string, string> = {};
  const ua = headersList.get("user-agent");
  if (ua) fetchHeaders["user-agent"] = ua;
  const ref = headersList.get("referer");
  if (ref) fetchHeaders.referer = ref;
  const fwd =
    headersList.get("x-forwarded-for") || headersList.get("x-real-ip");
  if (fwd) fetchHeaders["x-forwarded-for"] = fwd;

  const response = await fetch(`${apiBaseUrl}/r/${metadata.slug}?${qs}`, {
    headers: fetchHeaders,
    redirect: "manual",
    cache: "no-store",
  });

  const location = response.headers.get("location");
  redirect(location || metadata.destination);
}

function StatusPage({ title, message }: { title: string; message: string }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6">
      <Logo href="/" className="flex-col" showText={false} />
      <div className="max-w-sm text-center">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-2 text-muted-foreground">{message}</p>
      </div>
    </main>
  );
}
