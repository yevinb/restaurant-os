import { prisma } from "./prisma";
import { LoyaltyTransactionType } from "@prisma/client";

export async function awardLoyaltyPoints(
  restaurantId: string,
  customerId: string,
  spendAmount: number,
  reservationId?: string
) {
  const rule = await prisma.loyaltyRule.findFirst({
    where: { restaurantId, isActive: true },
  });

  if (!rule || spendAmount < Number(rule.minSpend)) return null;

  const points = Math.floor(spendAmount * Number(rule.pointsPerPound));

  let account = await prisma.loyaltyAccount.findUnique({
    where: { customerId },
  });

  if (!account) {
    account = await prisma.loyaltyAccount.create({
      data: { restaurantId, customerId, points: 0, lifetimePts: 0 },
    });
  }

  const [updated] = await prisma.$transaction([
    prisma.loyaltyAccount.update({
      where: { id: account.id },
      data: {
        points: { increment: points },
        lifetimePts: { increment: points },
      },
    }),
    prisma.loyaltyTransaction.create({
      data: {
        restaurantId,
        loyaltyAccountId: account.id,
        type: LoyaltyTransactionType.EARN,
        points,
        description: `Earned from £${spendAmount.toFixed(2)} spend`,
        reservationId,
      },
    }),
  ]);

  return updated;
}

export async function redeemLoyaltyPoints(
  restaurantId: string,
  customerId: string,
  points: number,
  description: string
) {
  const account = await prisma.loyaltyAccount.findUnique({
    where: { customerId },
  });

  if (!account || account.points < points) {
    throw new Error("Insufficient points");
  }

  if (account.restaurantId !== restaurantId) {
    throw new Error("Account not found");
  }

  const [updated] = await prisma.$transaction([
    prisma.loyaltyAccount.update({
      where: { id: account.id },
      data: { points: { decrement: points } },
    }),
    prisma.loyaltyTransaction.create({
      data: {
        restaurantId,
        loyaltyAccountId: account.id,
        type: LoyaltyTransactionType.REDEEM,
        points: -points,
        description,
      },
    }),
  ]);

  return updated;
}
