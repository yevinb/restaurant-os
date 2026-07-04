import "dotenv/config";
import {
  PrismaClient,
  Role,
  ReservationStatus,
  CustomerTag,
  SubscriptionPlan,
  SubscriptionStatus,
  ShiftRole,
  AnalyticsEventType,
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import { addDays, subDays, setHours, setMinutes } from "date-fns";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const FIRST_NAMES = [
  "James", "Emma", "Oliver", "Sophia", "William", "Isabella", "Henry", "Charlotte",
  "George", "Amelia", "Thomas", "Mia", "Arthur", "Harper", "Jack", "Evelyn",
  "Noah", "Abigail", "Leo", "Emily", "Oscar", "Elizabeth", "Harry", "Sofia",
  "Charlie", "Avery", "Freddie", "Ella", "Alfie", "Scarlett",
];

const LAST_NAMES = [
  "Smith", "Jones", "Williams", "Taylor", "Brown", "Davies", "Evans", "Wilson",
  "Thomas", "Roberts", "Johnson", "Lewis", "Walker", "Robinson", "Wood",
];

const STATUSES: ReservationStatus[] = [
  "PENDING",
  "CONFIRMED",
  "SEATED",
  "COMPLETED",
  "CANCELLED",
];

const TIMES = ["12:00", "12:30", "13:00", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00"];

async function main() {
  console.log("🌱 Seeding RestaurantOS demo data...");

  await prisma.chatMessage.deleteMany();
  await prisma.analyticsEvent.deleteMany();
  await prisma.loyaltyTransaction.deleteMany();
  await prisma.loyaltyAccount.deleteMany();
  await prisma.loyaltyRule.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.automationRule.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.timeSlot.deleteMany();
  await prisma.table.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.restaurant.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("demo1234", 12);

  const owner = await prisma.user.create({
    data: {
      name: "Alex Morgan",
      email: "owner@demo.restaurant",
      passwordHash,
    },
  });

  const manager = await prisma.user.create({
    data: {
      name: "Sarah Chen",
      email: "manager@demo.restaurant",
      passwordHash,
    },
  });

  const staff1 = await prisma.user.create({
    data: {
      name: "Tom Bradley",
      email: "staff1@demo.restaurant",
      passwordHash,
    },
  });

  const staff2 = await prisma.user.create({
    data: {
      name: "Lucy Adams",
      email: "staff2@demo.restaurant",
      passwordHash,
    },
  });

  const restaurant = await prisma.restaurant.create({
    data: {
      name: "The Golden Fork",
      slug: "golden-fork-demo",
      address: "42 Mayfair Lane, London W1K 2AB",
      phone: "+44 20 7946 0958",
      timezone: "Europe/London",
    },
  });

  await prisma.membership.createMany({
    data: [
      { userId: owner.id, restaurantId: restaurant.id, role: Role.OWNER },
      { userId: manager.id, restaurantId: restaurant.id, role: Role.MANAGER },
      { userId: staff1.id, restaurantId: restaurant.id, role: Role.STAFF },
      { userId: staff2.id, restaurantId: restaurant.id, role: Role.STAFF },
    ],
  });

  await prisma.subscription.create({
    data: {
      restaurantId: restaurant.id,
      plan: SubscriptionPlan.PRO,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodEnd: addDays(new Date(), 30),
    },
  });

  await prisma.loyaltyRule.create({
    data: {
      restaurantId: restaurant.id,
      name: "Standard Rewards",
      pointsPerPound: 1,
      minSpend: 10,
    },
  });

  const tableData = [
    { name: "T1", capacity: 2 },
    { name: "T2", capacity: 2 },
    { name: "T3", capacity: 4 },
    { name: "T4", capacity: 4 },
    { name: "T5", capacity: 6 },
    { name: "T6", capacity: 6 },
    { name: "Bar 1", capacity: 2 },
    { name: "Bar 2", capacity: 2 },
    { name: "Patio 1", capacity: 4 },
    { name: "Patio 2", capacity: 4 },
  ];

  const tables = await Promise.all(
    tableData.map((t) =>
      prisma.table.create({
        data: { restaurantId: restaurant.id, ...t },
      })
    )
  );

  for (let day = 0; day < 7; day++) {
    await prisma.timeSlot.createMany({
      data: [
        { restaurantId: restaurant.id, dayOfWeek: day, startTime: "12:00", endTime: "14:30", maxCovers: 40 },
        { restaurantId: restaurant.id, dayOfWeek: day, startTime: "18:00", endTime: "22:00", maxCovers: 60 },
      ],
    });
  }

  const customers = await Promise.all(
    Array.from({ length: 30 }, (_, i) => {
      const tags: CustomerTag[] = [];
      if (i < 5) tags.push("VIP");
      else if (i > 22) tags.push("INACTIVE");
      else tags.push("REGULAR");

      const totalSpend = Math.round((Math.random() * 800 + 50) * 100) / 100;
      const visitCount = Math.floor(Math.random() * 12) + 1;

      return prisma.customer.create({
        data: {
          restaurantId: restaurant.id,
          firstName: FIRST_NAMES[i],
          lastName: LAST_NAMES[i % LAST_NAMES.length],
          email: `${FIRST_NAMES[i].toLowerCase()}.${LAST_NAMES[i % LAST_NAMES.length].toLowerCase()}@email.com`,
          phone: `+44 7${String(Math.floor(Math.random() * 900000000 + 100000000))}`,
          notes: i < 5 ? "VIP — prefers window seat, nut allergy" : i % 7 === 0 ? "Vegetarian, loves wine pairings" : undefined,
          tags,
          totalSpend,
          visitCount,
          lastVisitAt: i > 22 ? subDays(new Date(), 45 + i) : subDays(new Date(), Math.floor(Math.random() * 14)),
        },
      });
    })
  );

  for (const customer of customers) {
    const points = Math.floor(Number(customer.totalSpend));
    await prisma.loyaltyAccount.create({
      data: {
        restaurantId: restaurant.id,
        customerId: customer.id,
        points: Math.floor(points * 0.3),
        lifetimePts: points,
      },
    });
  }

  const reservations = [];
  for (let i = 0; i < 50; i++) {
    const customer = customers[i % customers.length];
    const daysOffset = Math.floor(Math.random() * 60) - 30;
    const date = subDays(new Date(), -daysOffset);
    const startTime = TIMES[i % TIMES.length];
    const endHour = parseInt(startTime.split(":")[0]) + 2;
    const status = daysOffset < 0
      ? (["COMPLETED", "COMPLETED", "COMPLETED", "CANCELLED", "SEATED"] as ReservationStatus[])[i % 5]
      : (["PENDING", "CONFIRMED", "CONFIRMED"] as ReservationStatus[])[i % 3];

    const spendAmount =
      status === "COMPLETED"
        ? Math.round((Math.random() * 120 + 30) * 100) / 100
        : null;

    const reservation = await prisma.reservation.create({
      data: {
        restaurantId: restaurant.id,
        customerId: customer.id,
        tableId: tables[i % tables.length].id,
        date: setMinutes(setHours(date, parseInt(startTime.split(":")[0])), parseInt(startTime.split(":")[1] || "0")),
        startTime,
        endTime: `${endHour}:00`,
        partySize: Math.floor(Math.random() * 5) + 1,
        status,
        notes: i % 8 === 0 ? "Birthday celebration" : undefined,
        spendAmount,
      },
    });
    reservations.push(reservation);

    if (status === "COMPLETED" && spendAmount) {
      const account = await prisma.loyaltyAccount.findUnique({
        where: { customerId: customer.id },
      });
      if (account) {
        const pts = Math.floor(spendAmount);
        await prisma.loyaltyTransaction.create({
          data: {
            restaurantId: restaurant.id,
            loyaltyAccountId: account.id,
            type: "EARN",
            points: pts,
            description: `Earned from £${spendAmount.toFixed(2)} spend`,
            reservationId: reservation.id,
          },
        });
      }

      await prisma.analyticsEvent.create({
        data: {
          restaurantId: restaurant.id,
          type: AnalyticsEventType.RESERVATION_COMPLETED,
          value: spendAmount,
          customerId: customer.id,
          metadata: { reservationId: reservation.id },
        },
      });
    }
  }

  await prisma.campaign.createMany({
    data: [
      {
        restaurantId: restaurant.id,
        name: "Summer Menu Launch",
        subject: "Discover our new summer menu",
        body: "Join us for seasonal dishes crafted by Chef Marco...",
        segment: "ALL",
        status: "SENT",
        sentAt: subDays(new Date(), 14),
        recipientCount: 30,
        openRate: 0.28,
      },
      {
        restaurantId: restaurant.id,
        name: "VIP Wine Tasting",
        subject: "Exclusive wine evening for our VIP guests",
        body: "You're invited to an exclusive wine tasting...",
        segment: "VIP",
        status: "SENT",
        sentAt: subDays(new Date(), 7),
        recipientCount: 5,
        openRate: 0.42,
      },
    ],
  });

  await prisma.automationRule.create({
    data: {
      restaurantId: restaurant.id,
      name: "Inactive 30-day win-back",
      triggerDays: 30,
      segment: "INACTIVE",
      subject: "We miss you at The Golden Fork!",
      body: "It's been a while since your last visit. Book this week and receive a complimentary dessert.",
      isActive: true,
    },
  });

  const staffUsers = [owner, manager, staff1, staff2];
  const shiftRoles: ShiftRole[] = ["SERVER", "HOST", "BARTENDER", "CHEF", "MANAGER"];

  for (let d = 0; d < 14; d++) {
    const date = addDays(new Date(), d - 3);
    for (let s = 0; s < 2; s++) {
      const user = staffUsers[(d + s) % staffUsers.length];
      await prisma.shift.create({
        data: {
          restaurantId: restaurant.id,
          userId: user.id,
          date,
          startTime: s === 0 ? "11:00" : "17:00",
          endTime: s === 0 ? "16:00" : "23:00",
          role: shiftRoles[(d + s) % shiftRoles.length],
        },
      });
    }
  }

  await prisma.chatMessage.createMany({
    data: [
      {
        restaurantId: restaurant.id,
        userId: owner.id,
        role: "user",
        content: "How did we perform this week?",
      },
      {
        restaurantId: restaurant.id,
        userId: owner.id,
        role: "assistant",
        content: "Check the AI Assistant after login for live performance insights based on your reservation data.",
      },
    ],
  });

  console.log("✅ Seed complete!");
  console.log("");
  console.log("Demo credentials:");
  console.log("  Owner:   owner@demo.restaurant / demo1234");
  console.log("  Manager: manager@demo.restaurant / demo1234");
  console.log("  Staff:   staff1@demo.restaurant / demo1234");
  console.log("");
  console.log(`Restaurant: ${restaurant.name} (${restaurant.id})`);
  console.log(`Customers: ${customers.length}, Reservations: ${reservations.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
