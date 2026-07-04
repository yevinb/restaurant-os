/**
 * Idempotent demo account seed for production.
 * Run: npx tsx scripts/seed-demo.ts
 * Safe to run multiple times — skips if demo user exists.
 */
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

async function main() {
  const email = "owner@demo.restaurant";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Demo account already exists:", email);
    return;
  }

  const passwordHash = await bcrypt.hash("demo1234", 12);

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name: "Demo Owner", email, passwordHash },
    });

    const organization = await tx.organization.create({
      data: { name: "Golden Fork Demo", ownerId: user.id },
    });

    const restaurant = await tx.restaurant.create({
      data: {
        name: "Golden Fork Demo",
        slug: "golden-fork-demo",
        address: "1 Demo Street, London",
        phone: "+44 20 7946 0958",
        whatsappNumber: "+96550000000",
        timezone: "Asia/Kuwait",
        currency: "KWD",
        locale: "ar",
        country: "KW",
        organizationId: organization.id,
      },
    });

    await tx.membership.create({
      data: { userId: user.id, restaurantId: restaurant.id, role: "OWNER" },
    });

    await tx.subscription.create({
      data: {
        restaurantId: restaurant.id,
        plan: "PRO",
        status: "ACTIVE",
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });

    await tx.loyaltyRule.create({
      data: {
        restaurantId: restaurant.id,
        name: "Standard Rewards",
        pointsPerPound: 1,
        minSpend: 10,
      },
    });

    for (let day = 0; day < 7; day++) {
      await tx.timeSlot.create({
        data: {
          restaurantId: restaurant.id,
          dayOfWeek: day,
          startTime: "12:00",
          endTime: "14:30",
          maxCovers: 40,
        },
      });
      await tx.timeSlot.create({
        data: {
          restaurantId: restaurant.id,
          dayOfWeek: day,
          startTime: "18:00",
          endTime: "22:00",
          maxCovers: 60,
        },
      });
    }

    console.log("Demo restaurant created:", restaurant.slug);
  });

  console.log("Demo login: owner@demo.restaurant / demo1234");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
