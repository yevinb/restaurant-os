import { JWT } from "next-auth/jwt";
import { SubscriptionPlan, SubscriptionStatus } from "@prisma/client";
import { prisma } from "./prisma";

export async function enrichTokenWithMembership(
  token: JWT,
  userId: string,
  restaurantId?: string
) {
  const membership = await prisma.membership.findFirst({
    where: restaurantId ? { userId, restaurantId } : { userId },
    orderBy: restaurantId ? undefined : { createdAt: "asc" },
    select: {
      role: true,
      restaurantId: true,
      restaurant: {
        select: {
          id: true,
          name: true,
          slug: true,
          locale: true,
          currency: true,
          country: true,
          organizationId: true,
          subscription: {
            select: { plan: true, status: true },
          },
        },
      },
    },
  });

  if (!membership) return token;

  const restaurant = membership.restaurant;
  const subscription = restaurant.subscription;

  token.restaurantId = membership.restaurantId;
  token.role = membership.role;
  token.restaurantName = restaurant.name;
  token.restaurantSlug = restaurant.slug;
  token.organizationId = restaurant.organizationId;
  token.locale = restaurant.locale;
  token.currency = restaurant.currency;
  token.country = restaurant.country;
  token.plan = subscription?.plan ?? SubscriptionPlan.STARTER;
  token.subscriptionStatus =
    subscription?.status ?? SubscriptionStatus.TRIALING;

  return token;
}
