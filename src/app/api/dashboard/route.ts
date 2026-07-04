import { withTenant, json } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { subDays } from "date-fns";

export const GET = withTenant(async (_req, ctx) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const [
    todayReservations,
    pendingReservations,
    totalCustomers,
    recentReservations,
    revenueThisMonth,
  ] = await Promise.all([
    prisma.reservation.count({
      where: {
        restaurantId: ctx.restaurantId,
        date: { gte: today, lt: tomorrow },
        status: { not: "CANCELLED" },
      },
    }),
    prisma.reservation.count({
      where: {
        restaurantId: ctx.restaurantId,
        status: "PENDING",
      },
    }),
    prisma.customer.count({
      where: { restaurantId: ctx.restaurantId },
    }),
    prisma.reservation.findMany({
      where: { restaurantId: ctx.restaurantId },
      include: { customer: true, table: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.reservation.aggregate({
      where: {
        restaurantId: ctx.restaurantId,
        status: "COMPLETED",
        date: { gte: subDays(new Date(), 30) },
      },
      _sum: { spendAmount: true },
    }),
  ]);

  return json({
    stats: {
      todayReservations,
      pendingReservations,
      totalCustomers,
      revenueThisMonth: Number(revenueThisMonth._sum.spendAmount || 0),
    },
    recentReservations,
    subscription: ctx.restaurant.subscription,
    plan: ctx.plan,
  });
});
