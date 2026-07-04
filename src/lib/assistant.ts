import { prisma } from "./prisma";
import { startOfWeek, endOfWeek, subDays, format } from "date-fns";

export async function processAssistantQuery(
  restaurantId: string,
  query: string
): Promise<string> {
  const q = query.toLowerCase().trim();

  if (
    q.includes("improve") ||
    q.includes("help me") ||
    q.includes("how can i") ||
    q.includes("what should i") ||
    q.includes("action plan") ||
    q.includes("strategy") ||
    q.includes("grow") ||
    q.includes("fix") ||
    q.includes("better") ||
    q.includes("increase") ||
    q.includes("boost")
  ) {
    return buildImprovementPlan(restaurantId);
  }

  if (
    q.includes("perform") ||
    q.includes("how did we") ||
    q.includes("this week") ||
    q.includes("summary")
  ) {
    return getWeeklyPerformance(restaurantId);
  }

  if (
    q.includes("best customer") ||
    q.includes("top customer") ||
    q.includes("who are my best") ||
    q.includes("vip")
  ) {
    return getTopCustomers(restaurantId);
  }

  if (
    q.includes("slow") ||
    q.includes("quiet") ||
    q.includes("slowest") ||
    q.includes("busiest") ||
    q.includes("peak")
  ) {
    return getSlowestDays(restaurantId);
  }

  if (
    q.includes("booking") ||
    q.includes("reservation") ||
    q.includes("no-show") ||
    q.includes("fill table") ||
    q.includes("empty table")
  ) {
    return getBookingRecommendations(restaurantId);
  }

  if (
    q.includes("revenue") ||
    q.includes("sales") ||
    q.includes("money") ||
    q.includes("profit")
  ) {
    return getRevenueSummary(restaurantId);
  }

  if (
    q.includes("loyalty") ||
    q.includes("points") ||
    q.includes("reward")
  ) {
    return getLoyaltySummary(restaurantId);
  }

  if (
    q.includes("market") ||
    q.includes("email") ||
    q.includes("campaign") ||
    q.includes("promo")
  ) {
    return getMarketingAdvice(restaurantId);
  }

  if (
    q.includes("staff") ||
    q.includes("schedule") ||
    q.includes("shift") ||
    q.includes("hire")
  ) {
    return getStaffAdvice(restaurantId);
  }

  if (
    q.includes("menu") ||
    q.includes("food") ||
    q.includes("dish") ||
    q.includes("pricing")
  ) {
    return getMenuAdvice(restaurantId);
  }

  return buildGeneralResponse(restaurantId, query);
}

