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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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
  const autoCheckoutKey = useRef<string | null>(null);

  const startCheckout = useCallback(async (tierCode: string, billingCycle = billing) => {
    setError(null);
    setUpgradingCode(tierCode);
    try {
      const res = await fetch("/api/subscriptions/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tierCode,
          billingCycle,
          couponCode: appliedCouponCode,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Checkout init failed");
        setUpgradingCode(null);
        return;
      }

      if (data.immediate) {
        const subRes = await fetch("/api/subscriptions/current", {
          cache: "no-store",
        });
        const subData = await subRes.json();
        if (subData?.id) setSubscription(subData);
        setAppliedCouponCode(null);
        setCouponStatus(null);
        setUpgradingCode(null);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        setError("No checkout URL returned. Please try again.");
        setUpgradingCode(null);
      }
    } catch (err: any) {
      setError(err.message ?? "Unexpected error");
      setUpgradingCode(null);
    }
  }, [appliedCouponCode, billing]);

  // Check URL for payment status on mount
  useEffect(() => {
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
      const requestedCycle = requestedBilling === "ANNUAL" ? "ANNUAL" : "MONTHLY";
      const checkoutKey = `${requestedTier}:${requestedCycle}`;
      if (autoCheckoutKey.current !== checkoutKey) {
        autoCheckoutKey.current = checkoutKey;
        window.setTimeout(() => startCheckout(requestedTier, requestedCycle), 0);
      }
    }
  }, [searchParams, startCheckout]);

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
                isPro || plan.code === "DEVELOPER"
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-border",
                current ? "ring-2 ring-primary/10" : "",
                plan.code === "DEVELOPER" ? "" : "",
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
                  disabled={current || loading}
                  onClick={() => startCheckout(plan.code)}
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />{" "}
                      Redirecting…
                    </>
                  ) : current ? (
                    "Current plan"
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
