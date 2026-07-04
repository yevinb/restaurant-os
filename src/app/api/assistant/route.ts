import { withTenant, json } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getAssistantResponse } from "@/lib/openai-assistant";
import { canAccessFeature } from "@/lib/plans";
import { z } from "zod";

const messageSchema = z.object({
  message: z.string().min(1),
});

function getAiMode(): "groq" | "openai" | "rules" {
  const groq = process.env.GROQ_API_KEY;
  if (groq && !groq.includes("placeholder")) return "groq";
  const openai = process.env.OPENAI_API_KEY;
  if (openai && !openai.includes("placeholder")) return "openai";
  return "rules";
}

export const GET = withTenant(async (_req, ctx) => {
  if (!canAccessFeature(ctx.plan, "aiAssistant")) {
    return json({ error: "Upgrade to Pro plan for AI Assistant" }, 403);
  }

  const messages = await prisma.chatMessage.findMany({
    where: {
      restaurantId: ctx.restaurantId,
      userId: ctx.userId,
    },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  return json({ messages, aiMode: getAiMode() });
});

export const POST = withTenant(async (req, ctx) => {
  if (!canAccessFeature(ctx.plan, "aiAssistant")) {
    return json({ error: "Upgrade to Pro plan for AI Assistant" }, 403);
  }

  const body = await req.json();
  const { message } = messageSchema.parse(body);

  const priorMessages = await prisma.chatMessage.findMany({
    where: { restaurantId: ctx.restaurantId, userId: ctx.userId },
    orderBy: { createdAt: "asc" },
    take: 20,
    select: { role: true, content: true },
  });

  await prisma.chatMessage.create({
    data: {
      restaurantId: ctx.restaurantId,
      userId: ctx.userId,
      role: "user",
      content: message,
    },
  });

  const history = priorMessages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  const { response, source } = await getAssistantResponse(
    ctx.restaurantId,
    message,
    history
  );

  const assistantMessage = await prisma.chatMessage.create({
    data: {
      restaurantId: ctx.restaurantId,
      userId: ctx.userId,
      role: "assistant",
      content: response,
    },
  });

  return json({ response, source, message: assistantMessage });
});
