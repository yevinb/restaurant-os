import {
  Role,
  SubscriptionPlan,
  SubscriptionStatus,
} from "@prisma/client";
import { cookies } from "next/headers";
import { getServerSession, Session } from "next-auth";
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

function buildRestaurantFromSession(session: Session, restaurantId: string) {
  return {
    id: restaurantId,
    name: session.user.restaurantName ?? "",
    slug: "",
    locale: session.user.locale ?? "en",
    currency: session.user.currency ?? "GBP",
    country: session.user.country ?? "GB",
    organizationId: session.user.organizationId ?? null,
    subscription: {
      plan: session.user.plan ?? SubscriptionPlan.STARTER,
      status: SubscriptionStatus.TRIALING,
    },
  };
}

export async function getSessionContext() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new TenantError("Unauthorized", 401);
  }

  const cookieStore = await cookies();
  const activeRestaurantId = cookieStore.get("activeRestaurantId")?.value;
  const defaultRestaurantId = session.user.restaurantId;

  if (!defaultRestaurantId && !activeRestaurantId) {
    throw new TenantError("No restaurant membership found", 403);
  }

  const restaurantId = activeRestaurantId ?? defaultRestaurantId!;

  if (
    !activeRestaurantId ||
    activeRestaurantId === defaultRestaurantId
  ) {
    const plan = session.user.plan ?? SubscriptionPlan.STARTER;
    return {
      session,
      userId: session.user.id,
      restaurantId,
      role: session.user.role ?? Role.STAFF,
      restaurant: buildRestaurantFromSession(session, restaurantId),
      plan,
      subscriptionStatus: SubscriptionStatus.TRIALING,
      limits: getPlanLimits(plan),
    };
  }

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, restaurantId: activeRestaurantId },
    select: {
      role: true,
      restaurant: {
        select: {
          id: true,
          name: true,
          slug: true,
          locale: true,
          currency: true,
          country: true,
          organizationId: true,
          subscription: { select: { plan: true, status: true } },
        },
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
    restaurantId: membership.restaurant.id,
    role: membership.role,
    restaurant: {
      ...membership.restaurant,
      subscription: membership.restaurant.subscription ?? {
        plan: SubscriptionPlan.STARTER,
        status: SubscriptionStatus.TRIALING,
      },
    },
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
