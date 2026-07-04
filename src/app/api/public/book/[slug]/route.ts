import { NextResponse } from "next/server";
import { addMinutes, format, parse } from "date-fns";
import { prisma } from "@/lib/prisma";
import { sendTransactionalEmail } from "@/lib/email";
import { renderEmailHtml } from "@/lib/marketing-utils";
import {
  checkSlotAvailable,
  getAvailableSlots,
  getRestaurantBySlug,
} from "@/lib/public-booking";
import { getMonthlyReservationCount } from "@/lib/reservations";
import { getPlanLimits } from "@/lib/plans";
import { z } from "zod";

const bookSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  date: z.string(),
  startTime: z.string(),
  partySize: z.number().min(1).max(20),
  notes: z.string().optional(),
});

export async function GET(
  req: Request,
  { params }: { params: { slug: string } }
) {
  const restaurant = await getRestaurantBySlug(params.slug);
  if (!restaurant) {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");

  if (date) {
    const slots = await getAvailableSlots(restaurant.id, date);
    return NextResponse.json({ restaurant, date, slots });
  }

  return NextResponse.json({ restaurant });
}

export async function POST(
  req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const restaurant = await getRestaurantBySlug(params.slug);
    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const subscription = await prisma.subscription.findUnique({
      where: { restaurantId: restaurant.id },
    });
    const plan = subscription?.plan ?? "STARTER";
    const limits = getPlanLimits(plan);

    if (Number.isFinite(limits.reservationsPerMonth)) {
      const count = await getMonthlyReservationCount(restaurant.id);
      if (count >= limits.reservationsPerMonth) {
        return NextResponse.json(
          { error: "This restaurant is not accepting online bookings right now." },
          { status: 403 }
        );
      }
    }

    const data = bookSchema.parse(await req.json());

    const available = await checkSlotAvailable(
      restaurant.id,
      data.date,
      data.startTime,
      data.partySize
    );
    if (!available) {
      return NextResponse.json(
        { error: "That time is no longer available. Please pick another slot." },
        { status: 409 }
      );
    }

    const bookingDate = new Date(data.date);
    const endTime = format(
      addMinutes(parse(data.startTime, "HH:mm", bookingDate), 30),
      "HH:mm"
    );

    let customer = await prisma.customer.findFirst({
      where: {
        restaurantId: restaurant.id,
        email: data.email.toLowerCase(),
      },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          restaurantId: restaurant.id,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email.toLowerCase(),
          phone: data.phone,
          tags: ["REGULAR"],
        },
      });
      await prisma.loyaltyAccount.create({
        data: { restaurantId: restaurant.id, customerId: customer.id },
      });
    }

    const reservation = await prisma.reservation.create({
      data: {
        restaurantId: restaurant.id,
        customerId: customer.id,
        date: new Date(data.date),
        startTime: data.startTime,
        endTime,
        partySize: data.partySize,
        status: "CONFIRMED",
        notes: data.notes,
      },
      include: { customer: true },
    });

    await prisma.analyticsEvent.create({
      data: {
        restaurantId: restaurant.id,
        type: "RESERVATION_CREATED",
        customerId: customer.id,
        metadata: { reservationId: reservation.id, source: "public_booking" },
      },
    });

    const dateLabel = new Date(data.date).toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    const confirmBody = `Hi ${data.firstName},

Your table at ${restaurant.name} is confirmed.

Date: ${dateLabel}
Time: ${data.startTime}
Party size: ${data.partySize}

We look forward to seeing you!`;

    await sendTransactionalEmail({
      to: data.email,
      toName: `${data.firstName} ${data.lastName}`,
      subject: `Reservation confirmed — ${restaurant.name}`,
      body: confirmBody,
      html: renderEmailHtml(confirmBody),
      restaurantId: restaurant.id,
    });

    return NextResponse.json(
      {
        success: true,
        reservation: {
          id: reservation.id,
          date: data.date,
          startTime: data.startTime,
          partySize: data.partySize,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid booking" },
        { status: 400 }
      );
    }
    console.error("Public booking error:", error);
    return NextResponse.json({ error: "Booking failed" }, { status: 500 });
  }
}
