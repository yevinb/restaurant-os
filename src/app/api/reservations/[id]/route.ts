import { withTenant, json } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { awardLoyaltyPoints } from "@/lib/loyalty";
import {
  assertCustomerInRestaurant,
  assertTableInRestaurant,
} from "@/lib/validators";
import { emitWebhook } from "@/lib/integrations";
import { z } from "zod";

const updateSchema = z.object({
  customerId: z.string().optional(),
  tableId: z.string().nullable().optional(),
  date: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  partySize: z.number().min(1).max(20).optional(),
  status: z
    .enum(["PENDING", "CONFIRMED", "SEATED", "COMPLETED", "CANCELLED"])
    .optional(),
  notes: z.string().optional(),
  spendAmount: z.number().optional(),
});

export const GET = withTenant(async (req, ctx) => {
  const id = new URL(req.url).pathname.split("/").pop()!;

  const reservation = await prisma.reservation.findFirst({
    where: { id, restaurantId: ctx.restaurantId },
    include: { customer: true, table: true },
  });
  if (!reservation) return json({ error: "Not found" }, 404);
  return json(reservation);
});

export const PATCH = withTenant(async (req, ctx) => {
  const url = new URL(req.url);
  const id = url.pathname.split("/").pop()!;
  const body = await req.json();
  const data = updateSchema.parse(body);

  const existing = await prisma.reservation.findFirst({
    where: { id, restaurantId: ctx.restaurantId },
  });
  if (!existing) return json({ error: "Not found" }, 404);

  if (data.customerId) {
    await assertCustomerInRestaurant(ctx.restaurantId, data.customerId);
  }
  if (data.tableId) {
    await assertTableInRestaurant(ctx.restaurantId, data.tableId);
  }

  const reservation = await prisma.reservation.update({
    where: { id },
    data: {
      ...data,
      date: data.date ? new Date(data.date) : undefined,
      tableId: data.tableId === null ? null : data.tableId,
    },
    include: { customer: true, table: true },
  });

  if (
    data.status === "COMPLETED" &&
    existing.status !== "COMPLETED" &&
    reservation.spendAmount
  ) {
    const spend = Number(reservation.spendAmount);
    await prisma.customer.update({
      where: { id: reservation.customerId },
      data: {
        totalSpend: { increment: spend },
        visitCount: { increment: 1 },
        lastVisitAt: new Date(),
      },
    });

    await awardLoyaltyPoints(
      ctx.restaurantId,
      reservation.customerId,
      spend,
      reservation.id
    );

    await prisma.analyticsEvent.create({
      data: {
        restaurantId: ctx.restaurantId,
        type: "RESERVATION_COMPLETED",
        value: spend,
        customerId: reservation.customerId,
        metadata: { reservationId: reservation.id },
      },
    });

    await emitWebhook(ctx.restaurantId, "reservation.completed", {
      reservationId: reservation.id,
      spend,
      customerId: reservation.customerId,
    });
  }

  if (data.status && data.status !== existing.status) {
    await emitWebhook(ctx.restaurantId, "reservation.updated", {
      reservationId: reservation.id,
      status: data.status,
    });
  }

  return json(reservation);
});

export const DELETE = withTenant(async (req, ctx) => {
  const url = new URL(req.url);
  const id = url.pathname.split("/").pop()!;

  const existing = await prisma.reservation.findFirst({
    where: { id, restaurantId: ctx.restaurantId },
  });
  if (!existing) return json({ error: "Not found" }, 404);

  await prisma.reservation.update({
    where: { id },
    data: { status: "CANCELLED" },
  });

  return json({ success: true });
});
