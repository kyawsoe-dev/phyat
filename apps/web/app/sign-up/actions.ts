"use server";

import { redirect } from "next/navigation";
import { apiBaseUrl } from "@/lib/utils";
import { setToken } from "@/lib/auth";

export async function signUp(prev: { error: string } | undefined, formData: FormData) {
  const name = formData.get("name");
  const email = formData.get("email");
  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");
  const tier = String(formData.get("tier") || "");
  const billing = String(formData.get("billing") || "MONTHLY");

  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const response = await fetch(`${apiBaseUrl}/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name,
      email,
      password,
    }),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Unable to create account." }));
    return { error: error.message ?? "Unable to create account." };
  }

  const session = (await response.json()) as { accessToken: string };
  setToken(session.accessToken);
  if (tier === "PRO" || tier === "DEVELOPER") {
    redirect(`/dashboard/plans?tier=${tier}&billing=${billing === "ANNUAL" ? "ANNUAL" : "MONTHLY"}`);
  }

  redirect("/dashboard");
}
