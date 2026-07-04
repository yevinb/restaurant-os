import { Resend } from "resend";
import { prisma } from "./prisma";
import { personalize, renderEmailHtml } from "./marketing-utils";

export type EmailPayload = {
  to: string;
  toName: string;
  subject: string;
  html: string;
  body: string;
  restaurantId?: string;
  campaignId?: string;
};

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key || key.includes("placeholder")) return null;
  return new Resend(key);
}

async function deliver(payload: EmailPayload) {
  const resend = getResend();
  const from = process.env.EMAIL_FROM || "RestaurantOS <onboarding@resend.dev>";

  if (resend) {
    const { error } = await resend.emails.send({
      from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    });
    if (error) {
      throw new Error(error.message);
    }
    return "DELIVERED";
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("Email delivery not configured");
  }

  console.log(`[email] ${payload.to} — ${payload.subject}`);
  return "DELIVERED";
}

/** Sends email via Resend and records delivery in the database. */
export async function sendEmail(payload: EmailPayload) {
  let status = "FAILED";

  try {
    status = await deliver(payload);
  } catch (err) {
    console.error("Email send failed:", err);
    status = "FAILED";
  }

  await prisma.emailLog.create({
    data: {
      restaurantId: payload.restaurantId,
      campaignId: payload.campaignId,
      toEmail: payload.to,
      toName: payload.toName,
      subject: payload.subject,
      body: payload.body,
      status,
    },
  });

  return { sent: status === "DELIVERED" };
}

export async function sendTransactionalEmail(
  payload: Omit<EmailPayload, "restaurantId" | "campaignId"> & {
    restaurantId?: string;
  }
) {
  return sendEmail(payload);
}

export async function sendBulkEmails(
  restaurantId: string,
  recipients: Array<{ email: string | null; firstName: string; lastName?: string }>,
  subject: string,
  body: string,
  campaignId?: string
) {
  const withEmail = recipients.filter((r) => r.email);
  let sent = 0;
  let failed = 0;

  for (const r of withEmail) {
    const personalizedBody = personalize(body, r.firstName);
    const html = renderEmailHtml(personalizedBody);
    const result = await sendEmail({
      to: r.email!,
      toName: `${r.firstName}${r.lastName ? ` ${r.lastName}` : ""}`,
      subject: personalize(subject, r.firstName),
      html,
      body: personalizedBody,
      restaurantId,
      campaignId,
    });
    if (result.sent) sent++;
    else failed++;
  }

  return { sent, failed, skipped: recipients.length - withEmail.length };
}
