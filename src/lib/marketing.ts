import { prisma } from "./prisma";
import { subDays } from "date-fns";
import { CAMPAIGN_TEMPLATES, personalize, renderEmailHtml } from "./marketing-utils";

export { CAMPAIGN_TEMPLATES, personalize, renderEmailHtml };

export async function getSegmentCustomers(
  restaurantId: string,
  segment: string,
  triggerDays = 30
) {
  switch (segment) {
    case "VIP":
      return prisma.customer.findMany({
        where: { restaurantId, tags: { has: "VIP" } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          lastVisitAt: true,
          totalSpend: true,
        },
      });
    case "INACTIVE": {
      const cutoff = subDays(new Date(), triggerDays);
      return prisma.customer.findMany({
        where: {
          restaurantId,
          OR: [{ lastVisitAt: { lt: cutoff } }, { lastVisitAt: null }],
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          lastVisitAt: true,
          totalSpend: true,
        },
      });
    }
    case "HIGH_SPENDERS":
      return prisma.customer.findMany({
        where: { restaurantId },
        orderBy: { totalSpend: "desc" },
        take: 20,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          lastVisitAt: true,
          totalSpend: true,
        },
      });
    default:
      return prisma.customer.findMany({
        where: { restaurantId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          lastVisitAt: true,
          totalSpend: true,
        },
      });
  }
}

import { getSegmentStats } from "./marketing-segments";

export { getSegmentStats };

export async function generateCampaignCopy(params: {
  restaurantName: string;
  segment: string;
  goal: string;
  tone?: string;
}) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.includes("placeholder")) {
    return null;
  }

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You write high-converting restaurant marketing emails. Return ONLY valid JSON with keys: "subject", "body", "campaignName". Use {name} for personalization. Currency GBP (£). Tone: ${params.tone || "warm, professional, urgent but friendly"}. Body should be 80-150 words with line breaks.`,
        },
        {
          role: "user",
          content: `Restaurant: ${params.restaurantName}\nSegment: ${params.segment}\nGoal: ${params.goal}\nWrite an email campaign.`,
        },
      ],
      max_tokens: 600,
      temperature: 0.7,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) return null;

  try {
    return JSON.parse(content) as {
      subject: string;
      body: string;
      campaignName: string;
    };
  } catch {
    return null;
  }
}
