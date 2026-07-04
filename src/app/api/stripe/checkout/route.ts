import { withTenant, json } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { PLANS, PlanKey } from "@/lib/plans";
import { requireRole } from "@/lib/tenant";
import { SubscriptionPlan } from "@prisma/client";

const isDemoStripe =
  process.env.NODE_ENV !== "production" &&
  (!process.env.STRIPE_SECRET_KEY ||
    process.env.STRIPE_SECRET_KEY === "sk_test_placeholder");

export const GET = withTenant(async (_req, ctx) => {
  const subscription = await prisma.subscription.findUnique({
    where: { restaurantId: ctx.restaurantId },
  });
  return json({ subscription, plans: PLANS, currentPlan: ctx.plan });
});

export const POST = withTenant(async (req, ctx) => {
  requireRole(ctx.role, ["OWNER"]);

  const { plan } = await req.json();
  const planConfig = PLANS[plan as PlanKey];
  if (!planConfig) return json({ error: "Invalid plan" }, 400);

  if (isDemoStripe) {
    await prisma.subscription.upsert({
      where: { restaurantId: ctx.restaurantId },
      create: {
        restaurantId: ctx.restaurantId,
        plan: plan as SubscriptionPlan,
        status: "ACTIVE",
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      update: {
        plan: plan as SubscriptionPlan,
        status: "ACTIVE",
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    return json({
      success: true,
      message: `Upgraded to ${planConfig.name} plan successfully!`,
    });
  }

  if (
    !process.env.STRIPE_SECRET_KEY ||
    process.env.STRIPE_SECRET_KEY === "sk_test_placeholder"
  ) {
    return json({ error: "Billing is not configured. Contact support." }, 503);
  }

  let subscription = await prisma.subscription.findUnique({
    where: { restaurantId: ctx.restaurantId },
  });

  if (!subscription) {
    subscription = await prisma.subscription.create({
      data: { restaurantId: ctx.restaurantId },
    });
  }

  let customerId = subscription.stripeCustomerId;

  if (!customerId) {
    const customer = await getStripe().customers.create({
      email: ctx.session.user?.email || undefined,
      name: ctx.restaurant.name,
      metadata: { restaurantId: ctx.restaurantId },
    });
    customerId = customer.id;
    await prisma.subscription.update({
      where: { restaurantId: ctx.restaurantId },
      data: { stripeCustomerId: customerId },
    });
  }

  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: planConfig.priceId, quantity: 1 }],
    success_url: `${process.env.NEXTAUTH_URL}/dashboard/billing?success=true`,
    cancel_url: `${process.env.NEXTAUTH_URL}/dashboard/billing?canceled=true`,
    metadata: {
      restaurantId: ctx.restaurantId,
      plan,
    },
  });

  return json({ url: session.url });
});
