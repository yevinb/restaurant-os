import { withTenant, json } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { redeemLoyaltyPoints } from "@/lib/loyalty";
import { canAccessFeature } from "@/lib/plans";
import { z } from "zod";

export const GET = withTenant(async (_req, ctx) => {
  if (!canAccessFeature(ctx.plan, "loyalty")) {
    return json({ error: "Upgrade to Growth plan for loyalty features" }, 403);
  }

  const [accounts, rules, transactions] = await Promise.all([
    prisma.loyaltyAccount.findMany({
      where: { restaurantId: ctx.restaurantId },
      include: { customer: true },
      orderBy: { points: "desc" },
    }),
    prisma.loyaltyRule.findMany({
      where: { restaurantId: ctx.restaurantId },
    }),
    prisma.loyaltyTransaction.findMany({
      where: { restaurantId: ctx.restaurantId },
      include: {
        loyaltyAccount: { include: { customer: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return json({ accounts, rules, transactions });
});

const redeemSchema = z.object({
  customerId: z.string(),
  points: z.number().min(1),
  description: z.string(),
});

const updateRuleSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  pointsPerPound: z.number().min(0),
  minSpend: z.number().min(0),
  isActive: z.boolean().optional(),
});

export const POST = withTenant(async (req, ctx) => {
  if (!canAccessFeature(ctx.plan, "loyalty")) {
    return json({ error: "Upgrade to Growth plan for loyalty features" }, 403);
  }

  const body = await req.json();

  if (body.action === "redeem") {
    try {
      const data = redeemSchema.parse(body);
      const account = await redeemLoyaltyPoints(
        ctx.restaurantId,
        data.customerId,
        data.points,
        data.description
      );
      return json(account);
    } catch (err) {
      return json(
        { error: err instanceof Error ? err.message : "Redemption failed" },
        400
      );
    }
  }

  if (body.action === "updateRule") {
    const data = updateRuleSchema.parse(body);
    const existing = await prisma.loyaltyRule.findFirst({
      where: { id: data.id, restaurantId: ctx.restaurantId },
    });
    if (!existing) return json({ error: "Rule not found" }, 404);

    const rule = await prisma.loyaltyRule.update({
      where: { id: existing.id },
      data: {
        pointsPerPound: data.pointsPerPound,
        minSpend: data.minSpend,
        name: data.name,
        isActive: data.isActive ?? true,
      },
    });
    return json(rule);
  }

  return json({ error: "Invalid action" }, 400);
});
