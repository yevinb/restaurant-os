import { withTenant, json } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { sendBulkEmails } from "@/lib/email";
import { isEmailConfigured } from "@/lib/email-config";
import { runAutomationsForRestaurant } from "@/lib/automations";
import { canAccessFeature, getPlanLimits } from "@/lib/plans";
import {
  CAMPAIGN_TEMPLATES,
  generateCampaignCopy,
  getQuickSendTemplate,
  getSegmentCustomers,
  getSegmentStats,
  personalize,
  renderEmailHtml,
} from "@/lib/marketing";
import { z } from "zod";

const campaignSchema = z.object({
  name: z.string().min(1),
  subject: z.string().min(1),
  body: z.string().min(1),
  segment: z.enum(["VIP", "INACTIVE", "HIGH_SPENDERS", "ALL"]),
  triggerDays: z.number().optional(),
});

const automationSchema = z.object({
  name: z.string().min(1),
  triggerDays: z.number().min(1),
  segment: z.enum(["VIP", "INACTIVE", "HIGH_SPENDERS", "ALL"]),
  subject: z.string().min(1),
  body: z.string().min(1),
});

export const GET = withTenant(async (req, ctx) => {
  if (!canAccessFeature(ctx.plan, "marketing")) {
    return json({ error: "Upgrade to Growth plan for marketing" }, 403);
  }

  const { searchParams } = new URL(req.url);
  const preview = searchParams.get("preview");

  if (preview) {
    const triggerDays = parseInt(searchParams.get("days") || "30");
    const customers = await getSegmentCustomers(
      ctx.restaurantId,
      preview,
      triggerDays
    );
    return json({
      segment: preview,
      total: customers.length,
      reachable: customers.filter((c) => c.email).length,
      sample: customers.slice(0, 5).map((c) => ({
        name: `${c.firstName} ${c.lastName}`,
        email: c.email ? "✓" : "—",
        lastVisit: c.lastVisitAt,
      })),
    });
  }

  const [campaigns, automationRules, segments, templates, emailLogs] =
    await Promise.all([
      prisma.campaign.findMany({
        where: { restaurantId: ctx.restaurantId },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          name: true,
          subject: true,
          segment: true,
          status: true,
          recipientCount: true,
          openRate: true,
          sentAt: true,
          createdAt: true,
        },
      }),
      prisma.automationRule.findMany({
        where: { restaurantId: ctx.restaurantId },
        orderBy: { createdAt: "desc" },
        take: 15,
      }),
      getSegmentStats(ctx.restaurantId),
      Promise.resolve(CAMPAIGN_TEMPLATES),
      prisma.emailLog.findMany({
        where: { restaurantId: ctx.restaurantId },
        orderBy: { sentAt: "desc" },
        take: 20,
        select: {
          id: true,
          toEmail: true,
          toName: true,
          subject: true,
          status: true,
          sentAt: true,
        },
      }),
    ]);

  return json({
    campaigns,
    automationRules,
    segments,
    templates,
    emailLogs,
    emailConfigured: isEmailConfigured(),
  });
});

