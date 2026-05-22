"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CreditCard,
  Check,
  X,
  Tag,
  Loader2,
  Sparkles,
  Zap,
  Code2,
  Percent,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  code: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceAnnual: number;
  maxLinks: number | null;
  features: string[];
  annualDiscountPercent: number;
  monthlyPriceFormatted: string;
  annualPriceFormatted: string;
  monthlyPriceLabel: string;
  annualPriceLabel: string;
};

type SubInfo = {
  id: string;
  tierCode: string;
  tierName: string;
  status: string;
  billingCycle: string;
  currentPeriodEnd: string;
} | null;

const iconMap: Record<string, typeof Sparkles> = {
  FREE: Sparkles,
  PRO: Zap,
  DEVELOPER: Code2,
};

export default function PlansPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<SubInfo>(null);
  const [billing, setBilling] = useState<"MONTHLY" | "ANNUAL">("MONTHLY");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(
    null,
  );
  const [couponStatus, setCouponStatus] = useState<{
    valid: boolean;
    message: string;
    discountPercent?: number;
  } | null>(null);
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  const [upgradingCode, setUpgradingCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmPlan, setConfirmPlan] = useState<Plan | null>(null);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loadingPending, setLoadingPending] = useState(true);
  const autoCheckoutKey = useRef<string | null>(null);
  const hasFetchedPendingRef = useRef(false);

  const loadPendingRequests = useCallback(async (force = false) => {
    if (!force && hasFetchedPendingRef.current) return;

    hasFetchedPendingRef.current = true;

    try {
      const res = await fetch("/api/upgrade-requests", { cache: "no-store" });
      if (res.status === 429) {
        // Rate limited — we still want to show the banner if possible
        setLoadingPending(false);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        const pending = (Array.isArray(data) ? data : data.requests || []).filter(
          (r: any) => r.status === "PENDING"
        );
        setPendingRequests(pending);
      }
    } catch {}
    setLoadingPending(false);
  }, []);

  const requestUpgrade = useCallback(async (tierCode: string) => {
    if (pendingRequests.length > 0) {
      setError("You already have a pending upgrade request. Please wait for admin review before requesting another plan.");
      return;
    }

    setError(null);
    setUpgradingCode(tierCode);
    try {
      const res = await fetch("/api/upgrade-requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tierCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Request failed");
        setUpgradingCode(null);
        return;
      }
      setError(null);

      // Optimistic update — avoid extra GET that triggers 429 rate limit
      const planName = plans.find(p => p.code === tierCode)?.name || tierCode;
      const optimistic = {
        id: 'temp-' + Date.now(),
        status: 'PENDING',
        tier: { name: planName, code: tierCode },
        createdAt: new Date().toISOString(),
      };
      setPendingRequests([optimistic]);

      setUpgradingCode(null);
    } catch (err: any) {
      setError(err.message ?? "Unexpected error");
      setUpgradingCode(null);
    }
  }, [pendingRequests, loadPendingRequests]);

  // Check URL for payment status on mount
  useEffect(() => {
    loadPendingRequests(true); // force initial load

    const requestedTier = searchParams.get("tier");
    const requestedBilling = searchParams.get("billing");
    if (requestedBilling === "MONTHLY" || requestedBilling === "ANNUAL") {
      setBilling(requestedBilling);
    }
    const checkoutStatus = searchParams.get("checkout");
    if (checkoutStatus === "success" || checkoutStatus === "cancelled") {
      // Refresh subscription to reflect latest state
      fetch("/api/subscriptions/current", { cache: "no-store" })
        .then((r) => r.json())
        .then(setSubscription)
        .catch(() => {});
    }
    if ((requestedTier === "PRO" || requestedTier === "DEVELOPER") && checkoutStatus !== "success" && checkoutStatus !== "cancelled") {
      const checkoutKey = `${requestedTier}`;
      if (autoCheckoutKey.current !== checkoutKey) {
        autoCheckoutKey.current = checkoutKey;
        window.setTimeout(() => requestUpgrade(requestedTier), 0);
      }
    }
  }, [searchParams, requestUpgrade, loadPendingRequests]);

  useEffect(() => {
    fetch("/api/plans", { cache: "no-store" })
      .then((r) => r.json())
      .then((plansData) => {
        setPlans(plansData);
        return fetch("/api/subscriptions/current", { cache: "no-store" });
      })
      .then((r) => r.json())
      .then((subData) => {
        if (subData && subData.id) setSubscription(subData);
      })
      .catch(() => {});
  }, []);

  async function checkCoupon() {
    if (!couponCode.trim()) return;
    setCheckingCoupon(true);
    setCouponStatus(null);
    const res = await fetch("/api/coupons/redeem", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: couponCode.trim() }),
    });
    const data = await res.json();
    setCouponStatus(data);
    if (data.valid) {
      setAppliedCouponCode(couponCode.trim());
      setCouponCode("");
    }
    setCheckingCoupon(false);
  }

  const currentTierCode = subscription?.tierCode ?? "FREE";
  const isCurrent = (code: string) => currentTierCode === code;

  function formatPrice(priceCents: number, discountPercent: number) {
    const discounted =
      priceCents - Math.round((priceCents * discountPercent) / 100);
    const dollars = discounted / 100;
    if (discounted === 0) return "$0";
    if (dollars >= 1) return `$${dollars.toFixed(0)}`;
    return `$${dollars.toFixed(2)}`;
  }

  function formatOriginalPrice(priceCents: number) {
    const dollars = priceCents / 100;
    if (priceCents === 0) return "$0";
    if (dollars >= 1) return `$${dollars.toFixed(0)}`;
    return `$${dollars.toFixed(2)}`;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="mt-4 text-2xl font-bold tracking-tight">
          Choose your plan
        </h1>
        <p className="mt-2 text-muted-foreground">
          Upgrade to unlock unlimited links, custom domains, and developer
          features.
        </p>
      </div>

      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => setBilling("MONTHLY")}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            billing === "MONTHLY"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Monthly
        </button>
        <button
          type="button"
          onClick={() => setBilling("ANNUAL")}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            billing === "ANNUAL"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Annual
          <span className="ml-1.5 rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
            Save up to 23%
          </span>
        </button>
      </div>

      {/* Pending Upgrade Request Status Banner */}
      {!loadingPending && pendingRequests.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30 p-4 text-sm">
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
      )}

      {/* Plans Grid */}
      <div className="grid gap-6 lg:grid-cols-3 px-4 -mx-4">
        {plans.map((plan) => {
          const Icon = iconMap[plan.code] ?? Sparkles;
          const isPro = plan.code === "PRO";
          const price =
            billing === "ANNUAL"
              ? plan.annualPriceLabel
              : plan.monthlyPriceLabel;
          const rawPrice =
            billing === "ANNUAL" ? plan.priceAnnual : plan.priceMonthly;
           const current = isCurrent(plan.code);
           const loading = upgradingCode === plan.code;
           const hasPending = pendingRequests.length > 0;
           const isPendingForThisPlan = pendingRequests.some((r: any) => r.tier?.code === plan.code);

          let effectiveDiscount = 0;
          if (billing === "ANNUAL")
            effectiveDiscount = plan.annualDiscountPercent;
          if (couponStatus?.valid)
            effectiveDiscount = Math.max(
              effectiveDiscount,
              couponStatus.discountPercent ?? 0,
            );

          return (
            <div
              key={plan.code}
              className={cn(
                "relative flex flex-col rounded-xl border shadow-sm transition-all",
                current
                  ? "border-border"
                  : isPro || plan.code === "DEVELOPER"
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-border",
              )}
            >
              {isPro && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-0.5 text-xs font-bold text-primary-foreground">
                  Popular
                </span>
              )}
              {current && (
                <span className="absolute top-3 right-3 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  Current
                </span>
              )}

              <div className="p-6 flex-1">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg",
                      plan.code === "FREE"
                        ? "bg-muted"
                        : plan.code === "PRO"
                          ? "bg-primary/10"
                          : "bg-purple-100 dark:bg-purple-900/30",
                    )}
                  >
                    <Icon
                      size={16}
                      className={cn(
                        plan.code === "FREE"
                          ? "text-muted-foreground"
                          : plan.code === "PRO"
                            ? "text-primary"
                            : "text-purple-600 dark:text-purple-400",
                      )}
                    />
                  </div>
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {plan.description}
                </p>

                <div className="mt-4">
                  <div className="flex items-baseline gap-1">
                    {couponStatus?.valid && plan.code !== "FREE" ? (
                      <>
                        <span className="text-lg font-bold text-muted-foreground line-through">
                          {billing === "ANNUAL"
                            ? plan.annualPriceFormatted
                            : plan.monthlyPriceFormatted}
                        </span>
                        <span className="text-3xl font-bold ml-1">
                          {formatPrice(rawPrice, effectiveDiscount)}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          /{billing === "ANNUAL" ? "yr" : "mo"}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-3xl font-bold">
                          {price === "Free" ? "$0" : price}
                        </span>
                        {plan.code !== "FREE"}
                      </>
                    )}
                  </div>
                  {billing === "ANNUAL" && plan.annualDiscountPercent > 0 && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                      Save {plan.annualDiscountPercent}% vs monthly
                    </p>
                  )}
                  {billing === "MONTHLY" && plan.priceMonthly > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      ${(plan.priceAnnual / 100).toFixed(0)} billed annually
                    </p>
                  )}
                </div>

                <ul className="mt-5 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check
                        size={15}
                        className="mt-0.5 shrink-0 text-primary"
                      />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

               <div className="p-6 pt-0">
                 <Button
                   className="w-full"
                   variant={current ? "secondary" : "primary"}
                    disabled={current || loading || hasPending}
                    onClick={() => setConfirmPlan(plan)}
                 >
                   {loading ? (
                     <>
                       <Loader2 size={16} className="animate-spin" />{" "}
                       Submitting…
                     </>
                   ) : current ? (
                     "Current plan"
                   ) : hasPending ? (
                     isPendingForThisPlan ? "Request pending" : "Pending request exists"
                   ) : plan.code === "FREE" ? (
                     `Switch to ${plan.name}`
                   ) : (
                     `Upgrade to ${plan.name}`
                   )}
                 </Button>
               </div>

              {/* Discount badge on price */}
              {effectiveDiscount > 0 && !current && (
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-green-500 px-3 py-0.5 text-xs font-bold text-white shadow-sm">
                  {effectiveDiscount}% OFF
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Coupon / Redeem Code */}
      <div className="-mx-4 px-4">
        <div className="rounded-xl border border-border bg-card shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <Tag size={16} className="text-muted-foreground" />
            <h3 className="text-sm font-semibold">Redeem Code</h3>
          </div>
          {appliedCouponCode ? (
            <div className="flex items-center justify-between rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3">
              <div className="flex items-center gap-2">
                <Percent size={14} className="text-green-600" />
                <span className="text-sm font-medium text-green-700 dark:text-green-400">
                  {appliedCouponCode} applied ({couponStatus?.discountPercent}%
                  off)
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setAppliedCouponCode(null);
                  setCouponStatus(null);
                }}
                className="h-6 px-2 text-xs"
              >
                Clear
              </Button>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <Input
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value);
                    setCouponStatus(null);
                  }}
                  placeholder="Enter promo code"
                />
                <Button
                  variant="secondary"
                  onClick={checkCoupon}
                  disabled={checkingCoupon || !couponCode.trim()}
                  className="w-full"
                >
                  {checkingCoupon ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Tag size={14} />
                  )}
                  Apply
                </Button>
              </div>
              {couponStatus && (
                <div
                  className={cn(
                    "mt-2 flex items-center gap-1.5 text-sm",
                    couponStatus.valid ? "text-green-600" : "text-red-600",
                  )}
                >
                  {couponStatus.valid ? <Check size={14} /> : <X size={14} />}
                  {couponStatus.message}
                </div>
              )}
            </>
          )}
          {error && <div className="mt-2 text-sm text-red-600">{error}</div>}

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
                const code = confirmPlan?.code;
                setConfirmPlan(null);
                if (code) requestUpgrade(code);
              }}
            >
              Confirm Upgrade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
          {subscription && subscription.billingCycle && (
            <div className="mt-3 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              Current plan:{" "}
              <span className="font-medium text-foreground">
                {subscription.tierName}
              </span>{" "}
              &middot;{" "}
              {subscription.billingCycle === "ANNUAL" ? "Annual" : "Monthly"}{" "}
              billing &middot; Renews{" "}
              {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
