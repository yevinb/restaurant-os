import { DefaultSession } from "next-auth";
import { Role, SubscriptionPlan } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: Role;
      restaurantId?: string;
      restaurantName?: string;
      plan?: SubscriptionPlan;
      locale?: string;
      currency?: string;
      organizationId?: string | null;
      country?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    restaurantId?: string;
    role?: Role;
    restaurantName?: string;
    restaurantSlug?: string;
    organizationId?: string | null;
    locale?: string;
    currency?: string;
    country?: string;
    plan?: SubscriptionPlan;
    subscriptionStatus?: string;
  }
}

export {};
