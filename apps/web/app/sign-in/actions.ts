"use server";

import { redirect } from "next/navigation";
import { apiBaseUrl } from "@/lib/utils";
import { setToken } from "@/lib/auth";

export async function signIn(prev: { error: string } | undefined, formData: FormData) {
  const response = await fetch(`${apiBaseUrl}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: formData.get("email"),
      password: formData.get("password"),
    }),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Unable to sign in." }));
    return { error: error.message ?? "Unable to sign in." };
  }

  const session = (await response.json()) as { accessToken: string };
  setToken(session.accessToken);
  redirect("/dashboard");
}