export const POST = withTenant(async (req, ctx) => {
  const body = await req.json();

  if (body.action === "preview") {
    const customers = await getSegmentCustomers(
      ctx.restaurantId,
      body.segment || "INACTIVE",
      body.triggerDays || 30
    );
    const sample = customers[0];
    const html = sample
      ? renderEmailHtml(personalize(body.body || "", sample.firstName))
      : renderEmailHtml(body.body || "");
    return json({
      recipientCount: customers.length,
      reachableCount: customers.filter((c) => c.email).length,
      html,
      sampleRecipient: sample
        ? `${sample.firstName} ${sample.lastName}`
        : null,
    });
  }

  if (body.action === "generateCopy") {
    if (!canAccessFeature(ctx.plan, "marketing")) {
      return json({ error: "Upgrade to Growth plan for AI campaign copy" }, 403);
    }
    const copy = await generateCampaignCopy({
      restaurantName: ctx.restaurant.name,
      segment: body.segment || "INACTIVE",
      goal: body.goal || "Increase bookings this week",
      tone: body.tone,
    });
    return json(copy);
  }

  if (body.action === "quickSend") {
    if (!canAccessFeature(ctx.plan, "marketing")) {
      return json({ error: "Upgrade to Growth plan for marketing campaigns" }, 403);
    }

    const segment = (body.segment || "INACTIVE") as
      | "VIP"
      | "INACTIVE"
      | "HIGH_SPENDERS"
      | "ALL";
    const template = getQuickSendTemplate(segment);
    const triggerDays = body.triggerDays || 30;
    const recipients = await getSegmentCustomers(
      ctx.restaurantId,
      segment,
      triggerDays
    );
    const reachable = recipients.filter((c) => c.email);

    if (reachable.length === 0) {
      return json(
        {
          error:
            "No customers with email addresses in this segment. Add emails in CRM first.",
        },
        400
      );
    }

    const campaign = await prisma.campaign.create({
      data: {
        restaurantId: ctx.restaurantId,
        name: template.name,
        subject: template.subject,
        body: template.body,
        segment,
        status: "SENT",
        sentAt: new Date(),
        recipientCount: reachable.length,
      },
    });

    const emailResult = await sendBulkEmails(
      ctx.restaurantId,
      recipients,
      template.subject,
      template.body,
      campaign.id
    );

    return json({
      campaign,
      emailsSent: emailResult.sent,
      emailsSkipped: emailResult.skipped,
      emailsFailed: emailResult.failed,
      segment,
      templateName: template.name,
      logOnly: !isEmailConfigured(),
    });
  }

  if (body.action === "send") {
    if (!canAccessFeature(ctx.plan, "marketing")) {
      return json({ error: "Upgrade to Growth plan for marketing campaigns" }, 403);
    }

    const limits = getPlanLimits(ctx.plan);
    if (Number.isFinite(limits.campaigns)) {
      const sentCount = await prisma.campaign.count({
        where: { restaurantId: ctx.restaurantId, status: "SENT" },
      });
      if (sentCount >= limits.campaigns) {
        return json(
          { error: `Campaign limit reached (${limits.campaigns}). Upgrade your plan.` },
          403
        );
      }
    }

    const data = campaignSchema.parse(body);
    const triggerDays = data.triggerDays || 30;
    const recipients = await getSegmentCustomers(
      ctx.restaurantId,
      data.segment,
      triggerDays
    );

    const campaign = await prisma.campaign.create({
      data: {
        restaurantId: ctx.restaurantId,
        name: data.name,
        subject: data.subject,
        body: data.body,
        segment: data.segment,
        status: "SENT",
        sentAt: new Date(),
        recipientCount: recipients.length,
      },
    });

    const emailResult = await sendBulkEmails(
      ctx.restaurantId,
      recipients,
      data.subject,
      data.body,
      campaign.id
    );

    return json({
      campaign,
      emailsSent: emailResult.sent,
      emailsSkipped: emailResult.skipped,
      logOnly: !isEmailConfigured(),
    });
  }

  if (body.action === "createAutomation") {
    if (!canAccessFeature(ctx.plan, "marketing")) {
      return json({ error: "Upgrade to Growth plan for automations" }, 403);
    }
    const data = automationSchema.parse(body);
    const rule = await prisma.automationRule.create({
      data: {
        restaurantId: ctx.restaurantId,
        name: data.name,
        triggerDays: data.triggerDays,
        segment: data.segment,
        subject: data.subject,
        body: data.body,
        isActive: true,
      },
    });
    return json(rule, 201);
  }

  if (body.action === "updateAutomation") {
    if (!canAccessFeature(ctx.plan, "marketing")) {
      return json({ error: "Upgrade to Growth plan for automations" }, 403);
    }
    const existing = await prisma.automationRule.findFirst({
      where: { id: body.id, restaurantId: ctx.restaurantId },
    });
    if (!existing) return json({ error: "Rule not found" }, 404);

    const rule = await prisma.automationRule.update({
      where: { id: body.id },
      data: {
        name: body.name ?? existing.name,
        triggerDays: body.triggerDays ?? existing.triggerDays,
        segment: body.segment ?? existing.segment,
        subject: body.subject ?? existing.subject,
        body: body.body ?? existing.body,
        isActive: body.isActive ?? existing.isActive,
      },
    });
    return json(rule);
  }

  if (body.action === "deleteAutomation") {
    if (!canAccessFeature(ctx.plan, "marketing")) {
      return json({ error: "Upgrade to Growth plan for automations" }, 403);
    }
    const existing = await prisma.automationRule.findFirst({
      where: { id: body.id, restaurantId: ctx.restaurantId },
    });
    if (!existing) return json({ error: "Rule not found" }, 404);
    await prisma.automationRule.delete({ where: { id: body.id } });
    return json({ success: true });
  }

  if (body.action === "runAutomations") {
    if (!canAccessFeature(ctx.plan, "marketing")) {
      return json({ error: "Upgrade to Growth plan for automations" }, 403);
    }

    const result = await runAutomationsForRestaurant(ctx.restaurantId);
    return json(result);
  }

  const data = campaignSchema.parse(body);
  const campaign = await prisma.campaign.create({
    data: {
      restaurantId: ctx.restaurantId,
      ...data,
      status: "DRAFT",
    },
  });

  return json(campaign, 201);
});
