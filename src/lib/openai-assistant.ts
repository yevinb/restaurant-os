import { prisma } from "./prisma";
import { processAssistantQuery } from "./assistant";
import {
  startOfWeek,
  endOfWeek,
  subDays,
  format,
  startOfMonth,
  endOfMonth,
} from "date-fns";

type ChatTurn = { role: "user" | "assistant"; content: string };

const SYSTEM_PROMPT = `You are RestaurantOS AI — an expert restaurant operations consultant embedded in a live SaaS dashboard.

Your job:
- Answer using ONLY the live restaurant data provided below (never invent numbers).
- Give specific, actionable advice tailored to this restaurant.
- Use clear structure: short paragraphs, bullet points for lists, bold for key metrics.
- Currency is always GBP (£). Dates are UK format.
- If data is missing for a question, say what you do know and suggest what to track.
- Be confident, warm, and professional — like a trusted GM advisor.
- Keep answers focused (150–350 words unless asked for detail).`;

export async function buildRichRestaurantContext(restaurantId: string) {
  const now = new Date();
  const thirtyDaysAgo = subDays(now, 30);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const [
    restaurant,
    weekReservations,
    weekCompleted,
    weekRevenue,
    monthRevenue,
    totalCustomers,
    vipCount,
    inactiveCount,
    pendingCount,
    topCustomers,
    loyaltyMembers,
    loyaltyPoints,
    recentReservations,
    dayBreakdown,
    tables,
    campaigns,
    staffCount,
  ] = await Promise.all([
    prisma.restaurant.findUnique({ where: { id: restaurantId } }),
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
        status: "COMPLETED",
        date: { gte: weekStart, lte: weekEnd },
      },
      _sum: { spendAmount: true },
      _avg: { spendAmount: true, partySize: true },
    }),
    prisma.reservation.aggregate({
      where: {
        restaurantId,
        status: "COMPLETED",
        date: { gte: monthStart, lte: monthEnd },
      },
      _sum: { spendAmount: true },
      _count: true,
    }),
    prisma.customer.count({ where: { restaurantId } }),
    prisma.customer.count({
      where: { restaurantId, tags: { has: "VIP" } },
    }),
    prisma.customer.count({
      where: {
        restaurantId,
        OR: [
          { lastVisitAt: { lt: subDays(now, 30) } },
          { lastVisitAt: null },
        ],
      },
    }),
    prisma.reservation.count({
      where: { restaurantId, status: "PENDING" },
    }),
    prisma.customer.findMany({
      where: { restaurantId },
      orderBy: { totalSpend: "desc" },
      take: 8,
      select: {
        firstName: true,
        lastName: true,
        totalSpend: true,
        visitCount: true,
        tags: true,
        lastVisitAt: true,
      },
    }),
    prisma.loyaltyAccount.count({ where: { restaurantId } }),
    prisma.loyaltyAccount.aggregate({
      where: { restaurantId },
      _sum: { points: true },
    }),
    prisma.reservation.findMany({
      where: { restaurantId, date: { gte: weekStart, lte: weekEnd } },
      include: { customer: { select: { firstName: true, lastName: true } } },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
      take: 15,
    }),
    prisma.reservation.findMany({
      where: {
        restaurantId,
        date: { gte: thirtyDaysAgo },
        status: { not: "CANCELLED" },
      },
      select: { date: true },
    }),
    prisma.table.findMany({
      where: { restaurantId, isActive: true },
      select: { name: true, capacity: true },
    }),
    prisma.campaign.findMany({
      where: { restaurantId },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { name: true, segment: true, recipientCount: true, sentAt: true },
    }),
    prisma.membership.count({ where: { restaurantId } }),
  ]);

  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const dayCounts: Record<number, number> = {};
  for (let i = 0; i < 7; i++) dayCounts[i] = 0;
  dayBreakdown.forEach((r) => {
    dayCounts[new Date(r.date).getDay()]++;
  });
  const sortedDays = Object.entries(dayCounts)
    .map(([d, c]) => ({ name: dayNames[parseInt(d)], count: c }))
    .sort((a, b) => a.count - b.count);

  const weekRev = Number(weekRevenue._sum.spendAmount || 0);
  const monthRev = Number(monthRevenue._sum.spendAmount || 0);

  const topList = topCustomers
    .map(
      (c, i) =>
        `${i + 1}. ${c.firstName} ${c.lastName} — £${Number(c.totalSpend).toFixed(2)}, ${c.visitCount} visits${c.tags.includes("VIP") ? " [VIP]" : ""}`
    )
    .join("\n");

  const upcoming = recentReservations
    .map(
      (r) =>
        `- ${format(new Date(r.date), "EEE d MMM")} ${r.startTime} · ${r.customer.firstName} ${r.customer.lastName} · ${r.partySize} guests · ${r.status}`
    )
    .join("\n");

  const tableList = tables
    .map((t) => `${t.name} (${t.capacity} seats)`)
    .join(", ");

  const campaignList =
    campaigns.length === 0
      ? "No campaigns sent yet"
      : campaigns
          .map(
            (c) =>
              `- ${c.name} (${c.segment}, ${c.recipientCount} recipients${c.sentAt ? `, sent ${format(c.sentAt, "d MMM")}` : ""})`
          )
          .join("\n");

  return `
=== RESTAURANT PROFILE ===
Name: ${restaurant?.name}
Address: ${restaurant?.address || "Not set"}
Timezone: ${restaurant?.timezone}
Tables: ${tableList || "None configured"}

=== THIS WEEK (${format(weekStart, "d MMM")} – ${format(weekEnd, "d MMM")}) ===
Reservations booked: ${weekReservations}
Completed visits: ${weekCompleted}
Revenue: £${weekRev.toFixed(2)}
Avg spend/visit: £${Number(weekRevenue._avg.spendAmount || 0).toFixed(2)}
Avg party size: ${Number(weekRevenue._avg.partySize || 0).toFixed(1)}

=== THIS MONTH ===
Revenue: £${monthRev.toFixed(2)} from ${monthRevenue._count} completed visits

=== CUSTOMERS ===
Total: ${totalCustomers} | VIP: ${vipCount} | Inactive (30+ days): ${inactiveCount}
Loyalty members: ${loyaltyMembers} | Points outstanding: ${loyaltyPoints._sum.points || 0}

Top customers by spend:
${topList || "No data"}

=== OPERATIONS ===
Pending confirmations: ${pendingCount}
Team members: ${staffCount}

=== BOOKING PATTERNS (last 30 days) ===
Slowest: ${sortedDays[0]?.name} (${sortedDays[0]?.count}), ${sortedDays[1]?.name} (${sortedDays[1]?.count})
Busiest: ${sortedDays[sortedDays.length - 1]?.name} (${sortedDays[sortedDays.length - 1]?.count}), ${sortedDays[sortedDays.length - 2]?.name} (${sortedDays[sortedDays.length - 2]?.count})

=== THIS WEEK'S BOOKINGS (sample) ===
${upcoming || "No bookings this week"}

=== RECENT MARKETING ===
${campaignList}
`.trim();
}

