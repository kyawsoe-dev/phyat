import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { apiBaseUrl } from "@/lib/utils";
import { setToken } from "@/lib/auth";
import { Logo } from "@/components/logo";

async function signIn(formData: FormData) {
  "use server";

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
    throw new Error(error.message ?? "Unable to sign in.");
  }

  const session = (await response.json()) as { accessToken: string };
  setToken(session.accessToken);
  redirect("/dashboard");
}

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <form
        action={signIn}
        className="w-full max-w-sm rounded-md border border-border bg-white p-6 shadow-sm"
      >
        <div className="mb-6 flex flex-col items-center gap-1">
          <Logo className="flex-col" showText={false} />
          <p className="text-center text-sm text-muted-foreground">
            Fast URL shortening for smart links.
          </p>
        </div>
        <div className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              name="email"
              placeholder="you@example.com"
              required
              type="email"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <PasswordInput
              id="password"
              name="password"
              placeholder="Password"
              required
              minLength={6}
            />
          </div>
          <Button className="w-full" type="submit">
            Sign in
          </Button>
        </div>
        <p className="mt-5 text-center text-sm text-muted-foreground">
          New to Phyat?{" "}
          <Link className="font-medium text-primary" href="/sign-up">
            Create an account
          </Link>
        </p>
      </form>
    </main>
  );
}
