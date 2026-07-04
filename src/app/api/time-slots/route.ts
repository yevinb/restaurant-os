import { withTenant, json } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/tenant";
import { z } from "zod";

const slotSchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  maxCovers: z.number().min(1).max(500),
  isActive: z.boolean().optional(),
});

export const GET = withTenant(async (_req, ctx) => {
  const slots = await prisma.timeSlot.findMany({
    where: { restaurantId: ctx.restaurantId },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
  return json(slots);
});

export const POST = withTenant(async (req, ctx) => {
  requireRole(ctx.role, ["OWNER", "MANAGER"]);
  const data = slotSchema.parse(await req.json());
  const slot = await prisma.timeSlot.create({
    data: { restaurantId: ctx.restaurantId, ...data, isActive: data.isActive ?? true },
  });
  return json(slot, 201);
});
