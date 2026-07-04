import { prisma } from "./prisma";

export async function assertRestaurantMember(restaurantId: string, userId: string) {
  const membership = await prisma.membership.findFirst({
    where: { restaurantId, userId },
  });
  if (!membership) {
    throw new Error("User is not a member of this restaurant");
  }
  return membership;
}
