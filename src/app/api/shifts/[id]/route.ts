import { withTenant, json } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { assertRestaurantMember } from "@/lib/membership";
import { requireRole } from "@/lib/tenant";
import { z } from "zod";

const updateSchema = z.object({
  userId: z.string().optional(),
  date: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  role: z.enum(["SERVER", "HOST", "BARTENDER", "CHEF", "MANAGER"]).optional(),
  notes: z.string().optional(),
});

export const PATCH = withTenant(async (req, ctx) => {
  requireRole(ctx.role, ["OWNER", "MANAGER"]);
  const id = new URL(req.url).pathname.split("/").pop()!;
  const body = await req.json();
  const data = updateSchema.parse(body);

  const existing = await prisma.shift.findFirst({
    where: { id, restaurantId: ctx.restaurantId },
  });
  if (!existing) return json({ error: "Not found" }, 404);

  if (data.userId) {
    try {
      await assertRestaurantMember(ctx.restaurantId, data.userId);
    } catch {
      return json({ error: "Selected staff member is not on your team" }, 400);
    }
  }

  const shift = await prisma.shift.update({
    where: { id },
    data: {
      ...data,
      date: data.date ? new Date(data.date) : undefined,
    },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return json(shift);
});

export const DELETE = withTenant(async (req, ctx) => {
  requireRole(ctx.role, ["OWNER", "MANAGER"]);
  const id = new URL(req.url).pathname.split("/").pop()!;

  const existing = await prisma.shift.findFirst({
    where: { id, restaurantId: ctx.restaurantId },
  });
  if (!existing) return json({ error: "Not found" }, 404);

  await prisma.shift.delete({ where: { id } });
  return json({ success: true });
});
