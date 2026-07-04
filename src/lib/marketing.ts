import { prisma } from "./prisma";
import { subDays } from "date-fns";
import {
  CAMPAIGN_TEMPLATES,
  getQuickSendTemplate,
  personalize,
  renderEmailHtml,
} from "./marketing-utils";

export { CAMPAIGN_TEMPLATES, personalize, renderEmailHtml, getQuickSendTemplate };
export { QUICK_SEND_LABELS } from "./marketing-utils";
export type { CampaignSegment } from "./marketing-utils";

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

type CopyParams = {
  restaurantName: string;
  segment: string;
  goal: string;
  tone?: string;
};

type GeneratedCopy = {
  subject: string;
  body: string;
  campaignName: string;
  source: "groq" | "gemini" | "openai" | "template";
};

function buildAiPrompt(params: CopyParams) {
  return {
    system: `You write high-converting restaurant marketing emails. Return ONLY valid JSON with keys: "subject", "body", "campaignName". Use {name} for personalization in subject and body. Currency GBP (£). Tone: ${params.tone || "warm, professional, urgent but friendly"}. Body should be 80-150 words with line breaks.`,
    user: `Restaurant: ${params.restaurantName}\nSegment: ${params.segment}\nGoal: ${params.goal}\nWrite an email campaign.`,
  };
}

async function callGroqCopy(prompt: ReturnType<typeof buildAiPrompt>) {
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
      messages: [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user },
      ],
      max_tokens: 600,
      temperature: 0.7,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  return parseCopyJson(data.choices?.[0]?.message?.content);
}

async function callGeminiCopy(prompt: ReturnType<typeof buildAiPrompt>) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.includes("placeholder")) return null;

  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `${prompt.system}\n\n${prompt.user}` }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 600,
          temperature: 0.7,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!res.ok) return null;
  const data = await res.json();
  return parseCopyJson(data.candidates?.[0]?.content?.parts?.[0]?.text);
}

async function callOpenAICopy(prompt: ReturnType<typeof buildAiPrompt>) {
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
      messages: [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user },
      ],
      max_tokens: 600,
      temperature: 0.7,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  return parseCopyJson(data.choices?.[0]?.message?.content);
}

function parseCopyJson(content: string | undefined) {
  if (!content) return null;
  try {
    const parsed = JSON.parse(content) as {
      subject?: string;
      body?: string;
      campaignName?: string;
    };
    if (!parsed.subject || !parsed.body) return null;
    return {
      subject: parsed.subject,
      body: parsed.body,
      campaignName: parsed.campaignName || "AI Campaign",
    };
  } catch {
    return null;
  }
}

function templateFallback(params: CopyParams): GeneratedCopy {
  const template = getQuickSendTemplate(params.segment);
  return {
    subject: template.subject,
    body: template.body,
    campaignName: `${template.name} — ${params.goal.slice(0, 40)}`,
    source: "template",
  };
}

export async function generateCampaignCopy(
  params: CopyParams
): Promise<GeneratedCopy> {
  const prompt = buildAiPrompt(params);

  const groq = await callGroqCopy(prompt);
  if (groq) return { ...groq, source: "groq" };

  const gemini = await callGeminiCopy(prompt);
  if (gemini) return { ...gemini, source: "gemini" };

  const openai = await callOpenAICopy(prompt);
  if (openai) return { ...openai, source: "openai" };

  return templateFallback(params);
}
