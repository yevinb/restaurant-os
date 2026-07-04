import { withTenant, json } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/tenant";
import { z } from "zod";

export const GET = withTenant(async (_req, ctx) => {
  requireRole(ctx.role, ["OWNER", "MANAGER"]);
  const events = await prisma.integrationEvent.findMany({
    where: { restaurantId: ctx.restaurantId },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: ctx.restaurantId },
    select: {
      webhookUrl: true,
      posProvider: true,
    },
  });

  return json({
    webhookUrl: restaurant?.webhookUrl ?? "",
    posProvider: restaurant?.posProvider ?? "",
    events,
    supportedProviders: ["square", "toast", "lightspeed", "custom"],
  });
});

const updateSchema = z.object({
  webhookUrl: z.string().optional().nullable(),
  webhookSecret: z.string().optional(),
  posProvider: z.string().optional(),
});

export const PATCH = withTenant(async (req, ctx) => {
  requireRole(ctx.role, ["OWNER", "MANAGER"]);
  const data = updateSchema.parse(await req.json());

  const restaurant = await prisma.restaurant.update({
    where: { id: ctx.restaurantId },
    data: {
      webhookUrl:
        data.webhookUrl === "" || data.webhookUrl === null
          ? null
          : data.webhookUrl,
      webhookSecret: data.webhookSecret || undefined,
      posProvider: data.posProvider || null,
    },
    select: { webhookUrl: true, posProvider: true },
  });

  return json(restaurant);
});
