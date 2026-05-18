import { Plus, Link2, MousePointerClick, Activity } from "lucide-react";
import { revalidatePath } from "next/cache";
import { authHeaders, requireUser } from "@/lib/auth";
import { apiBaseUrl } from "@/lib/utils";
import { CreateLinkForm } from "./create-link-form";
import type { LinkRow } from "./link-table";

async function getLinks() {
  try {
    const response = await fetch(`${apiBaseUrl}/links`, {
      headers: authHeaders(),
      cache: "no-store",
    });
    if (!response.ok) return { data: [], nextCursor: null };
    return response.json() as Promise<{
      data: LinkRow[];
      nextCursor: string | null;
    }>;
  } catch {
    return { data: [], nextCursor: null };
  }
}

async function createLink(formData: FormData) {
  "use server";

  const payload = {
    destination: formData.get("destination"),
    title: formData.get("title") || undefined,
    customAlias: formData.get("customAlias") || undefined,
    expiresAt: formData.get("expiresAt") || undefined,
    password: formData.get("password") || undefined,
    generateQR: formData.get("generateQR") === "on",
    campaignId: formData.get("campaignId") || undefined,
  };

  const response = await fetch(`${apiBaseUrl}/links`, {
    method: "POST",
    headers: { ...authHeaders(), "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Unable to create link.");
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/links");
}

function formatCount(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

export default async function DashboardContent() {
  const user = await requireUser();
  const { data: links } = await getLinks();

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const linksThisMonth = links.filter((l) => l.createdAt >= thisMonthStart).length;
  const maxLinks = user.tier.maxLinks;
  const remaining = maxLinks !== null ? Math.max(0, maxLinks - linksThisMonth) : null;

  const totalLinks = links.length;
  const activeLinks = links.filter((l) => l.status === "ACTIVE").length;
  const totalClicks = links.reduce((sum, l) => sum + l.clickCount, 0);
  const recentLinks = links.slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Overview of your shortened links
          </p>
        </div>
        <CreateLinkForm createLink={createLink} />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Link2 size={18} className="text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Links</p>
              <p className="text-2xl font-bold">{formatCount(totalLinks)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/30">
              <Activity size={18} className="text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Links</p>
              <p className="text-2xl font-bold">{formatCount(activeLinks)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/30">
              <MousePointerClick size={18} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Clicks</p>
              <p className="text-2xl font-bold">{formatCount(totalClicks)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30">
              <Plus size={18} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Links Remaining</p>
              <p className="text-2xl font-bold">
                {remaining !== null ? remaining : <span className="text-base font-normal text-muted-foreground">Unlimited</span>}
              </p>
              {maxLinks !== null && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  of {maxLinks} this month
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Links */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold">Recent Links</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your 5 most recently created links
            </p>
          </div>
          <a
            href="/dashboard/links"
            className="text-xs font-medium text-primary hover:underline"
          >
            View all
          </a>
        </div>

        {recentLinks.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <Link2 size={18} className="text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No links yet</p>
            <p className="text-xs text-muted-foreground">
              Create your first shortened URL to get started.
            </p>
          </div>
        ) : (
          <div>
            {recentLinks.map((link) => (
              <div
                key={link.id}
                className="flex items-center gap-4 border-b border-border last:border-b-0 px-5 py-3.5 transition-colors hover:bg-muted/20"
              >
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    link.status === "ACTIVE"
                      ? "bg-green-500"
                      : "bg-muted-foreground/40"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <a
                    href={`${link.shortHost.startsWith('localhost') ? 'http://' : 'https://'}${link.shortHost}/${link.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate text-sm font-medium text-primary hover:underline"
                  >
                    {link.shortHost}/{link.slug}
                  </a>
                  <p className="truncate text-xs text-muted-foreground">
                    {link.title || link.destination}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-bold tabular-nums">
                  {formatCount(link.clickCount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
