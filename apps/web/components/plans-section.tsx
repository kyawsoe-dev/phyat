
"use client";

import { useEffect, useState, useRef } from "react";
import { Check, Sparkles, Zap, Code2, Loader2, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

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
  const [confirmPlan, setConfirmPlan] = useState<Plan | null>(null);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const hasFetchedPendingRef = useRef(false);

  useEffect(() => {
    fetch("/api/plans", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Unable to load plans"))))
      .then(setPlans)
      .catch(() => setError("Unable to load plans right now."))
      .finally(() => setLoadingPlans(false));

    // Load pending upgrade requests if logged in (only once to avoid 429)
    if (user && !hasFetchedPendingRef.current) {
      hasFetchedPendingRef.current = true;
      fetch("/api/upgrade-requests", { cache: "no-store" })
        .then((r) => {
          if (r.status === 429) {
            // Rate limited — still show banner if we had previous data
            return null;
          }
          return r.ok ? r.json() : [];
        })
        .then((data) => {
          if (data) {
            const list = Array.isArray(data) ? data : data.requests || [];
            setPendingRequests(list.filter((r: any) => r.status === "PENDING"));
          }
        })
        .catch(() => {});
    }
  }, [user]);

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

    // Prevent multiple requests
    if (pendingRequests.length > 0) {
      setError("You have a pending upgrade request. Please wait for admin review.");
      setCheckoutCode(null);
      return;
    }

    setCheckoutCode(plan.code);
    try {
      const response = await fetch("/api/upgrade-requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tierCode: plan.code }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.message ?? "Unable to submit upgrade request.");
        setCheckoutCode(null);
        return;
      }
      // Proper feedback - no more native alert
      setError(null);

      // Optimistic update instead of another network call (prevents 429 rate limit)
      const newPending = {
        id: 'temp-' + Date.now(),
        status: 'PENDING',
        tier: { name: plan.name, code: plan.code },
        createdAt: new Date().toISOString(),
      };
      setPendingRequests([newPending]);

      setCheckoutCode(null);
      // Optional: redirect to settings requests tab if exists, or just show success via pending banner
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit request.");
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

        {/* Pending request banner - exactly matching user dashboard plans page */}
        {user && pendingRequests.length > 0 && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30 p-4 text-sm mx-auto">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="font-medium text-amber-800 dark:text-amber-300">
                  Upgrade request pending
                </div>
                <div className="text-amber-700 dark:text-amber-400 mt-1">
                  You have a pending request for <strong>{pendingRequests[0].tier?.name || "a higher plan"}</strong>.
                  An admin will review it shortly. You cannot request another plan until this is processed.
                </div>
                <div className="text-xs mt-2 text-amber-600 dark:text-amber-500">
                  Submitted: {new Date(pendingRequests[0].createdAt).toLocaleDateString()}
                </div>

                {/* Admin contact for payment (manual upgrade) */}
                <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-900/50 text-xs text-amber-700 dark:text-amber-400">
                  For payment, please contact:
                  <div className="mt-1">
                    Phone: <a href="tel:+959455637738" className="underline hover:no-underline">+959455637738</a><br />
                    Email: <a href="mailto:kyawsoedeveloper@gmail.com" className="underline hover:no-underline">kyawsoedeveloper@gmail.com</a>
                  </div>
                </div>
              </div>
              <button
                onClick={async () => {
                  try {
                    const res = await fetch(`/api/upgrade-requests/${pendingRequests[0].id}/cancel`, { method: 'PUT' });
                    if (res.ok) {
                      setPendingRequests([]);
                    }
                  } catch {}
                }}
                className="shrink-0 rounded-lg border border-amber-300 dark:border-amber-700 px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
              >
                Cancel request
              </button>
            </div>
          </div>
        )}

        {loadingPlans ? (
          <div className="mt-10 flex justify-center py-16 text-muted-foreground"><Loader2 className="animate-spin" size={22} /></div>
         ) : (
           <div className="mt-10 flex flex-col md:flex-row gap-6">
             {plans.map((plan) => {
               const Icon = iconMap[plan.code] ?? Sparkles;
               const isPopular = plan.code === "PRO";
               const isAnnual = billing === "ANNUAL";
               const priceLabel = isAnnual ? plan.annualPriceLabel : plan.monthlyPriceLabel;
               const showAnnualNote = isAnnual && plan.annualDiscountPercent > 0;
               const isCurrent = user?.tier?.code === plan.code;
               const isLoading = checkoutCode === plan.code;
               const hasPending = pendingRequests.length > 0;
               const isPendingForThis = pendingRequests.some((r: any) => r.tier?.code === plan.code);

               return (
                 <div key={plan.code} className={cn("relative flex flex-col rounded-xl border shadow-sm transition-all bg-card flex-1", isPopular ? "border-primary ring-2 ring-primary/10" : "border-border")}>
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
                      <Button type="button" className="w-full" variant="secondary" disabled={isLoading || isCurrent || (hasPending && !!user)} onClick={() => {
                        if (!user || !user.tier) {
                          choosePlan(plan);
                        } else {
                          setConfirmPlan(plan);
                        }
                      }}>
                       {isLoading ? (
                         <><Loader2 size={16} className="animate-spin" /> Submitting...</>
                       ) : isCurrent ? (
                         "Current plan"
                       ) : hasPending && user ? (
                         isPendingForThis ? "Request pending" : "Pending request exists"
                       ) : !user ? (
                         plan.code === "FREE" ? "Get started free" : `Sign up for ${plan.name}`
                       ) : plan.code === "FREE" ? (
                         "Switch to Free"
                       ) : (
                         `Choose ${plan.name}`
                       )}
                     </Button>
                  </div>

                  {showAnnualNote && <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-green-500 px-3 py-0.5 text-xs font-bold text-white shadow-sm">{plan.annualDiscountPercent}% OFF</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upgrade Confirmation Dialog */}
      <Dialog open={!!confirmPlan} onOpenChange={(open) => { if (!open) setConfirmPlan(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-500" />
              Confirm Upgrade Request
            </DialogTitle>
            <DialogDescription>
              You are about to request an upgrade to{" "}
              <strong>{confirmPlan?.name}</strong> (
              {confirmPlan ? billing === "ANNUAL" ? confirmPlan.annualPriceLabel : confirmPlan.monthlyPriceLabel : ""}
              ).
              This will be reviewed by an admin. Do you wish to proceed?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="secondary" onClick={() => setConfirmPlan(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                const p = confirmPlan;
                setConfirmPlan(null);
                if (p) choosePlan(p);
              }}
            >
              Confirm Upgrade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
