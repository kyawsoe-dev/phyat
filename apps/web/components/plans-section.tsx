
"use client";

import { useEffect, useState } from "react";
import { Check, Sparkles, Zap, Code2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Plan = {
  code: "FREE" | "PRO" | "DEVELOPER";
  name: string;
  description: string;
  priceMonthly: number;
  priceAnnual: number;
  features: string[];
  annualDiscountPercent: number;
  monthlyPriceLabel: string;
  annualPriceLabel: string;
};

type UserLike = { tier?: { code?: string } } | null;

const iconMap: Record<string, typeof Sparkles> = {
  FREE: Sparkles,
  PRO: Zap,
  DEVELOPER: Code2,
};

export function PlansSection({ user }: { user?: UserLike }) {
  const router = useRouter();
  const [billing, setBilling] = useState<"MONTHLY" | "ANNUAL">("MONTHLY");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [checkoutCode, setCheckoutCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/plans", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Unable to load plans"))))
      .then(setPlans)
      .catch(() => setError("Unable to load plans right now."))
      .finally(() => setLoadingPlans(false));
  }, []);

  async function choosePlan(plan: Plan) {
    setError(null);

    if (!user) {
      router.push(`/sign-up?tier=${plan.code}&billing=${billing}`);
      return;
    }

    if (user.tier?.code === plan.code) {
      router.push("/dashboard/plans");
      return;
    }

    setCheckoutCode(plan.code);
    try {
      const response = await fetch("/api/subscriptions/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tierCode: plan.code, billingCycle: billing }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.message ?? "Unable to start checkout.");
        setCheckoutCode(null);
        return;
      }
      if (data.immediate) {
        router.push("/dashboard/plans?checkout=success");
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError("No checkout URL returned. Please try again.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start checkout.");
    } finally {
      setCheckoutCode(null);
    }
  }

  return (
    <section id="plans" className="border-t border-border bg-[hsl(var(--muted)/0.65)] px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold">Choose your Plan</h2>
          <p className="mt-3 text-lg text-muted-foreground">Start small, then unlock unlimited links or developer access.</p>
        </div>

        <div className="mt-8 flex items-center justify-center gap-3">
          <button type="button" onClick={() => setBilling("MONTHLY")} className={cn("rounded-lg px-5 py-2 text-sm font-medium transition-colors", billing === "MONTHLY" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>Monthly</button>
          <button type="button" onClick={() => setBilling("ANNUAL")} className={cn("rounded-lg px-5 py-2 text-sm font-medium transition-colors", billing === "ANNUAL" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>Annual<span className="ml-1.5 rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">Save up to 23%</span></button>
        </div>

        {error && <p className="mt-4 text-center text-sm text-red-600">{error}</p>}

        {loadingPlans ? (
          <div className="mt-10 flex justify-center py-16 text-muted-foreground"><Loader2 className="animate-spin" size={22} /></div>
        ) : (
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {plans.map((plan) => {
              const Icon = iconMap[plan.code] ?? Sparkles;
              const isPopular = plan.code === "PRO";
              const isAnnual = billing === "ANNUAL";
              const priceLabel = isAnnual ? plan.annualPriceLabel : plan.monthlyPriceLabel;
              const showAnnualNote = isAnnual && plan.annualDiscountPercent > 0;
              const isCurrent = user?.tier?.code === plan.code;
              const isLoading = checkoutCode === plan.code;

              return (
                <div key={plan.code} className={cn("relative flex flex-col rounded-xl border shadow-sm transition-all bg-[hsl(var(--card))]", isPopular ? "border-primary ring-2 ring-primary/10" : "border-border")}>
                  {isPopular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-0.5 text-xs font-bold text-primary-foreground">Popular</span>}
                  {isCurrent && <span className="absolute top-3 right-3 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">Current</span>}

                  <div className="p-7 flex-1">
                    <div className="flex items-center gap-3">
                      <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", plan.code === "FREE" ? "bg-muted" : plan.code === "PRO" ? "bg-primary/10" : "bg-purple-100 dark:bg-purple-900/30")}>
                        <Icon size={18} className={cn(plan.code === "FREE" ? "text-muted-foreground" : plan.code === "PRO" ? "text-primary" : "text-purple-600 dark:text-purple-400")} />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">{plan.name}</h3>
                        <p className="text-sm text-muted-foreground">{plan.description}</p>
                      </div>
                    </div>

                    <div className="mt-5">
                      <div className="flex items-baseline gap-1"><span className="text-3xl font-bold">{priceLabel === "Free" ? "$0" : priceLabel}</span></div>
                      {showAnnualNote && <p className="mt-0.5 text-xs text-green-600 dark:text-green-400">Save {plan.annualDiscountPercent}% vs monthly</p>}
                      {!isAnnual && plan.priceMonthly > 0 && <p className="mt-0.5 text-xs text-muted-foreground">${(plan.priceAnnual / 100).toFixed(0)} billed annually</p>}
                    </div>

                    <ul className="mt-6 space-y-2.5">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm"><Check size={15} className="mt-0.5 shrink-0 text-primary" /><span>{feature}</span></li>
                      ))}
                    </ul>
                  </div>

                  <div className={cn("p-7 pt-0", isPopular && "pb-8")}>
                    <Button type="button" className="w-full" variant="secondary" disabled={isLoading || isCurrent} onClick={() => choosePlan(plan)}>
                      {isLoading ? <><Loader2 size={16} className="animate-spin" /> Starting checkout</> : isCurrent ? "Current plan" : !user ? plan.code === "FREE" ? "Get started free" : `Sign up for ${plan.name}` : plan.code === "FREE" ? "Switch to Free" : `Choose ${plan.name}`}
                    </Button>
                  </div>

                  {showAnnualNote && <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-green-500 px-3 py-0.5 text-xs font-bold text-white shadow-sm">{plan.annualDiscountPercent}% OFF</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
