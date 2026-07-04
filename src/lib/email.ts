import { Resend } from "resend";
import { prisma } from "./prisma";
import { personalize, renderEmailHtml } from "./marketing-utils";
import {
  getEmailFromAddress,
  getResendApiKey,
  isEmailConfigured,
} from "./email-config";

export type EmailPayload = {
  to: string;
  toName: string;
  subject: string;
  html: string;
  body: string;
  restaurantId?: string;
  campaignId?: string;
};

export { isEmailConfigured, getEmailFromAddress };

function getResend() {
  const key = getResendApiKey();
  if (!key) return null;
  return new Resend(key);
}

async function deliver(payload: EmailPayload) {
  const resend = getResend();
  const from = getEmailFromAddress();

  if (resend) {
    const { data, error } = await resend.emails.send({
      from,
      to: [payload.to],
      subject: payload.subject,
      html: payload.html,
    });
    if (error) {
      throw new Error(error.message);
    }
    if (!data?.id) {
      throw new Error("Resend did not return a message id");
    }
    return "DELIVERED";
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "RESEND_API_KEY is not set on the server. Add it in Render → Environment."
    );
  }

  console.log(`[email] ${payload.to} — ${payload.subject}`);
  return "DELIVERED";
}

/** Sends email via Resend and records delivery in the database. */
export async function sendEmail(payload: EmailPayload) {
  let status = "FAILED";
  let errorMessage: string | undefined;

  try {
    status = await deliver(payload);
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err);
    console.error("Email send failed:", errorMessage);
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
      errorMessage,
    },
  });

  return { sent: status === "DELIVERED", error: errorMessage };
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
  const errors: string[] = [];

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
    else {
      failed++;
      if (result.error) errors.push(`${r.email}: ${result.error}`);
    }
  }

  return { sent, failed, skipped: recipients.length - withEmail.length, errors };
}
