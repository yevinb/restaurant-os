import { withTenant, json } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.enum(["VIP", "REGULAR", "INACTIVE"])).optional(),
});

export const GET = withTenant(async (req, ctx) => {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");
  const tag = searchParams.get("tag");

  const where: Record<string, unknown> = { restaurantId: ctx.restaurantId };

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
    ];
  }

  if (tag) where.tags = { has: tag };

  const customers = await prisma.customer.findMany({
    where,
    include: {
      loyaltyAccount: true,
      reservations: {
        take: 5,
        orderBy: { date: "desc" },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return json(customers);
});

export const POST = withTenant(async (req, ctx) => {
  const body = await req.json();
  const data = createSchema.parse(body);

  const customer = await prisma.customer.create({
    data: {
      restaurantId: ctx.restaurantId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email || null,
      phone: data.phone,
      notes: data.notes,
      tags: data.tags || ["REGULAR"],
    },
  });

  await prisma.loyaltyAccount.create({
    data: {
      restaurantId: ctx.restaurantId,
      customerId: customer.id,
    },
  });

  return json(customer, 201);
});
