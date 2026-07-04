import { prisma } from "./prisma";
import { subDays } from "date-fns";

export async function getSegmentStats(restaurantId: string) {
  const cutoff30 = subDays(new Date(), 30);
  const cutoff60 = subDays(new Date(), 60);

  const [
    vipTotal,
    vipReachable,
    inactive30Total,
    inactive30Reachable,
    inactive60Total,
    inactive60Reachable,
    allTotal,
    allReachable,
    highSpenders,
    customersWithEmail,
  ] = await Promise.all([
    prisma.customer.count({
      where: { restaurantId, tags: { has: "VIP" } },
    }),
    prisma.customer.count({
      where: {
        restaurantId,
        tags: { has: "VIP" },
        email: { not: null },
      },
    }),
    prisma.customer.count({
      where: {
        restaurantId,
        OR: [{ lastVisitAt: { lt: cutoff30 } }, { lastVisitAt: null }],
      },
    }),
    prisma.customer.count({
      where: {
        restaurantId,
        email: { not: null },
        OR: [{ lastVisitAt: { lt: cutoff30 } }, { lastVisitAt: null }],
      },
    }),
    prisma.customer.count({
      where: {
        restaurantId,
        OR: [{ lastVisitAt: { lt: cutoff60 } }, { lastVisitAt: null }],
      },
    }),
    prisma.customer.count({
      where: {
        restaurantId,
        email: { not: null },
        OR: [{ lastVisitAt: { lt: cutoff60 } }, { lastVisitAt: null }],
      },
    }),
    prisma.customer.count({ where: { restaurantId } }),
    prisma.customer.count({
      where: { restaurantId, email: { not: null } },
    }),
    prisma.customer.findMany({
      where: { restaurantId },
      orderBy: { totalSpend: "desc" },
      take: 20,
      select: { email: true },
    }),
    prisma.customer.count({
      where: { restaurantId, email: { not: null } },
    }),
  ]);

  const hsReachable = highSpenders.filter((c) => c.email).length;

  return {
    VIP: { total: vipTotal, reachable: vipReachable },
    INACTIVE: { total: inactive30Total, reachable: inactive30Reachable },
    INACTIVE_60: { total: inactive60Total, reachable: inactive60Reachable },
    HIGH_SPENDERS: {
      total: highSpenders.length,
      reachable: hsReachable,
    },
    ALL: { total: allTotal, reachable: allReachable },
    customersWithEmail,
  };
}
