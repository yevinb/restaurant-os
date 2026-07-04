export function getResendApiKey() {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key || key.includes("placeholder")) return null;
  return key;
}

export function getEmailFromAddress() {
  const raw =
    process.env.EMAIL_FROM?.trim() || "RestaurantOS <onboarding@resend.dev>";
  return raw.replace(/^["']|["']$/g, "");
}

export function isEmailConfigured() {
  return Boolean(getResendApiKey());
}
