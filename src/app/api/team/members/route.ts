import { withTenant, json } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const GET = withTenant(async (_req, ctx) => {
  const members = await prisma.membership.findMany({
    where: { restaurantId: ctx.restaurantId },
    select: {
      role: true,
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return json({
    staff: members.map((m) => ({
      user: m.user,
      role: m.role,
    })),
  });
});
