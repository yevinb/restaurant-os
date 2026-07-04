import { withTenant, json } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/tenant";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  capacity: z.number().min(1).max(20),
});

export const GET = withTenant(async (req, ctx) => {
  const { searchParams } = new URL(req.url);
  const activeOnly = searchParams.get("active") === "true";

  const tables = await prisma.table.findMany({
    where: {
      restaurantId: ctx.restaurantId,
      ...(activeOnly ? { isActive: true } : {}),
    },
    orderBy: { name: "asc" },
  });
  return json(tables);
});

export const POST = withTenant(async (req, ctx) => {
  requireRole(ctx.role, ["OWNER", "MANAGER"]);
  const data = createSchema.parse(await req.json());

  const existing = await prisma.table.findFirst({
    where: { restaurantId: ctx.restaurantId, name: data.name },
  });
  if (existing) {
    return json({ error: "A table with this name already exists" }, 400);
  }

  const table = await prisma.table.create({
    data: {
      restaurantId: ctx.restaurantId,
      name: data.name,
      capacity: data.capacity,
    },
  });

  return json(table, 201);
});
