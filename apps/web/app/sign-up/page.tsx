import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { setToken } from "@/lib/auth";
import { apiBaseUrl } from "@/lib/utils";
import { Logo } from "@/components/logo";

async function signUp(formData: FormData) {
  "use server";

  const name = formData.get("name");
  const email = formData.get("email");
  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");

  if (password !== confirmPassword) {
    throw new Error("Passwords do not match.");
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
    throw new Error(error.message ?? "Unable to create account.");
  }

  const session = (await response.json()) as { accessToken: string };
  setToken(session.accessToken);
  redirect("/dashboard");
}

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <form
        action={signUp}
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
            <label htmlFor="name" className="text-sm font-medium">
              Name
            </label>
            <Input id="name" name="name" placeholder="Your name" />
          </div>
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
              placeholder="Create a password"
              required
              minLength={8}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="confirmPassword" className="text-sm font-medium">
              Confirm password
            </label>
            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"
              placeholder="Confirm your password"
              required
              minLength={8}
            />
          </div>
          <Button className="w-full" type="submit">
            Create account
          </Button>
        </div>
        <p className="mt-5 text-center text-sm text-muted-foreground">
          Already registered?{" "}
          <Link className="font-medium text-primary" href="/sign-in">
            Sign in
          </Link>
        </p>
      </form>
    </main>
  );
}
