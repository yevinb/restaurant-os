import Stripe from "stripe";
import { PLANS } from "./plans";

let stripeClient: Stripe | null = null;

export function isStripeConfigured() {
  const key = process.env.STRIPE_SECRET_KEY;
  return Boolean(key && key !== "sk_test_placeholder");
}

export function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key || key === "sk_test_placeholder") {
      throw new Error("Stripe is not configured");
    }
    stripeClient = new Stripe(key, {
      apiVersion: "2026-06-24.dahlia",
      typescript: true,
    });
  }
  return stripeClient;
}

export function getPlanFromPriceId(priceId: string) {
  for (const [key, plan] of Object.entries(PLANS)) {
    if (plan.priceId === priceId) return key as keyof typeof PLANS;
  }
  return "STARTER";
}
