import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { stripe, getPlanFromPriceId } from "@/lib/stripe";
import { SubscriptionPlan, SubscriptionStatus } from "@prisma/client";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const restaurantId = session.metadata?.restaurantId;
      const plan = session.metadata?.plan as SubscriptionPlan;

      if (restaurantId && session.subscription) {
        const sub = await stripe.subscriptions.retrieve(
          session.subscription as string
        );
        await prisma.subscription.update({
          where: { restaurantId },
          data: {
            plan: plan || getPlanFromPriceId(sub.items.data[0].price.id),
            status: "ACTIVE",
            stripeSubscriptionId: sub.id,
            stripePriceId: sub.items.data[0].price.id,
            currentPeriodEnd: (() => {
              const periodEnd = sub.items.data[0]?.current_period_end;
              return periodEnd ? new Date(periodEnd * 1000) : undefined;
            })(),
          },
        });
      }
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const existing = await prisma.subscription.findFirst({
        where: { stripeSubscriptionId: sub.id },
      });
      if (existing) {
        const statusMap: Record<string, SubscriptionStatus> = {
          active: "ACTIVE",
          past_due: "PAST_DUE",
          canceled: "CANCELED",
          trialing: "TRIALING",
          incomplete: "INCOMPLETE",
        };
        await prisma.subscription.update({
          where: { id: existing.id },
          data: {
            status: statusMap[sub.status] || "ACTIVE",
            plan: getPlanFromPriceId(sub.items.data[0].price.id),
            currentPeriodEnd: (() => {
              const periodEnd = sub.items.data[0]?.current_period_end;
              return periodEnd ? new Date(periodEnd * 1000) : undefined;
            })(),
            cancelAtPeriodEnd: sub.cancel_at_period_end,
          },
        });
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await prisma.subscription.updateMany({
        where: { stripeSubscriptionId: sub.id },
        data: { status: "CANCELED" },
      });
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const subRef =
        (invoice as Stripe.Invoice & { subscription?: string | { id: string } | null })
          .subscription ??
        invoice.parent?.subscription_details?.subscription;
      const subscriptionId =
        typeof subRef === "string" ? subRef : subRef?.id ?? null;
      if (subscriptionId) {
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscriptionId },
          data: { status: "PAST_DUE" },
        });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
