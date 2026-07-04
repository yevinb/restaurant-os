import { SubscriptionPlan } from "@prisma/client";

export const PLANS = {
  STARTER: {
    id: "STARTER" as SubscriptionPlan,
    name: "Starter",
    price: 99,
    priceId: process.env.STRIPE_STARTER_PRICE_ID || "price_starter",
    features: [
      "Up to 100 reservations/month",
      "Basic CRM",
      "Email support",
      "1 location",
    ],
    limits: {
      reservationsPerMonth: 100,
      campaigns: 2,
      staff: 5,
      aiAssistant: false,
      loyalty: false,
      marketing: false,
      analytics: "basic",
    },
  },
  GROWTH: {
    id: "GROWTH" as SubscriptionPlan,
    name: "Growth",
    price: 199,
    priceId: process.env.STRIPE_GROWTH_PRICE_ID || "price_growth",
    features: [
      "Unlimited reservations",
      "Full CRM + Loyalty",
      "Marketing campaigns",
      "Analytics dashboard",
      "Priority support",
    ],
    limits: {
      reservationsPerMonth: Infinity,
      campaigns: 20,
      staff: 20,
      aiAssistant: false,
      loyalty: true,
      marketing: true,
      analytics: "full",
    },
  },
  PRO: {
    id: "PRO" as SubscriptionPlan,
    name: "Pro",
    price: 499,
    priceId: process.env.STRIPE_PRO_PRICE_ID || "price_pro",
    features: [
      "Everything in Growth",
      "AI Assistant",
      "Advanced analytics",
      "Automation rules",
      "Dedicated support",
      "Multi-location ready",
    ],
    limits: {
      reservationsPerMonth: Infinity,
      campaigns: Infinity,
      staff: Infinity,
      aiAssistant: true,
      loyalty: true,
      marketing: true,
      analytics: "advanced",
    },
  },
} as const;

export type PlanKey = keyof typeof PLANS;

export function getPlanLimits(plan: SubscriptionPlan = "STARTER") {
  return PLANS[plan]?.limits ?? PLANS.STARTER.limits;
}

export function canAccessFeature(
  plan: SubscriptionPlan,
  feature: keyof (typeof PLANS)["STARTER"]["limits"]
) {
  const limits = getPlanLimits(plan);
  const value = limits[feature];
  if (feature === "analytics") {
    return value !== false && value != null;
  }
  return Boolean(value);
}
