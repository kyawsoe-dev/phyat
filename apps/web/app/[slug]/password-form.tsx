"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "../../components/logo";
export function PasswordForm({
  slug,
  shortHost,
}: {
  slug: string;
  shortHost: string;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const baseUrl =
        process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
      const params = new URLSearchParams();
      params.set("shortHost", shortHost);
      const response = await fetch(
        `${baseUrl}/links/${slug}/password?${params}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ password }),
        },
      );

      if (!response.ok) {
        setError("The password was not accepted.");
        return;
      }

      const data = (await response.json()) as { destination: string };
      router.replace(data.destination);
    });
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6">
      <Logo href="/" className="flex-col" showText={false} />

      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-md border border-border bg-white p-6 shadow-sm"
      >
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
            <LockKeyhole size={20} />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Protected Phyat link</h1>
            <p className="text-sm text-muted-foreground">
              Enter the password to continue.
            </p>
          </div>
        </div>
        <Input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          autoFocus
        />
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <Button className="mt-4 w-full" disabled={pending} type="submit">
          Continue
        </Button>
      </form>
    </main>
  );
}
