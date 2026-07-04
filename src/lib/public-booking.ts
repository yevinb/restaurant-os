import { prisma } from "./prisma";
import { addMinutes, format, parse } from "date-fns";

const SLOT_MINUTES = 30;

export async function getRestaurantBySlug(slug: string) {
  return prisma.restaurant.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      address: true,
      phone: true,
      timezone: true,
    },
  });
}

function generateTimes(startTime: string, endTime: string) {
  const times: string[] = [];
  let current = parse(startTime, "HH:mm", new Date());
  const end = parse(endTime, "HH:mm", new Date());

  while (current < end) {
    times.push(format(current, "HH:mm"));
    current = addMinutes(current, SLOT_MINUTES);
  }
  return times;
}

export async function getAvailableSlots(restaurantId: string, dateStr: string) {
  const date = new Date(dateStr);
  const dayOfWeek = date.getDay();

  const slots = await prisma.timeSlot.findMany({
    where: { restaurantId, dayOfWeek, isActive: true },
    orderBy: { startTime: "asc" },
  });

  if (slots.length === 0) return [];

  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  const reservations = await prisma.reservation.findMany({
    where: {
      restaurantId,
      date: { gte: start, lte: end },
      status: { not: "CANCELLED" },
    },
    select: { startTime: true, partySize: true },
  });

  const coversByTime = new Map<string, number>();
  for (const r of reservations) {
    coversByTime.set(
      r.startTime,
      (coversByTime.get(r.startTime) || 0) + r.partySize
    );
  }

  const available: Array<{ time: string; endTime: string; remaining: number }> =
    [];

  for (const slot of slots) {
    const times = generateTimes(slot.startTime, slot.endTime);
    for (const time of times) {
      const used = coversByTime.get(time) || 0;
      const remaining = slot.maxCovers - used;
      if (remaining > 0) {
        available.push({
          time,
          endTime: format(addMinutes(parse(time, "HH:mm", new Date()), SLOT_MINUTES), "HH:mm"),
          remaining,
        });
      }
    }
  }

  return available;
}

export async function checkSlotAvailable(
  restaurantId: string,
  dateStr: string,
  startTime: string,
  partySize: number
) {
  const slots = await getAvailableSlots(restaurantId, dateStr);
  const match = slots.find((s) => s.time === startTime);
  return match ? match.remaining >= partySize : false;
}
