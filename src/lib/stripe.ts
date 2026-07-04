import Stripe from "stripe";
import { PLANS } from "./plans";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-06-24.dahlia",
  typescript: true,
});

export function getPlanFromPriceId(priceId: string) {
  for (const [key, plan] of Object.entries(PLANS)) {
    if (plan.priceId === priceId) return key as keyof typeof PLANS;
  }
  return "STARTER";
}
