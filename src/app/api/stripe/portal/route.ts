import { withTenant, json } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { requireRole } from "@/lib/tenant";

const isLocalBilling =
  process.env.NODE_ENV !== "production" &&
  (!process.env.STRIPE_SECRET_KEY ||
    process.env.STRIPE_SECRET_KEY === "sk_test_placeholder");

export const POST = withTenant(async (_req, ctx) => {
  requireRole(ctx.role, ["OWNER"]);

  if (isLocalBilling) {
    const subscription = await prisma.subscription.findUnique({
      where: { restaurantId: ctx.restaurantId },
    });
    return json({
      success: true,
      message: `You're on the ${ctx.plan.toLowerCase()} plan. Change plans anytime using the buttons below.`,
      currentPlan: ctx.plan,
      renewsAt: subscription?.currentPeriodEnd,
    });
  }

  const subscription = await prisma.subscription.findUnique({
    where: { restaurantId: ctx.restaurantId },
  });

  if (!subscription?.stripeCustomerId) {
    return json({ error: "No billing account found" }, 400);
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: `${process.env.NEXTAUTH_URL}/dashboard/billing`,
  });

  return json({ url: session.url });
});
