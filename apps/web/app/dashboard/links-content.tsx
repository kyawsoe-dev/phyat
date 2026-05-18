import { revalidatePath } from "next/cache";
import { authHeaders, requireUser } from "@/lib/auth";
import { apiBaseUrl } from "@/lib/utils";
import { LinkTable, type LinkRow } from "./link-table";

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
    notes: formData.get("notes") || undefined,
    tags: String(formData.get("tags") || "").split(",").map((s) => s.trim()).filter(Boolean),
    customAlias: formData.get("customAlias") || undefined,
    expiresAt: formData.get("expiresAt") || undefined,
    password: formData.get("password") || undefined,
    generateQR: formData.get("generateQR") === "on",
    campaignId: formData.get("campaignId") || undefined,
    domainId: formData.get("domainId") || undefined,
    redirectType: formData.get("redirectType") || undefined,
    utmParams: {
      utm_source: formData.get("utmSource") || undefined,
      utm_medium: formData.get("utmMedium") || undefined,
      utm_campaign: formData.get("utmCampaign") || undefined,
    },
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

async function updateLink(formData: FormData) {
  "use server";

  const response = await fetch(`${apiBaseUrl}/links/${formData.get("id")}`, {
    method: "PUT",
    headers: { ...authHeaders(), "content-type": "application/json" },
    body: JSON.stringify({
      active: formData.get("active") === "true",
      password: formData.get("password") || undefined,
    }),
  });

  if (!response.ok) {
    throw new Error("Unable to update link.");
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/links");
}

async function editLink(formData: FormData) {
  "use server";

  const payload: Record<string, unknown> = {
    title: formData.get("title") || undefined,
    notes: formData.get("notes") || undefined,
    tags: String(formData.get("tags") || "").split(",").map((s) => s.trim()).filter(Boolean),
    destination: formData.get("destination") || undefined,
    expiresAt: formData.get("expiresAt") || undefined,
    active: true,
  };

  const password = formData.get("password");
  if (password && typeof password === "string" && password.length >= 6) {
    payload.password = password;
  }

  if (formData.get("removePassword") === "on") {
    payload.removePassword = true;
  }

  const response = await fetch(`${apiBaseUrl}/links/${formData.get("id")}`, {
    method: "PUT",
    headers: { ...authHeaders(), "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Unable to edit link.");
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/links");
}

async function deleteLink(formData: FormData) {
  "use server";

  const response = await fetch(`${apiBaseUrl}/links/${formData.get("id")}`, {
    method: "DELETE",
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw new Error("Unable to delete link.");
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/links");
}

async function bulkCreateLinks(formData: FormData) {
  "use server";

  const raw = formData.get("entries");
  if (!raw || typeof raw !== "string") return;

  const entries = raw.split("\n").filter(Boolean).map((line) => {
    const [destination, title, customAlias] = line.split(",").map((s) => s.trim());
    return { destination, title: title || undefined, customAlias: customAlias || undefined };
  });

  const response = await fetch(`${apiBaseUrl}/links/bulk`, {
    method: "POST",
    headers: { ...authHeaders(), "content-type": "application/json" },
    body: JSON.stringify(entries),
  });

  if (!response.ok) throw new Error("Unable to bulk create links.");

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/links");
}

export default async function LinksContent() {
  await requireUser();
  const { data: links, nextCursor } = await getLinks();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return (
    <LinkTable
      links={links}
      appUrl={appUrl}
      updateAction={updateLink}
      deleteAction={deleteLink}
      editAction={editLink}
      createAction={createLink}
      bulkCreateAction={bulkCreateLinks}
      nextCursor={nextCursor}
    />
  );
}
