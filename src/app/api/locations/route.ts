import { NextResponse } from "next/server";
import { withTenant, json } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { canAccessFeature } from "@/lib/plans";
import { requireRole } from "@/lib/tenant";
import { getRegionDefaults } from "@/lib/regions";
import { z } from "zod";

export const GET = withTenant(async (_req, ctx) => {
  const orgId = ctx.restaurant.organizationId;
  if (!orgId) {
    return json({ locations: [ctx.restaurant], organization: null });
  }

  const organization = await prisma.organization.findUnique({
    where: { id: orgId },
    include: {
      restaurants: {
        select: { id: true, name: true, slug: true, address: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return json({
    organization,
    locations: organization?.restaurants ?? [ctx.restaurant],
    activeRestaurantId: ctx.restaurantId,
  });
});

const createSchema = z.object({
  name: z.string().min(2),
  address: z.string().optional(),
  country: z.enum(["GB", "KW"]).optional(),
});

export const POST = withTenant(async (req, ctx) => {
  requireRole(ctx.role, ["OWNER"]);
  if (!canAccessFeature(ctx.plan, "multiLocation")) {
    return json({ error: "Upgrade to Pro plan for multiple locations" }, 403);
  }

  const data = createSchema.parse(await req.json());
  const country = data.country ?? ctx.restaurant.country ?? "GB";
  const region = getRegionDefaults(country);

  let orgId = ctx.restaurant.organizationId;
  if (!orgId) {
    const org = await prisma.organization.create({
      data: {
        name: ctx.restaurant.name,
        ownerId: ctx.userId,
      },
    });
    orgId = org.id;
    await prisma.restaurant.update({
      where: { id: ctx.restaurantId },
      data: { organizationId: orgId },
    });
  }

  const slugBase = data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const restaurant = await prisma.$transaction(async (tx) => {
    const r = await tx.restaurant.create({
      data: {
        name: data.name,
        slug: `${slugBase}-${Date.now().toString(36)}`,
        address: data.address,
        organizationId: orgId!,
        timezone: region.timezone,
        currency: region.currency,
        locale: region.locale,
        country,
      },
    });

    await tx.membership.create({
      data: {
        userId: ctx.userId,
        restaurantId: r.id,
        role: "OWNER",
      },
    });

    await tx.subscription.create({
      data: {
        restaurantId: r.id,
        plan: ctx.plan,
        status: ctx.subscriptionStatus,
      },
    });

    await tx.loyaltyRule.create({
      data: {
        restaurantId: r.id,
        name: "Standard Rewards",
        pointsPerPound: 1,
        minSpend: 10,
      },
    });

    const tables = ["T1", "T2", "T3", "T4"];
    await tx.table.createMany({
      data: tables.map((name, i) => ({
        restaurantId: r.id,
        name,
        capacity: i % 2 === 0 ? 2 : 4,
      })),
    });

    for (let day = 0; day < 7; day++) {
      await tx.timeSlot.create({
        data: {
          restaurantId: r.id,
          dayOfWeek: day,
          startTime: "12:00",
          endTime: "14:30",
          maxCovers: 40,
        },
      });
      await tx.timeSlot.create({
        data: {
          restaurantId: r.id,
          dayOfWeek: day,
          startTime: "18:00",
          endTime: "22:00",
          maxCovers: 60,
        },
      });
    }

    return r;
  });

  return json(restaurant, 201);
});

export const PATCH = withTenant(async (req, ctx) => {
  const body = await req.json();
  const restaurantId = body.restaurantId as string;
  if (!restaurantId) {
    return json({ error: "restaurantId required" }, 400);
  }

  const membership = await prisma.membership.findFirst({
    where: { userId: ctx.userId, restaurantId },
  });
  if (!membership) {
    return json({ error: "No access to that location" }, 403);
  }

  const res = NextResponse.json({ success: true, restaurantId });
  res.cookies.set("activeRestaurantId", restaurantId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
});
