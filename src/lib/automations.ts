import { prisma } from "./prisma";
import { sendBulkEmails } from "./email";
import { getSegmentCustomers } from "./marketing";
import { canAccessFeature } from "./plans";

export async function runAutomationsForRestaurant(restaurantId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { restaurantId },
  });
  const plan = subscription?.plan ?? "STARTER";
  if (!canAccessFeature(plan, "marketing")) {
    return { ran: 0, totalEmailsSent: 0, results: [] };
  }

  const rules = await prisma.automationRule.findMany({
    where: { restaurantId, isActive: true },
  });

  const results = [];
  let totalEmailsSent = 0;

  for (const rule of rules) {
    const lastRun = rule.lastRunAt;
    if (lastRun) {
      const hoursSince = (Date.now() - lastRun.getTime()) / (1000 * 60 * 60);
      if (hoursSince < 20) continue;
    }

    const recipients = await getSegmentCustomers(
      restaurantId,
      rule.segment,
      rule.triggerDays
    );

    if (recipients.length === 0) continue;

    const campaign = await prisma.campaign.create({
      data: {
        restaurantId,
        name: `[Auto] ${rule.name}`,
        subject: rule.subject,
        body: rule.body,
        segment: rule.segment,
        status: "SENT",
        sentAt: new Date(),
        recipientCount: recipients.length,
      },
    });

    const emailResult = await sendBulkEmails(
      restaurantId,
      recipients,
      rule.subject,
      rule.body,
      campaign.id
    );
    totalEmailsSent += emailResult.sent;

    await prisma.automationRule.update({
      where: { id: rule.id },
      data: { lastRunAt: new Date() },
    });

    results.push({
      rule: rule.name,
      emailsSent: emailResult.sent,
      campaignId: campaign.id,
    });
  }

  return { ran: results.length, totalEmailsSent, results };
}

export async function runAllAutomations() {
  const restaurants = await prisma.restaurant.findMany({
    select: { id: true, name: true },
  });

  const summary = [];
  let totalRan = 0;
  let totalEmails = 0;

  for (const r of restaurants) {
    const result = await runAutomationsForRestaurant(r.id);
    totalRan += result.ran;
    totalEmails += result.totalEmailsSent;
    if (result.ran > 0) {
      summary.push({ restaurant: r.name, ...result });
    }
  }

  return { restaurants: restaurants.length, totalRan, totalEmails, summary };
}
