import { withTenant, json } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  timezone: z.string().optional(),
});

export const GET = withTenant(async (_req, ctx) => {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: ctx.restaurantId },
    include: {
      subscription: true,
      memberships: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  });
  return json(restaurant);
});

export const PATCH = withTenant(async (req, ctx) => {
  const body = await req.json();
  const data = updateSchema.parse(body);

  const restaurant = await prisma.restaurant.update({
    where: { id: ctx.restaurantId },
    data,
  });

  return json(restaurant);
});
