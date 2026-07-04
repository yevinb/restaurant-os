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
      analytics: false,
      multiLocation: false,
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
      multiLocation: false,
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
      multiLocation: true,
    },
  },
} as const;

export type PlanKey = keyof typeof PLANS;

/** Hardcoded off for testing — set to true and redeploy when ready to lock by plan. */
export const PLAN_GATES_ENABLED = false;

export function getPlanLimits(plan: SubscriptionPlan = "STARTER") {
  void plan;
  return PLANS.PRO.limits;
}

export function canAccessFeature(
  plan: SubscriptionPlan,
  feature: keyof (typeof PLANS)["STARTER"]["limits"]
) {
  void plan;
  void feature;
  return true;
}
