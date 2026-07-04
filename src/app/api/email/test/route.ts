import { withTenant, json } from "@/lib/api";
import { sendTransactionalEmail } from "@/lib/email";
import { getEmailFromAddress, isEmailConfigured } from "@/lib/email-config";
import { renderEmailHtml } from "@/lib/marketing-utils";

export const GET = withTenant(async () => {
  return json({
    configured: isEmailConfigured(),
    from: getEmailFromAddress(),
    hint: isEmailConfigured()
      ? "With onboarding@resend.dev you can only send to the email you used to sign up for Resend until you verify a domain."
      : "Add RESEND_API_KEY and EMAIL_FROM in Render → Environment, then redeploy.",
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
        error:
          "Email not configured. Add RESEND_API_KEY in Render → Environment and redeploy.",
      },
      503
    );
  }

  const body = `Hi ${ctx.session.user?.name || "there"},

This is a test email from RestaurantOS for ${ctx.restaurant.name}.

If you received this, email delivery is working correctly.`;

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
        hint: "With onboarding@resend.dev, sends only work to your Resend signup email.",
      },
      502
    );
  }

  return json({ success: true, sentTo: to });
});