async function buildImprovementPlan(restaurantId: string): Promise<string> {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const thirtyDaysAgo = subDays(now, 30);

  const [
    weekReservations,
    weekCompleted,
    weekRevenue,
    inactiveCount,
    pendingCount,
    totalCustomers,
    loyaltyMembers,
    automationCount,
    campaigns,
    dayBreakdown,
    topCustomer,
  ] = await Promise.all([
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
    }),
    prisma.customer.count({
      where: {
        restaurantId,
        OR: [
          { lastVisitAt: { lt: thirtyDaysAgo } },
          { lastVisitAt: null },
        ],
      },
    }),
    prisma.reservation.count({
      where: { restaurantId, status: "PENDING" },
    }),
    prisma.customer.count({ where: { restaurantId } }),
    prisma.loyaltyAccount.count({ where: { restaurantId } }),
    prisma.automationRule.count({
      where: { restaurantId, isActive: true },
    }),
    prisma.campaign.count({ where: { restaurantId } }),
    prisma.reservation.findMany({
      where: {
        restaurantId,
        date: { gte: thirtyDaysAgo },
        status: { not: "CANCELLED" },
      },
      select: { date: true },
    }),
    prisma.customer.findFirst({
      where: { restaurantId },
      orderBy: { totalSpend: "desc" },
      select: { firstName: true, lastName: true, totalSpend: true },
    }),
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
  const slowest = Object.entries(dayCounts)
    .map(([d, c]) => ({ name: dayNames[parseInt(d)], count: c }))
    .sort((a, b) => a.count - b.count)[0];

  const rev = Number(weekRevenue._sum.spendAmount || 0);
  const completionRate =
    weekReservations > 0
      ? Math.round((weekCompleted / weekReservations) * 100)
      : 0;

  return `## Your personalized improvement plan

Based on your live data, here's exactly what to do — step by step:

### Step 1 — Fix your booking pipeline (do this today)
You have **${pendingCount} pending reservations** waiting for confirmation. Call or WhatsApp each guest today. Confirmed bookings reduce no-shows by up to 30%. Target: get all ${pendingCount} confirmed by end of day.

### Step 2 — Win back inactive customers (this week)
**${inactiveCount} customers** haven't visited in 30+ days out of ${totalCustomers} total. Go to **Marketing → New automation** and set up a "We miss you" email for the INACTIVE segment with a 10% off offer. Even a 5% return rate = ${Math.max(1, Math.round(inactiveCount * 0.05))} extra covers.

### Step 3 — Fill your slowest day
**${slowest?.name ?? "Mid-week"}** is your quietest day (${slowest?.count ?? 0} bookings in 30 days). Run a "${slowest?.name ?? "Mid-week"} Special" — prix fixe menu or double loyalty points. Post on Instagram 48 hours before.

### Step 4 — Protect your revenue base
This week: **${weekReservations} bookings**, **${weekCompleted} completed** (${completionRate}%), **£${rev.toFixed(2)} revenue**.
${weekReservations < 15 ? "You're below a healthy weekly volume. Focus on steps 2 and 3 to drive new bookings." : "Solid base — now focus on increasing average spend per cover."}

### Step 5 — Activate loyalty
${loyaltyMembers > 0 ? `You have **${loyaltyMembers} loyalty members** — promote double-points weekends to drive repeat visits.` : "You have **no loyalty members yet**. Enable loyalty rules in the Loyalty tab and tell every seated guest about the program."}

### Step 6 — Reward your best customer
${topCustomer ? `Your top spender is **${topCustomer.firstName} ${topCustomer.lastName}** (£${Number(topCustomer.totalSpend).toFixed(2)}). Send them a personal thank-you with a complimentary dessert or VIP table.` : "Start tracking customer spend in CRM to identify your VIPs."}

### Step 7 — Set up marketing automation
${automationCount === 0 ? "You have **no active automations**. Create at least one win-back rule in Marketing — this runs on autopilot." : `You have **${automationCount} active automation(s)** — good. Add a birthday/anniversary trigger next.`}
${campaigns === 0 ? "\nYou've never sent a campaign — send your first one to the INACTIVE segment this week." : ""}

### What to measure
Track weekly: total bookings, completion rate, and revenue. Goal for next week: **${Math.max(weekReservations + 5, 15)}+ bookings** and **£${(rev * 1.15).toFixed(2)}+ revenue**.

---
*Tip: Add a free GROQ_API_KEY or GEMINI_API_KEY in Render for full ChatGPT-level AI responses on any restaurant question.*`;
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
    reservations > 0 ? Math.round((completed / reservations) * 100) : 0;

  return `## This week's performance (${format(weekStart, "d MMM")} – ${format(weekEnd, "d MMM")})

**The numbers:**
- **${reservations}** reservations booked
- **${completed}** completed (${completionRate}% completion rate)
- **£${rev.toFixed(2)}** revenue from completed visits

**Analysis:**
${reservations < 20 ? "Bookings are below a healthy weekly target (20+). Your priority should be marketing to inactive customers and running a mid-week promotion." : "You're on track with booking volume. Focus on converting pending reservations and increasing average spend."}

**Next steps:**
1. Confirm all pending reservations today
2. ${reservations < 20 ? "Launch a win-back campaign to inactive customers" : "Upsell desserts/drinks to increase average spend"}
3. Review your slowest day and run a targeted promo`;
}

