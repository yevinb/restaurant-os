import { prisma } from "./prisma";
import { startOfWeek, endOfWeek, subDays, format } from "date-fns";

export async function processAssistantQuery(
  restaurantId: string,
  query: string
): Promise<string> {
  const q = query.toLowerCase();

  if (
    q.includes("perform") ||
    q.includes("how did we") ||
    q.includes("this week")
  ) {
    return getWeeklyPerformance(restaurantId);
  }

  if (
    q.includes("best customer") ||
    q.includes("top customer") ||
    q.includes("who are my best")
  ) {
    return getTopCustomers(restaurantId);
  }

  if (
    q.includes("slow") ||
    q.includes("quiet") ||
    q.includes("slowest day")
  ) {
    return getSlowestDays(restaurantId);
  }

  if (
    q.includes("increase booking") ||
    q.includes("more reservation") ||
    q.includes("grow")
  ) {
    return getBookingRecommendations(restaurantId);
  }

  if (q.includes("revenue") || q.includes("sales")) {
    return getRevenueSummary(restaurantId);
  }

  if (q.includes("loyalty") || q.includes("points")) {
    return getLoyaltySummary(restaurantId);
  }

  return `I can help you with:
• "How did we perform this week?"
• "Who are my best customers?"
• "What days are slowest?"
• "How can I increase bookings?"
• Revenue and loyalty summaries

Ask me any of these questions about your restaurant data.`;
}

async function getWeeklyPerformance(restaurantId: string) {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const [reservations, completed, revenue] = await Promise.all([
    prisma.reservation.count({
      where: {
        restaurantId,
        date: { gte: weekStart, lte: weekEnd },
        status: { not: "CANCELLED" },
      },
    }),
    prisma.reservation.count({
      where: {
        restaurantId,
        date: { gte: weekStart, lte: weekEnd },
        status: "COMPLETED",
      },
    }),
    prisma.reservation.aggregate({
      where: {
        restaurantId,
        date: { gte: weekStart, lte: weekEnd },
        status: "COMPLETED",
      },
      _sum: { spendAmount: true },
    }),
  ]);

  const rev = Number(revenue._sum.spendAmount || 0);
  const completionRate =
    reservations > 0
      ? Math.round((completed / reservations) * 100)
      : 0;

  return `**This week's performance** (${format(weekStart, "d MMM")} – ${format(weekEnd, "d MMM")})

• **${reservations}** reservations booked
• **${completed}** completed (${completionRate}% completion rate)
• **£${rev.toFixed(2)}** revenue from completed visits

${reservations < 20 ? "📉 Bookings are below average — consider running a mid-week promotion." : "📈 Solid week! Focus on converting pending reservations to seated guests."}`;
}

async function getTopCustomers(restaurantId: string) {
  const customers = await prisma.customer.findMany({
    where: { restaurantId },
    orderBy: { totalSpend: "desc" },
    take: 5,
  });

  if (customers.length === 0) {
    return "No customer data yet. Add customers through CRM or reservations.";
  }

  const lines = customers.map(
    (c, i) =>
      `${i + 1}. **${c.firstName} ${c.lastName}** — £${Number(c.totalSpend).toFixed(2)} spent, ${c.visitCount} visits${c.tags.includes("VIP") ? " ⭐ VIP" : ""}`
  );

  return `**Your top 5 customers by spend:**

${lines.join("\n")}

💡 Consider sending your top customers a VIP thank-you offer to boost loyalty.`;
}

async function getSlowestDays(restaurantId: string) {
  const thirtyDaysAgo = subDays(new Date(), 30);

  const reservations = await prisma.reservation.findMany({
    where: {
      restaurantId,
      date: { gte: thirtyDaysAgo },
      status: { not: "CANCELLED" },
    },
    select: { date: true },
  });

  const dayCounts: Record<number, number> = {};
  for (let i = 0; i < 7; i++) dayCounts[i] = 0;

  reservations.forEach((r) => {
    const day = new Date(r.date).getDay();
    dayCounts[day]++;
  });

  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  const sorted = Object.entries(dayCounts)
    .map(([day, count]) => ({ day: parseInt(day), count, name: dayNames[parseInt(day)] }))
    .sort((a, b) => a.count - b.count);

  const slowest = sorted.slice(0, 2);
  const busiest = sorted.slice(-2).reverse();

  return `**Booking patterns (last 30 days):**

Slowest days:
${slowest.map((d) => `• **${d.name}** — ${d.count} bookings`).join("\n")}

Busiest days:
${busiest.map((d) => `• **${d.name}** — ${d.count} bookings`).join("\n")}

💡 Run targeted campaigns on ${slowest[0]?.name}s and ${slowest[1]?.name}s to fill empty tables.`;
}

async function getBookingRecommendations(restaurantId: string) {
  const [inactiveCount, pendingCount, avgPartySize] = await Promise.all([
    prisma.customer.count({
      where: {
        restaurantId,
        OR: [
          { lastVisitAt: { lt: subDays(new Date(), 30) } },
          { lastVisitAt: null },
        ],
      },
    }),
    prisma.reservation.count({
      where: { restaurantId, status: "PENDING" },
    }),
    prisma.reservation.aggregate({
      where: { restaurantId },
      _avg: { partySize: true },
    }),
  ]);

  return `**Recommendations to increase bookings:**

1. **Re-engage ${inactiveCount} inactive customers** — Set up an automation rule in Marketing to send a "We miss you" offer after 30 days inactive.

2. **Confirm ${pendingCount} pending reservations** — Call or email guests to confirm and reduce no-shows.

3. **Optimize table capacity** — Average party size is ${Math.round(avgPartySize._avg.partySize || 2)} guests. Ensure you have enough 2-tops and 4-tops available at peak hours.

4. **Launch a mid-week special** — Your slowest days are prime for a prix fixe or loyalty double-points promotion.

5. **Enable loyalty rewards** — Customers with loyalty points in your CRM tend to return more often.`;
}

async function getRevenueSummary(restaurantId: string) {
  const thirtyDaysAgo = subDays(new Date(), 30);

  const revenue = await prisma.reservation.aggregate({
    where: {
      restaurantId,
      status: "COMPLETED",
      date: { gte: thirtyDaysAgo },
    },
    _sum: { spendAmount: true },
    _count: true,
  });

  const total = Number(revenue._sum.spendAmount || 0);
  const avg = revenue._count > 0 ? total / revenue._count : 0;

  return `**Revenue summary (last 30 days):**

• Total revenue: **£${total.toFixed(2)}**
• Completed visits: **${revenue._count}**
• Average spend per visit: **£${avg.toFixed(2)}**`;
}

async function getLoyaltySummary(restaurantId: string) {
  const [accounts, totalPoints, recentTx] = await Promise.all([
    prisma.loyaltyAccount.count({ where: { restaurantId } }),
    prisma.loyaltyAccount.aggregate({
      where: { restaurantId },
      _sum: { points: true },
    }),
    prisma.loyaltyTransaction.count({
      where: {
        restaurantId,
        createdAt: { gte: subDays(new Date(), 30) },
      },
    }),
  ]);

  return `**Loyalty program overview:**

• **${accounts}** active loyalty members
• **${totalPoints._sum.points || 0}** total points outstanding
• **${recentTx}** transactions in the last 30 days`;
}
