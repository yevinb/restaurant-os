import { withTenant, json } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  capacity: z.number().min(1).max(20).optional(),
  isActive: z.boolean().optional(),
});

export const PATCH = withTenant(async (req, ctx) => {
  const id = new URL(req.url).pathname.split("/").pop()!;
  const data = updateSchema.parse(await req.json());

  const existing = await prisma.table.findFirst({
    where: { id, restaurantId: ctx.restaurantId },
  });
  if (!existing) return json({ error: "Not found" }, 404);

  if (data.name && data.name !== existing.name) {
    const duplicate = await prisma.table.findFirst({
      where: {
        restaurantId: ctx.restaurantId,
        name: data.name,
        id: { not: id },
      },
    });
    if (duplicate) {
      return json({ error: "A table with this name already exists" }, 400);
    }
  }

  const table = await prisma.table.update({
    where: { id },
    data,
  });

  return json(table);
});

export const DELETE = withTenant(async (req, ctx) => {
  const id = new URL(req.url).pathname.split("/").pop()!;

  const existing = await prisma.table.findFirst({
    where: { id, restaurantId: ctx.restaurantId },
  });
  if (!existing) return json({ error: "Not found" }, 404);

  const activeReservation = await prisma.reservation.findFirst({
    where: {
      tableId: id,
      status: { in: ["PENDING", "CONFIRMED", "SEATED"] },
    },
  });
  if (activeReservation) {
    return json(
      {
        error:
          "Cannot delete a table with active reservations. Deactivate it instead.",
      },
      400
    );
  }

  await prisma.table.delete({ where: { id } });
  return json({ success: true });
});