async function callGroq(
  systemContent: string,
  history: ChatTurn[],
  query: string
): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.includes("placeholder")) return null;

  const messages = [
    { role: "system" as const, content: systemContent },
    ...history.slice(-10).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: query },
  ];

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      messages,
      max_tokens: 1200,
      temperature: 0.5,
      top_p: 0.9,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Groq API error:", res.status, err);
    return null;
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? null;
}

async function callOpenAI(
  systemContent: string,
  history: ChatTurn[],
  query: string
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.includes("placeholder")) return null;

  const messages = [
    { role: "system" as const, content: systemContent },
    ...history.slice(-10).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: query },
  ];

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages,
      max_tokens: 1200,
      temperature: 0.5,
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? null;
}

export async function getAssistantResponse(
  restaurantId: string,
  query: string,
  history: ChatTurn[] = []
): Promise<{ response: string; source: "groq" | "openai" | "rules" }> {
  const context = await buildRichRestaurantContext(restaurantId);
  const systemContent = `${SYSTEM_PROMPT}\n\n--- LIVE RESTAURANT DATA ---\n${context}`;

  try {
    const groqResponse = await callGroq(systemContent, history, query);
    if (groqResponse) return { response: groqResponse, source: "groq" };
  } catch (err) {
    console.error("Groq error:", err);
  }

  try {
    const openaiResponse = await callOpenAI(systemContent, history, query);
    if (openaiResponse) return { response: openaiResponse, source: "openai" };
  } catch (err) {
    console.error("OpenAI error:", err);
  }

  const response = await processAssistantQuery(restaurantId, query);
  return { response, source: "rules" };
}
