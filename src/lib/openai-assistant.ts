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

export type AiProvider = "groq" | "openai" | "gemini" | "anthropic" | "rules";

type ChatTurn = { role: "user" | "assistant"; content: string };

const SYSTEM_PROMPT = `You are RestaurantOS AI — an elite restaurant consultant combining the expertise of a Michelin-star GM, a hospitality marketing director, and a revenue management analyst.

You have LIVE access to this restaurant's dashboard data (bookings, CRM, loyalty, marketing, staff). Ground every answer in their actual numbers when available.

## How you respond (always follow this structure)

**Step 1 — Understand:** One sentence acknowledging their question.

**Step 2 — Analyze:** Pull specific numbers from their live data (revenue, bookings, customers, slow days, loyalty, etc.). Cite exact figures with £ currency.

**Step 3 — Recommend:** Give a numbered action plan (1, 2, 3…) with concrete steps they can do THIS WEEK. Be specific — not generic advice.

**Step 4 — Prioritize:** Clearly state what to do first vs what can wait.

**Step 5 — Measure:** Tell them which metric to track to know if it's working.

## Your expertise covers EVERYTHING restaurant-related:
Operations, menu engineering, pricing, staffing, scheduling, marketing campaigns, social media, loyalty programs, customer retention, win-back strategies, no-show reduction, table turnover, peak hour optimization, food cost control, supplier negotiation, health & safety, reviews/reputation, expansion, competitor analysis, seasonal planning, events, private dining, delivery/takeaway, training staff, upselling, wine pairings, dietary trends, local SEO, influencer partnerships, and more.

## Rules
- Use markdown: **bold** for metrics, numbered lists for steps, bullet points for details.
- Be warm, confident, and direct — like a trusted advisor who's run restaurants for 20 years.
- Never refuse a restaurant question. If live data is missing, use industry best practices and say what to start tracking.
- Never say "I can only help with predefined questions" or list canned prompts.
- Write 200–500 words for most answers; go longer for action plans or complex strategy questions.
- For follow-up questions, remember the conversation history and build on prior answers.`;

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
    automationCount,
  ] = await Promise.all([
    prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        name: true,
        address: true,
        timezone: true,
        currency: true,
        locale: true,
        country: true,
      },
    }),
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
        email: true,
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
    prisma.automationRule.count({
      where: { restaurantId, isActive: true },
    }),
  ]);

  const currency = restaurant?.currency === "KWD" ? "KWD" : "£";
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
  const completionRate =
    weekReservations > 0
      ? Math.round((weekCompleted / weekReservations) * 100)
      : 0;

  const topList = topCustomers
    .map(
      (c, i) =>
        `${i + 1}. ${c.firstName} ${c.lastName} — ${currency}${Number(c.totalSpend).toFixed(2)}, ${c.visitCount} visits${c.tags.includes("VIP") ? " [VIP]" : ""}${c.email ? "" : " (no email)"}`
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
Country: ${restaurant?.country || "GB"}
Currency: ${currency}
Timezone: ${restaurant?.timezone}
Tables: ${tableList || "None configured"}

=== THIS WEEK (${format(weekStart, "d MMM")} – ${format(weekEnd, "d MMM")}) ===
Reservations booked: ${weekReservations}
Completed visits: ${weekCompleted}
Completion rate: ${completionRate}%
Revenue: ${currency}${weekRev.toFixed(2)}
Avg spend/visit: ${currency}${Number(weekRevenue._avg.spendAmount || 0).toFixed(2)}
Avg party size: ${Number(weekRevenue._avg.partySize || 0).toFixed(1)}

=== THIS MONTH ===
Revenue: ${currency}${monthRev.toFixed(2)} from ${monthRevenue._count} completed visits

=== CUSTOMERS ===
Total: ${totalCustomers} | VIP: ${vipCount} | Inactive (30+ days): ${inactiveCount}
Loyalty members: ${loyaltyMembers} | Points outstanding: ${loyaltyPoints._sum.points || 0}

Top customers by spend:
${topList || "No data yet"}

=== OPERATIONS ===
Pending confirmations: ${pendingCount}
Team members: ${staffCount}
Active marketing automations: ${automationCount}

=== BOOKING PATTERNS (last 30 days) ===
Slowest: ${sortedDays[0]?.name} (${sortedDays[0]?.count}), ${sortedDays[1]?.name} (${sortedDays[1]?.count})
Busiest: ${sortedDays[sortedDays.length - 1]?.name} (${sortedDays[sortedDays.length - 1]?.count}), ${sortedDays[sortedDays.length - 2]?.name} (${sortedDays[sortedDays.length - 2]?.count})

=== THIS WEEK'S BOOKINGS (sample) ===
${upcoming || "No bookings this week"}

=== RECENT MARKETING ===
${campaignList}
`.trim();
}

function buildMessages(
  systemContent: string,
  history: ChatTurn[],
  query: string
) {
  return [
    { role: "system" as const, content: systemContent },
    ...history.slice(-20).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: query },
  ];
}

async function callGroq(
  systemContent: string,
  history: ChatTurn[],
  query: string
): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.includes("placeholder")) return null;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      messages: buildMessages(systemContent, history, query),
      max_tokens: 2500,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    console.error("Groq API error:", res.status, await res.text());
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

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: buildMessages(systemContent, history, query),
      max_tokens: 2500,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    console.error("OpenAI API error:", res.status, await res.text());
    return null;
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? null;
}

async function callGemini(
  systemContent: string,
  history: ChatTurn[],
  query: string
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.includes("placeholder")) return null;

  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const contents = [
    ...history.slice(-20).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    { role: "user", parts: [{ text: query }] },
  ];

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemContent }] },
        contents,
        generationConfig: {
          maxOutputTokens: 2500,
          temperature: 0.7,
        },
      }),
    }
  );

  if (!res.ok) {
    console.error("Gemini API error:", res.status, await res.text());
    return null;
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
}

async function callAnthropic(
  systemContent: string,
  history: ChatTurn[],
  query: string
): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.includes("placeholder")) return null;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-20241022",
      max_tokens: 2500,
      system: systemContent,
      messages: [
        ...history.slice(-20).map((m) => ({
          role: m.role,
          content: m.content,
        })),
        { role: "user", content: query },
      ],
    }),
  });

  if (!res.ok) {
    console.error("Anthropic API error:", res.status, await res.text());
    return null;
  }

  const data = await res.json();
  const block = data.content?.find(
    (b: { type: string }) => b.type === "text"
  );
  return block?.text ?? null;
}

export function getActiveAiProvider(): AiProvider {
  const check = (key: string | undefined) =>
    key && !key.includes("placeholder");

  if (check(process.env.GROQ_API_KEY)) return "groq";
  if (check(process.env.GEMINI_API_KEY)) return "gemini";
  if (check(process.env.OPENAI_API_KEY)) return "openai";
  if (check(process.env.ANTHROPIC_API_KEY)) return "anthropic";
  return "rules";
}

export async function getAssistantResponse(
  restaurantId: string,
  query: string,
  history: ChatTurn[] = []
): Promise<{ response: string; source: AiProvider }> {
  const context = await buildRichRestaurantContext(restaurantId);
  const systemContent = `${SYSTEM_PROMPT}\n\n--- LIVE RESTAURANT DATA ---\n${context}`;

  const providers: Array<{
    name: AiProvider;
    call: () => Promise<string | null>;
  }> = [
    { name: "groq", call: () => callGroq(systemContent, history, query) },
    { name: "gemini", call: () => callGemini(systemContent, history, query) },
    { name: "openai", call: () => callOpenAI(systemContent, history, query) },
    {
      name: "anthropic",
      call: () => callAnthropic(systemContent, history, query),
    },
  ];

  for (const provider of providers) {
    try {
      const response = await provider.call();
      if (response?.trim()) {
        return { response: response.trim(), source: provider.name };
      }
    } catch (err) {
      console.error(`${provider.name} error:`, err);
    }
  }

  const response = await processAssistantQuery(restaurantId, query);
  return { response, source: "rules" };
}
