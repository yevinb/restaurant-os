import { withTenant, json } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/tenant";
import { z } from "zod";

const updateSchema = z.object({
  dayOfWeek: z.number().min(0).max(6).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  maxCovers: z.number().min(1).max(500).optional(),
  isActive: z.boolean().optional(),
});

export const PATCH = withTenant(async (req, ctx) => {
  requireRole(ctx.role, ["OWNER", "MANAGER"]);
  const id = new URL(req.url).pathname.split("/").pop()!;
  const existing = await prisma.timeSlot.findFirst({
    where: { id, restaurantId: ctx.restaurantId },
  });
  if (!existing) return json({ error: "Not found" }, 404);

  const data = updateSchema.parse(await req.json());
  const slot = await prisma.timeSlot.update({ where: { id }, data });
  return json(slot);
});

export const DELETE = withTenant(async (req, ctx) => {
  requireRole(ctx.role, ["OWNER", "MANAGER"]);
  const id = new URL(req.url).pathname.split("/").pop()!;
  const existing = await prisma.timeSlot.findFirst({
    where: { id, restaurantId: ctx.restaurantId },
  });
  if (!existing) return json({ error: "Not found" }, 404);
  await prisma.timeSlot.delete({ where: { id } });
  return json({ success: true });
});
