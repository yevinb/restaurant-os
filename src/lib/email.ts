import { Resend } from "resend";
import { prisma } from "./prisma";
import { personalize, renderEmailHtml } from "./marketing-utils";
import {
  getBrevoApiKey,
  getEmailFromAddress,
  getEmailProvider,
  getEmailSetupHint,
  getResendApiKey,
  isEmailConfigured,
  parseFromAddress,
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

export { isEmailConfigured, getEmailFromAddress, getEmailSetupHint, getEmailProvider };

function getResend() {
  const key = getResendApiKey();
  if (!key) return null;
  return new Resend(key);
}

async function sendViaBrevo(payload: EmailPayload) {
  const apiKey = getBrevoApiKey();
  if (!apiKey) throw new Error("Brevo not configured");

  const sender = parseFromAddress(getEmailFromAddress());
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender,
      to: [{ email: payload.to, name: payload.toName }],
      subject: payload.subject,
      htmlContent: payload.html,
    }),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as {
      message?: string;
      code?: string;
    };
    throw new Error(
      err.message ||
        `Brevo rejected the email (${res.status}). Verify sender ${sender.email} in Brevo → Senders.`
    );
  }
}

async function sendViaResend(payload: EmailPayload) {
  const resend = getResend();
  if (!resend) throw new Error("Resend not configured");

  const { data, error } = await resend.emails.send({
    from: getEmailFromAddress(),
    to: [payload.to],
    subject: payload.subject,
    html: payload.html,
  });

  if (error) {
    throw new Error(
      `${error.message}${getEmailFromAddress().includes("@resend.dev") ? " — Use Brevo (BREVO_API_KEY) or verify a domain in Resend to email customers." : ""}`
    );
  }
  if (!data?.id) {
    throw new Error("Resend did not return a message id");
  }
}

async function deliver(payload: EmailPayload) {
  const provider = getEmailProvider();

  if (provider === "brevo") {
    await sendViaBrevo(payload);
    return "DELIVERED";
  }

  if (provider === "resend") {
    await sendViaResend(payload);
    return "DELIVERED";
  }

  // No provider — log the email so campaigns still work ($0 testing).
  // Add BREVO_API_KEY (free tier) when ready to deliver to inboxes.
  console.log(`[email log] ${payload.to} — ${payload.subject}`);
  return "LOGGED";
}

/** Sends email and records delivery in the database. */
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

  return { sent: status === "DELIVERED" || status === "LOGGED", error: errorMessage, status };
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
