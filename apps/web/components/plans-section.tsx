"use client";

import { useState } from "react";
import { Check, Sparkles, Zap, Code2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const tierConfig = [
  {
    code: "FREE",
    name: "Free",
    icon: Sparkles,
    monthlyPrice: 0,
    annualPrice: 0,
    monthlyLabel: "Free",
    annualLabel: "Free",
    description: "Perfect for starters",
    features: [
      "5 links per month",
      "QR codes",
      "Basic analytics",
      "Password protection",
    ],
    popular: false,
  },
  {
    code: "PRO",
    name: "Pro",
    icon: Zap,
    monthlyPrice: 1300,
    annualPrice: 12000,
    monthlyLabel: "$13/mo",
    annualLabel: "$120/yr",
    description: "For power users",
    features: [
      "Unlimited links",
      "Advanced analytics",
      "Priority support",
      "Expiration controls",
    ],
    popular: true,
    annualDiscount: 23,
  },
  {
    code: "DEVELOPER",
    name: "Developer",
    icon: Code2,
    monthlyPrice: 2900,
    annualPrice: 28000,
    monthlyLabel: "$29/mo",
    annualLabel: "$280/yr",
    description: "API-first workflow",
    features: [
      "Unlimited API keys",
      "External shorten API",
      "Team-ready limits",
      "Priority support",
    ],
    popular: false,
    annualDiscount: 20,
  },
];

export function PlansSection() {
  const [billing, setBilling] = useState<"MONTHLY" | "ANNUAL">("MONTHLY");

  return (
    <section
      id="plans"
      className="border-t border-border bg-[hsl(var(--muted)/0.65)] px-6 py-20"
    >
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold">Choose your Plan</h2>
          <p className="mt-3 text-lg text-muted-foreground">
            Start small, then unlock unlimited links or developer access.
          </p>
        </div>

        {/* Billing Toggle - same as dashboard */}
        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            onClick={() => setBilling("MONTHLY")}
            className={cn(
              "rounded-lg px-5 py-2 text-sm font-medium transition-colors",
              billing === "MONTHLY"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling("ANNUAL")}
            className={cn(
              "rounded-lg px-5 py-2 text-sm font-medium transition-colors",
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

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {tierConfig.map((plan) => {
            const Icon = plan.icon;
            const isPopular = plan.popular;
            const isAnnual = billing === "ANNUAL";
            const priceLabel = isAnnual ? plan.annualLabel : plan.monthlyLabel;
            const rawPrice = isAnnual ? plan.annualPrice : plan.monthlyPrice;
            const showAnnualNote = isAnnual && plan.annualDiscount;

            return (
              <div
                key={plan.code}
                className={cn(
                  "relative flex flex-col rounded-xl border shadow-sm transition-all bg-[hsl(var(--card))]",
                  isPopular
                    ? "border-primary ring-2 ring-primary/10"
                    : "border-border",
                )}
              >
                {isPopular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-0.5 text-xs font-bold text-primary-foreground">
                    Popular
                  </span>
                )}

                <div className="p-7 flex-1">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-lg",
                        plan.code === "FREE"
                          ? "bg-muted"
                          : plan.code === "PRO"
                            ? "bg-primary/10"
                            : "bg-purple-100 dark:bg-purple-900/30",
                      )}
                    >
                      <Icon
                        size={18}
                        className={cn(
                          plan.code === "FREE"
                            ? "text-muted-foreground"
                            : plan.code === "PRO"
                              ? "text-primary"
                              : "text-purple-600 dark:text-purple-400",
                        )}
                      />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{plan.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {plan.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold">{priceLabel}</span>
                      {plan.code !== "FREE" && (
                        <span className="text-sm text-muted-foreground">
                          /{isAnnual ? "yr" : "mo"}
                        </span>
                      )}
                    </div>

                    {showAnnualNote && (
                      <p className="mt-0.5 text-xs text-green-600 dark:text-green-400">
                        Save {plan.annualDiscount}% vs monthly
                      </p>
                    )}
                    {!isAnnual && plan.monthlyPrice > 0 && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        ${(plan.annualPrice / 100).toFixed(0)} billed annually
                      </p>
                    )}
                  </div>

                  <ul className="mt-6 space-y-2.5">
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

                <div className={cn("p-7 pt-0", isPopular && "pb-8")}>
                  <Button
                    asChild
                    className="w-full"
                    variant={isPopular ? "secondary" : "secondary"}
                  >
                    <Link href="/sign-up">
                      {plan.code === "FREE"
                        ? "Get started free"
                        : `Choose ${plan.name}`}
                    </Link>
                  </Button>
                </div>

                {/* Discount badge */}
                {isAnnual && plan.annualDiscount && (
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-green-500 px-3 py-0.5 text-xs font-bold text-white shadow-sm">
                    {plan.annualDiscount}% OFF
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
