import { Role, SubscriptionPlan, SubscriptionStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { prisma } from "./prisma";
import { getPlanLimits } from "./plans";

export class TenantError extends Error {
  constructor(
    message: string,
    public status: number = 403
  ) {
    super(message);
    this.name = "TenantError";
  }
}

export async function getSessionContext() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new TenantError("Unauthorized", 401);
  }

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
    include: {
      restaurant: {
        include: { subscription: true },
      },
    },
  });

  if (!membership) {
    throw new TenantError("No restaurant membership found", 403);
  }

  const plan =
    membership.restaurant.subscription?.plan ?? SubscriptionPlan.STARTER;
  const subscriptionStatus =
    membership.restaurant.subscription?.status ?? SubscriptionStatus.TRIALING;

  return {
    session,
    userId: session.user.id,
    restaurantId: membership.restaurantId,
    role: membership.role,
    restaurant: membership.restaurant,
    plan,
    subscriptionStatus,
    limits: getPlanLimits(plan),
  };
}

export function requireRole(role: Role, allowed: Role[]) {
  if (!allowed.includes(role)) {
    throw new TenantError("Insufficient permissions", 403);
  }
}

export function scopeToRestaurant<T extends { restaurantId?: string }>(
  restaurantId: string,
  data: T
): T & { restaurantId: string } {
  return { ...data, restaurantId };
}
