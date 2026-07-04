import { withTenant, json } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/tenant";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getPlanLimits } from "@/lib/plans";
import { sendTransactionalEmail } from "@/lib/email";
import { renderEmailHtml } from "@/lib/marketing-utils";

const inviteSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(["MANAGER", "STAFF"]),
  password: z.string().min(8),
});

export const POST = withTenant(async (req, ctx) => {
  requireRole(ctx.role, [Role.OWNER, Role.MANAGER]);

  const body = inviteSchema.parse(await req.json());
  const email = body.email.trim().toLowerCase();

  const limits = getPlanLimits(ctx.plan);
  const memberCount = await prisma.membership.count({
    where: { restaurantId: ctx.restaurantId },
  });

  if (memberCount >= limits.staff) {
    return json({ error: `Staff limit reached (${limits.staff}). Upgrade your plan.` }, 403);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const hasMembership = await prisma.membership.findFirst({
      where: { userId: existing.id, restaurantId: ctx.restaurantId },
    });
    if (hasMembership) {
      return json({ error: "User is already on your team" }, 400);
    }

    await prisma.membership.create({
      data: {
        userId: existing.id,
        restaurantId: ctx.restaurantId,
        role: body.role,
      },
    });

    return json({ success: true, userId: existing.id, existing: true });
  }

  const passwordHash = await bcrypt.hash(body.password, 12);
  const user = await prisma.user.create({
    data: {
      email,
      name: body.name,
      passwordHash,
      memberships: {
        create: {
          restaurantId: ctx.restaurantId,
          role: body.role,
        },
      },
    },
  });

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:8080";
  const welcomeBody = `Hi ${body.name},

You've been invited to join ${ctx.restaurant.name} on RestaurantOS as ${body.role.toLowerCase()}.

Sign in at ${baseUrl}/login
Email: ${email}
Temporary password: ${body.password}

Please change your password after your first login.`;

  await sendTransactionalEmail({
    to: email,
    toName: body.name,
    subject: `You're invited to ${ctx.restaurant.name} on RestaurantOS`,
    body: welcomeBody,
    html: renderEmailHtml(welcomeBody),
    restaurantId: ctx.restaurantId,
  });

  return json({ success: true, userId: user.id, existing: false }, 201);
});
