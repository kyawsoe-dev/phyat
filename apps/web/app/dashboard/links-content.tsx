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
    customAlias: formData.get("customAlias") || undefined,
    expiresAt: formData.get("expiresAt") || undefined,
    password: formData.get("password") || undefined,
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
      nextCursor={nextCursor}
    />
  );
}
