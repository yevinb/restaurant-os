import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendTransactionalEmail } from "@/lib/email";
import { renderEmailHtml } from "@/lib/marketing-utils";
import { getRegionDefaults } from "@/lib/regions";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  restaurantName: z.string().min(2),
  country: z.enum(["GB", "KW"]).optional().default("GB"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = registerSchema.parse(body);

    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 }
      );
    }

    const slug = data.restaurantName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const passwordHash = await bcrypt.hash(data.password, 12);

    const region = getRegionDefaults(data.country ?? "GB");

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: data.name,
          email: data.email.toLowerCase(),
          passwordHash,
        },
      });

      const organization = await tx.organization.create({
        data: {
          name: data.restaurantName,
          ownerId: user.id,
        },
      });

      const restaurant = await tx.restaurant.create({
        data: {
          name: data.restaurantName,
          slug: `${slug}-${Date.now().toString(36)}`,
          timezone: region.timezone,
          currency: region.currency,
          locale: region.locale,
          country: data.country ?? "GB",
          organizationId: organization.id,
        },
      });

      await tx.membership.create({
        data: {
          userId: user.id,
          restaurantId: restaurant.id,
          role: "OWNER",
        },
      });

      await tx.subscription.create({
        data: {
          restaurantId: restaurant.id,
          plan: "STARTER",
          status: "TRIALING",
          currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
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

      const tables = ["T1", "T2", "T3", "T4", "T5", "T6", "Bar 1", "Bar 2"];
      await tx.table.createMany({
        data: tables.map((name, i) => ({
          restaurantId: restaurant.id,
          name,
          capacity: i < 6 ? (i % 2 === 0 ? 2 : 4) : 2,
        })),
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

      return { user, restaurant };
    });

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:8080";
    const welcomeBody = `Hi ${data.name},

Welcome to RestaurantOS! Your restaurant "${result.restaurant.name}" is ready.

Your 14-day free trial has started. Sign in anytime at ${baseUrl}/login

Your online booking page:
${baseUrl}/book/${result.restaurant.slug}

Share that link so guests can reserve tables directly.`;

    await sendTransactionalEmail({
      to: data.email.toLowerCase(),
      toName: data.name,
      subject: "Welcome to RestaurantOS",
      body: welcomeBody,
      html: renderEmailHtml(welcomeBody),
      restaurantId: result.restaurant.id,
    });

    return NextResponse.json({
      success: true,
      restaurantId: result.restaurant.id,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Validation failed" },
        { status: 400 }
      );
    }
    console.error("Register error:", error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
