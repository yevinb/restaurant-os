import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { sendTransactionalEmail } from "@/lib/email";
import { renderEmailHtml } from "@/lib/marketing-utils";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(req: Request) {
  try {
    const { email } = schema.parse(await req.json());
    const normalized = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({ where: { email: normalized } });

    if (user) {
      const token = randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 60 * 60 * 1000);

      await prisma.verificationToken.deleteMany({ where: { identifier: normalized } });
      await prisma.verificationToken.create({
        data: { identifier: normalized, token, expires },
      });

      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:8080";
      const resetUrl = `${baseUrl}/reset-password?token=${token}&email=${encodeURIComponent(normalized)}`;

      const body = `Hi,

We received a request to reset your RestaurantOS password.

Click the link below to choose a new password (valid for 1 hour):

${resetUrl}

If you didn't request this, you can safely ignore this email.`;

      await sendTransactionalEmail({
        to: normalized,
        toName: user.name || "there",
        subject: "Reset your RestaurantOS password",
        body,
        html: renderEmailHtml(body),
      });
    }

    return NextResponse.json({
      success: true,
      message: "If an account exists, a reset link has been sent.",
    });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
