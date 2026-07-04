import { prisma } from "./prisma";
import { subDays, startOfDay, format } from "date-fns";

export async function getAnalyticsOverview(restaurantId: string) {
  const now = new Date();
  const thirtyDaysAgo = subDays(now, 30);
  const sixtyDaysAgo = subDays(now, 60);

  const [
    reservations,
    completedReservations,
    customers,
    repeatCustomers,
    revenueData,
    prevRevenue,
    hourlyData,
    topCustomers,
    staffShifts,
    volumeByDay,
  ] = await Promise.all([
    prisma.reservation.count({
      where: { restaurantId, date: { gte: thirtyDaysAgo } },
    }),
    prisma.reservation.findMany({
      where: {
        restaurantId,
        status: "COMPLETED",
        date: { gte: thirtyDaysAgo },
      },
      select: { date: true, spendAmount: true, startTime: true },
    }),
    prisma.customer.count({ where: { restaurantId } }),
    prisma.customer.count({
      where: { restaurantId, visitCount: { gte: 2 } },
    }),
    prisma.reservation.groupBy({
      by: ["date"],
      where: {
        restaurantId,
        status: "COMPLETED",
        date: { gte: thirtyDaysAgo },
      },
      _sum: { spendAmount: true },
      _count: true,
      orderBy: { date: "asc" },
    }),
    prisma.reservation.aggregate({
      where: {
        restaurantId,
        status: "COMPLETED",
        date: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
      },
      _sum: { spendAmount: true },
    }),
    prisma.reservation.findMany({
      where: {
        restaurantId,
        date: { gte: thirtyDaysAgo },
        status: { not: "CANCELLED" },
      },
      select: { startTime: true },
    }),
    prisma.customer.findMany({
      where: { restaurantId },
      orderBy: { totalSpend: "desc" },
      take: 5,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        totalSpend: true,
        visitCount: true,
      },
    }),
    prisma.shift.groupBy({
      by: ["userId"],
      where: { restaurantId, date: { gte: thirtyDaysAgo } },
      _count: true,
    }),
    prisma.reservation.groupBy({
      by: ["date"],
      where: {
        restaurantId,
        date: { gte: thirtyDaysAgo },
        status: { not: "CANCELLED" },
      },
      _count: true,
    }),
  ]);

  const totalRevenue = completedReservations.reduce(
    (sum, r) => sum + Number(r.spendAmount || 0),
    0
  );
  const prevTotal = Number(prevRevenue._sum.spendAmount || 0);
  const revenueChange =
    prevTotal > 0
      ? Math.round(((totalRevenue - prevTotal) / prevTotal) * 100)
      : 0;

  const revenueOverTime = aggregateByDay(revenueData, thirtyDaysAgo, 30);

  const reservationVolume = aggregateVolumeByDay(volumeByDay, 30);

  const repeatRate =
    customers > 0 ? Math.round((repeatCustomers / customers) * 100) : 0;

  const peakHours = getPeakHours(hourlyData);

  const staffPerformance = await getStaffPerformance(
    restaurantId,
    staffShifts
  );

  return {
    summary: {
      totalRevenue,
      revenueChange,
      reservations,
      customers,
      repeatRate,
      avgSpend:
        completedReservations.length > 0
          ? totalRevenue / completedReservations.length
          : 0,
    },
    revenueOverTime,
    reservationVolume,
    topCustomers: topCustomers.map((c) => ({
      ...c,
      totalSpend: Number(c.totalSpend),
    })),
    peakHours,
    staffPerformance,
  };
}

function aggregateByDay(
  data: { date: Date; _sum: { spendAmount: unknown }; _count: number }[],
  startDate: Date,
  days: number
) {
  const map = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = subDays(new Date(), days - 1 - i);
    map.set(format(startOfDay(d), "yyyy-MM-dd"), 0);
  }
  data.forEach((row) => {
    const key = format(startOfDay(row.date), "yyyy-MM-dd");
    map.set(key, Number(row._sum.spendAmount || 0));
  });
  return Array.from(map.entries()).map(([date, revenue]) => ({
    date: format(new Date(date), "d MMM"),
    revenue,
  }));
}

function aggregateVolumeByDay(
  data: { date: Date; _count: number }[],
  days: number
) {
  const map = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = subDays(new Date(), days - 1 - i);
    map.set(format(startOfDay(d), "yyyy-MM-dd"), 0);
  }
  data.forEach((row) => {
    const key = format(startOfDay(row.date), "yyyy-MM-dd");
    map.set(key, row._count);
  });
  return Array.from(map.entries()).map(([date, count]) => ({
    date: format(new Date(date), "d MMM"),
    count,
  }));
}

function getPeakHours(data: { startTime: string }[]) {
  const hours: Record<string, number> = {};
  data.forEach((r) => {
    const hour = r.startTime.split(":")[0];
    hours[hour] = (hours[hour] || 0) + 1;
  });
  return Object.entries(hours)
    .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
    .map(([hour, count]) => ({
      hour: `${hour}:00`,
      count,
    }));
}

async function getStaffPerformance(
  restaurantId: string,
  shifts: { userId: string; _count: number }[]
) {
  const userIds = shifts.map((s) => s.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true },
  });

  return shifts.map((s) => ({
    name: users.find((u) => u.id === s.userId)?.name || "Unknown",
    shifts: s._count,
  }));
}
