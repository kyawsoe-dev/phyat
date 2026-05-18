'use client';

import Link from "next/link";
import { useFormState } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Logo } from "@/components/logo";
import { AlertCircle } from "lucide-react";
import { signUp } from "./actions";

export default function SignUpPage({ searchParams }: { searchParams?: { tier?: string; billing?: string } }) {
  const [state, formAction] = useFormState(signUp, undefined);

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <form
        action={formAction}
        className="w-full max-w-sm rounded-md border border-border bg-card p-6 shadow-soft"
      >
        <div className="mb-6 flex flex-col items-center gap-1">
          <Logo className="flex-col" showText={false} />
          <p className="text-center text-sm text-muted-foreground">
            Fast URL shortening for smart links.
          </p>
        </div>

        {state?.error && (
          <div className="mb-4 flex items-center gap-2 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
            <AlertCircle size={16} className="shrink-0" />
            {state.error}
          </div>
        )}

        <input type="hidden" name="tier" value={searchParams?.tier ?? ""} />
          <input type="hidden" name="billing" value={searchParams?.billing ?? ""} />
          <div className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="name" className="text-sm font-medium">
              Name <span className="text-red-500">*</span>
            </label>
            <Input id="name" name="name" placeholder="Your name" required />
          </div>
          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium">
              Email <span className="text-red-500">*</span>
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
              Password <span className="text-red-500">*</span>
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
              Confirm password <span className="text-red-500">*</span>
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
