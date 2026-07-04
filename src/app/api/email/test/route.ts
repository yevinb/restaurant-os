import { withTenant, json } from "@/lib/api";
import { sendTransactionalEmail } from "@/lib/email";
import {
  getEmailFromAddress,
  getEmailProvider,
  getEmailSetupHint,
  isEmailConfigured,
} from "@/lib/email-config";
import { renderEmailHtml } from "@/lib/marketing-utils";

export const GET = withTenant(async () => {
  const provider = getEmailProvider();
  return json({
    configured: isEmailConfigured(),
    provider,
    from: getEmailFromAddress(),
    hint: getEmailSetupHint(),
    setupSteps: provider === "brevo" ? null : [
      "1. Sign up free at brevo.com (Free plan — 300 emails/day, no credit card)",
      "2. Senders → Add sender → verify your Gmail (check inbox for link)",
      "3. SMTP & API → Create API key",
      "4. Render Environment: BREVO_API_KEY = your key",
      "5. Render Environment: EMAIL_FROM = RestaurantOS <your@gmail.com>",
      "6. Save and redeploy",
    ],
  });
});

export const POST = withTenant(async (req, ctx) => {
  void req;
  const to = ctx.session.user?.email;
  if (!to) {
    return json({ error: "No email on your account" }, 400);
  }

  if (!isEmailConfigured()) {
    return json(
      {
        error: "Email not configured for customer delivery.",
        hint: getEmailSetupHint(),
      },
      503
    );
  }

  const body = `Hi ${ctx.session.user?.name || "there"},

This is a test email from RestaurantOS for ${ctx.restaurant.name}.

If you received this, you can email customers (booking confirmations, campaigns, etc.).`;

  const result = await sendTransactionalEmail({
    to,
    toName: ctx.session.user?.name || "there",
    subject: `Test email — ${ctx.restaurant.name}`,
    body,
    html: renderEmailHtml(body),
    restaurantId: ctx.restaurantId,
  });

  if (!result.sent) {
    return json(
      {
        error: result.error || "Email failed to send",
        hint: getEmailSetupHint(),
      },
      502
    );
  }

  return json({ success: true, sentTo: to, provider: getEmailProvider() });
});