async function getTopCustomers(restaurantId: string) {
  const customers = await prisma.customer.findMany({
    where: { restaurantId },
    orderBy: { totalSpend: "desc" },
    take: 5,
  });

  if (customers.length === 0) {
    return "No customer data yet. Add customers through CRM or reservations, then ask me again.";
  }

  const lines = customers.map(
    (c, i) =>
      `${i + 1}. **${c.firstName} ${c.lastName}** — £${Number(c.totalSpend).toFixed(2)} spent, ${c.visitCount} visits${c.tags.includes("VIP") ? " ⭐ VIP" : ""}`
  );

  return `## Your top 5 customers by spend

${lines.join("\n")}

**How to keep them:**
1. Tag your top 3 as VIP in CRM
2. Send a personal thank-you offer (complimentary appetizer or priority booking)
3. Enroll them in loyalty with bonus welcome points
4. Ask for a Google review after their next visit
5. Invite them to a seasonal tasting event`;
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
    dayCounts[new Date(r.date).getDay()]++;
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
    .map(([day, count]) => ({
      day: parseInt(day),
      count,
      name: dayNames[parseInt(day)],
    }))
    .sort((a, b) => a.count - b.count);

  const slowest = sorted.slice(0, 2);
  const busiest = sorted.slice(-2).reverse();

  return `## Booking patterns (last 30 days)

**Slowest days:**
${slowest.map((d) => `- **${d.name}** — ${d.count} bookings`).join("\n")}

**Busiest days:**
${busiest.map((d) => `- **${d.name}** — ${d.count} bookings`).join("\n")}

**Action plan:**
1. Create a "${slowest[0]?.name} Special" — fixed-price menu or 2-for-1 drinks
2. Schedule a social media post every ${slowest[0]?.name} morning
3. Send a targeted email to inactive customers for ${slowest[0]?.name} bookings
4. Offer double loyalty points on ${slowest[0]?.name} and ${slowest[1]?.name}
5. Partner with a local business for a ${slowest[0]?.name} lunch deal`;
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

  return `## How to increase bookings

**Step 1 — Confirm ${pendingCount} pending reservations**
Call or message every pending guest today. Unconfirmed bookings have 2–3× higher no-show rates.

**Step 2 — Win back ${inactiveCount} inactive customers**
Set up an automation in Marketing: INACTIVE segment, 30-day trigger, "We miss you" email with 10% off.

**Step 3 — Optimize table layout**
Average party size is ${Math.round(avgPartySize._avg.partySize || 2)} guests. Make sure you have enough 2-tops and 4-tops at peak hours.

**Step 4 — Launch a mid-week promotion**
Your slowest days are prime for a prix fixe lunch or happy hour. Price it to fill seats, not maximize margin.

**Step 5 — Enable loyalty rewards**
Customers with loyalty points return 40% more often. Promote sign-up at every table.

**Step 6 — Ask for referrals**
After every great experience, ask happy guests to recommend you. Offer them 500 bonus loyalty points for each referral who books.`;
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

  return `## Revenue summary (last 30 days)

- Total revenue: **£${total.toFixed(2)}**
- Completed visits: **${revenue._count}**
- Average spend per visit: **£${avg.toFixed(2)}**

**How to grow revenue:**
1. **Increase covers** — win-back campaigns to inactive customers
2. **Increase average spend** — train staff to suggest appetizers, wine pairings, and desserts
3. **Reduce no-shows** — confirm all bookings 24h before
4. **Fill slow days** — mid-week promotions and loyalty double-points
5. **Upsell events** — private dining, tasting menus, holiday packages`;
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

  return `## Loyalty program overview

- **${accounts}** active loyalty members
- **${totalPoints._sum.points || 0}** total points outstanding
- **${recentTx}** transactions in the last 30 days

**Recommendations:**
1. ${accounts === 0 ? "Enable loyalty rules and promote sign-up at every table" : "Run a double-points weekend to drive redemptions"}
2. Create tiered rewards (500 pts = free appetizer, 1000 pts = free main)
3. Send birthday bonus points automatically via Marketing automations
4. Display loyalty balance on reservation confirmations`;
}

