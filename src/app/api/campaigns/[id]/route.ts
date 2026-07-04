import { withTenant, json } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { canAccessFeature } from "@/lib/plans";
import { requireRole } from "@/lib/tenant";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  subject: z.string().min(1).optional(),
  body: z.string().min(1).optional(),
  segment: z.enum(["VIP", "INACTIVE", "HIGH_SPENDERS", "ALL"]).optional(),
  status: z.enum(["DRAFT", "SCHEDULED", "SENT", "FAILED"]).optional(),
});

export const GET = withTenant(async (req, ctx) => {
  if (!canAccessFeature(ctx.plan, "marketing")) {
    return json({ error: "Upgrade to Growth plan for marketing" }, 403);
  }
  const id = new URL(req.url).pathname.split("/").pop()!;
  const campaign = await prisma.campaign.findFirst({
    where: { id, restaurantId: ctx.restaurantId },
  });
  if (!campaign) return json({ error: "Not found" }, 404);
  return json(campaign);
});

export const PATCH = withTenant(async (req, ctx) => {
  requireRole(ctx.role, ["OWNER", "MANAGER"]);
  if (!canAccessFeature(ctx.plan, "marketing")) {
    return json({ error: "Upgrade to Growth plan for marketing" }, 403);
  }
  const id = new URL(req.url).pathname.split("/").pop()!;
  const existing = await prisma.campaign.findFirst({
    where: { id, restaurantId: ctx.restaurantId },
  });
  if (!existing) return json({ error: "Not found" }, 404);
  if (existing.status === "SENT") {
    return json({ error: "Sent campaigns cannot be edited" }, 400);
  }

  const data = updateSchema.parse(await req.json());
  const campaign = await prisma.campaign.update({
    where: { id },
    data,
  });
  return json(campaign);
});

export const DELETE = withTenant(async (req, ctx) => {
  requireRole(ctx.role, ["OWNER", "MANAGER"]);
  if (!canAccessFeature(ctx.plan, "marketing")) {
    return json({ error: "Upgrade to Growth plan for marketing" }, 403);
  }
  const id = new URL(req.url).pathname.split("/").pop()!;
  const existing = await prisma.campaign.findFirst({
    where: { id, restaurantId: ctx.restaurantId },
  });
  if (!existing) return json({ error: "Not found" }, 404);
  await prisma.campaign.delete({ where: { id } });
  return json({ success: true });
});
