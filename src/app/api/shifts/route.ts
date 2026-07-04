import { withTenant, json } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { assertRestaurantMember } from "@/lib/membership";
import { requireRole } from "@/lib/tenant";
import { z } from "zod";

const shiftSchema = z.object({
  userId: z.string(),
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  role: z.enum(["SERVER", "HOST", "BARTENDER", "CHEF", "MANAGER"]),
  notes: z.string().optional(),
});

export const GET = withTenant(async (req, ctx) => {
  const { searchParams } = new URL(req.url);
  const weekStart = searchParams.get("weekStart");

  const where: Record<string, unknown> = { restaurantId: ctx.restaurantId };

  if (weekStart) {
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    where.date = { gte: start, lte: end };
  }

  const shifts = await prisma.shift.findMany({
    where,
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  return json({ shifts });
});

export const POST = withTenant(async (req, ctx) => {
  requireRole(ctx.role, ["OWNER", "MANAGER"]);
  const body = await req.json();
  const data = shiftSchema.parse(body);

  try {
    await assertRestaurantMember(ctx.restaurantId, data.userId);
  } catch {
    return json({ error: "Selected staff member is not on your team" }, 400);
  }

  const shift = await prisma.shift.create({
    data: {
      restaurantId: ctx.restaurantId,
      userId: data.userId,
      date: new Date(data.date),
      startTime: data.startTime,
      endTime: data.endTime,
      role: data.role,
      notes: data.notes,
    },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return json(shift, 201);
});
