import { prisma } from "./prisma";
import { startOfMonth, endOfMonth } from "date-fns";

export async function getMonthlyReservationCount(restaurantId: string) {
  const now = new Date();
  return prisma.reservation.count({
    where: {
      restaurantId,
      date: { gte: startOfMonth(now), lte: endOfMonth(now) },
      status: { not: "CANCELLED" },
    },
  });
}