async function getMarketingAdvice(restaurantId: string) {
  const [inactiveCount, campaigns, automations, customersWithEmail] =
    await Promise.all([
      prisma.customer.count({
        where: {
          restaurantId,
          OR: [
            { lastVisitAt: { lt: subDays(new Date(), 30) } },
            { lastVisitAt: null },
          ],
        },
      }),
      prisma.campaign.count({ where: { restaurantId } }),
      prisma.automationRule.count({
        where: { restaurantId, isActive: true },
      }),
      prisma.customer.count({
        where: { restaurantId, email: { not: null } },
      }),
    ]);

  return `## Marketing action plan

**Your audience:** ${customersWithEmail} customers with email, ${inactiveCount} inactive (30+ days)

**Step 1 — ${campaigns === 0 ? "Send your first campaign" : "Send a re-engagement campaign"}**
Target the INACTIVE segment with a personal "We miss you" message and 10% off their next visit.

**Step 2 — ${automations === 0 ? "Set up win-back automation" : "Review your automations"}**
${automations === 0 ? "Create an automation: INACTIVE segment, 30-day trigger, auto-send offer." : `You have ${automations} active automation(s). Add a birthday trigger next.`}

**Step 3 — Segment your VIPs**
Tag top spenders as VIP in CRM and send exclusive early-access offers.

**Step 4 — Track results**
After each campaign, check open rates and booking conversions in Marketing history.

**Step 5 — Build your list**
Ask every guest for their email at booking. More emails = more reachable customers for campaigns.`;
}

async function getStaffAdvice(restaurantId: string) {
  const [staffCount, shiftsThisWeek] = await Promise.all([
    prisma.membership.count({ where: { restaurantId } }),
    prisma.shift.count({
      where: {
        restaurantId,
        date: {
          gte: startOfWeek(new Date(), { weekStartsOn: 1 }),
          lte: endOfWeek(new Date(), { weekStartsOn: 1 }),
        },
      },
    }),
  ]);

  return `## Staff & scheduling advice

**Current team:** ${staffCount} members, ${shiftsThisWeek} shifts scheduled this week

**Recommendations:**
1. **Schedule 2 weeks ahead** — use the Staff tab to plan coverage for busy nights
2. **Match staffing to demand** — add extra servers on your busiest days, reduce on slow days
3. **Cross-train staff** — every server should know host and bartender basics
4. **Pre-shift briefing** — 10-minute huddle before service: specials, VIP guests, expected covers
5. **Track labor cost** — aim for labor at 25–30% of revenue
6. **Incentivize upselling** — bonus for highest average check per server each week`;
}

async function getMenuAdvice(restaurantId: string) {
  const avgSpend = await prisma.reservation.aggregate({
    where: { restaurantId, status: "COMPLETED" },
    _avg: { spendAmount: true },
  });

  const avg = Number(avgSpend._avg.spendAmount || 0);

  return `## Menu & pricing strategy

**Current average spend per visit: £${avg.toFixed(2)}**

**Step 1 — Menu engineering**
Identify your stars (high profit, high popularity) and dogs (low profit, low popularity). Promote stars, rework or remove dogs.

**Step 2 — Strategic pricing**
Price anchor items 10–15% higher to make mid-range items feel like value. Use .95 pricing (£12.95 not £13).

**Step 3 — Increase average spend**
- Add a "Chef's recommendation" section (highest margin items)
- Create combo deals (main + drink + dessert for £X)
- Train staff on wine and cocktail pairings

**Step 4 — Seasonal rotation**
Change 2–3 items every 6–8 weeks to create urgency and social media content.

**Step 5 — Track per-item performance**
Start logging spend amounts on completed reservations to identify trends.`;
}

async function buildGeneralResponse(
  restaurantId: string,
  query: string
): Promise<string> {
  const improvement = await buildImprovementPlan(restaurantId);

  return `I understand you're asking: "${query}"

Here's a tailored action plan based on your restaurant's live data:

${improvement}

---

**Want deeper answers?** Ask me specifically about:
- Revenue, bookings, or performance
- Customer retention and VIP strategy
- Marketing campaigns and automations
- Staff scheduling and labor costs
- Menu pricing and upselling
- Slow days and promotions

Or add a **GROQ_API_KEY** (free at groq.com) or **GEMINI_API_KEY** (free at aistudio.google.com) in your Render environment for full AI-powered responses on any restaurant question.`;
}
