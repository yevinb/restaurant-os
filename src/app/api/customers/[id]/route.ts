import { withTenant, json } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.enum(["VIP", "REGULAR", "INACTIVE"])).optional(),
});

export const GET = withTenant(async (req, ctx) => {
  const id = new URL(req.url).pathname.split("/").pop()!;

  const customer = await prisma.customer.findFirst({
    where: { id, restaurantId: ctx.restaurantId },
    include: {
      loyaltyAccount: {
        include: {
          transactions: { take: 20, orderBy: { createdAt: "desc" } },
        },
      },
      reservations: { orderBy: { date: "desc" }, include: { table: true } },
    },
  });

  if (!customer) return json({ error: "Not found" }, 404);
  return json(customer);
});

export const PATCH = withTenant(async (req, ctx) => {
  const id = new URL(req.url).pathname.split("/").pop()!;
  const body = await req.json();
  const data = updateSchema.parse(body);

  const existing = await prisma.customer.findFirst({
    where: { id, restaurantId: ctx.restaurantId },
  });
  if (!existing) return json({ error: "Not found" }, 404);

  const customer = await prisma.customer.update({
    where: { id },
    data: {
      ...data,
      email: data.email === "" ? null : data.email,
    },
  });

  return json(customer);
});

export const DELETE = withTenant(async (req, ctx) => {
  const id = new URL(req.url).pathname.split("/").pop()!;

  const existing = await prisma.customer.findFirst({
    where: { id, restaurantId: ctx.restaurantId },
  });
  if (!existing) return json({ error: "Not found" }, 404);

  await prisma.customer.delete({ where: { id } });
  return json({ success: true });
});
