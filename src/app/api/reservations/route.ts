import { withTenant, json } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getMonthlyReservationCount } from "@/lib/reservations";
import {
  assertTableInRestaurant,
} from "@/lib/validators";
import { z } from "zod";

const createSchema = z
  .object({
    customerId: z.string().optional(),
    newGuest: z
      .object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        email: z.string().email().optional().or(z.literal("")),
        phone: z.string().optional(),
      })
      .optional(),
    tableId: z.string().optional(),
    date: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    partySize: z.number().min(1).max(20),
    status: z
      .enum(["PENDING", "CONFIRMED", "SEATED", "COMPLETED", "CANCELLED"])
      .optional(),
    notes: z.string().optional(),
    spendAmount: z.number().optional(),
  })
  .refine((d) => d.customerId || d.newGuest, {
    message: "Select a customer or add a new guest",
  });

export const GET = withTenant(async (req, ctx) => {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const view = searchParams.get("view") || "day";
  const status = searchParams.get("status");

  const where: Record<string, unknown> = { restaurantId: ctx.restaurantId };

  if (status) where.status = status;

  if (date) {
    const d = new Date(date);
    if (view === "week") {
      const start = new Date(d);
      start.setDate(d.getDate() - d.getDay() + 1);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      where.date = { gte: start, lte: end };
    } else {
      const start = new Date(d);
      start.setHours(0, 0, 0, 0);
      const end = new Date(d);
      end.setHours(23, 59, 59, 999);
      where.date = { gte: start, lte: end };
    }
  }

  const reservations = await prisma.reservation.findMany({
    where,
    include: {
      customer: true,
      table: true,
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  return json(reservations);
});

export const POST = withTenant(async (req, ctx) => {
  const body = await req.json();
  const data = createSchema.parse(body);

  const limit = ctx.limits.reservationsPerMonth;
  if (Number.isFinite(limit)) {
    const count = await getMonthlyReservationCount(ctx.restaurantId);
    if (count >= limit) {
      return json(
        {
          error: `Monthly reservation limit reached (${limit}). Upgrade to Growth for unlimited bookings.`,
        },
        403
      );
    }
  }

  let customerId = data.customerId;

  if (data.newGuest) {
    const customer = await prisma.customer.create({
      data: {
        restaurantId: ctx.restaurantId,
        firstName: data.newGuest.firstName,
        lastName: data.newGuest.lastName,
        email: data.newGuest.email || null,
        phone: data.newGuest.phone,
        tags: ["REGULAR"],
      },
    });
    await prisma.loyaltyAccount.create({
      data: { restaurantId: ctx.restaurantId, customerId: customer.id },
    });
    customerId = customer.id;
  }

  if (!customerId) return json({ error: "Customer required" }, 400);

  const existingCustomer = await prisma.customer.findFirst({
    where: { id: customerId, restaurantId: ctx.restaurantId },
  });
  if (!existingCustomer) return json({ error: "Customer not found" }, 404);

  if (data.tableId) {
    await assertTableInRestaurant(ctx.restaurantId, data.tableId);
  }

  const reservation = await prisma.reservation.create({
    data: {
      restaurantId: ctx.restaurantId,
      customerId,
      tableId: data.tableId,
      date: new Date(data.date),
      startTime: data.startTime,
      endTime: data.endTime,
      partySize: data.partySize,
      status: data.status || "PENDING",
      notes: data.notes,
      spendAmount: data.spendAmount,
    },
    include: { customer: true, table: true },
  });

  await prisma.analyticsEvent.create({
    data: {
      restaurantId: ctx.restaurantId,
      type: "RESERVATION_CREATED",
      customerId,
      metadata: { reservationId: reservation.id },
    },
  });

  return json(reservation, 201);
});
