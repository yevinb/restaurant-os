import { withTenant, json } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import {
  getAssistantResponse,
  getActiveAiProvider,
  type AiProvider,
} from "@/lib/openai-assistant";
import { canAccessFeature } from "@/lib/plans";
import { z } from "zod";

const messageSchema = z.object({
  message: z.string().min(1),
});

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

  const aiMode = getActiveAiProvider();

  return json({
    messages,
    aiMode,
    aiConfigured: aiMode !== "rules",
  });
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

  return json({
    response,
    source: source as AiProvider,
    message: assistantMessage,
  });
});

export const DELETE = withTenant(async (_req, ctx) => {
  await prisma.chatMessage.deleteMany({
    where: {
      restaurantId: ctx.restaurantId,
      userId: ctx.userId,
    },
  });
  return json({ ok: true });
});
