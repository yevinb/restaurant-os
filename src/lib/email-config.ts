export function getResendApiKey() {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key || key.includes("placeholder")) return null;
  return key;
}

export function getBrevoApiKey() {
  const key = process.env.BREVO_API_KEY?.trim();
  if (!key || key.includes("placeholder")) return null;
  return key;
}

export function getEmailFromAddress() {
  const raw =
    process.env.EMAIL_FROM?.trim() ||
    "RestaurantOS <onboarding@resend.dev>";
  return raw.replace(/^["']|["']$/g, "");
}

export function parseFromAddress(from: string): { name: string; email: string } {
  const match = from.match(/^(.+?)\s*<([^>]+)>$/);
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() };
  }
  return { name: "RestaurantOS", email: from.trim() };
}

export function isResendTestSender(from: string) {
  return from.includes("@resend.dev");
}

export function getEmailProvider(): "brevo" | "resend" | null {
  if (getBrevoApiKey()) return "brevo";
  if (getResendApiKey() && !isResendTestSender(getEmailFromAddress())) {
    return "resend";
  }
  if (getResendApiKey()) return "resend";
  return null;
}

/** True when any provider can send to real customers (not Resend test-only). */
export function isEmailConfigured() {
  if (getBrevoApiKey()) return true;
  const resend = getResendApiKey();
  if (resend && !isResendTestSender(getEmailFromAddress())) return true;
  return false;
}

export function canSendToCustomers() {
  return isEmailConfigured();
}

export function getEmailSetupHint() {
  if (getBrevoApiKey()) {
    return "Brevo is active (free tier). You can email customers — sender must be verified in Brevo.";
  }
  if (getResendApiKey() && isResendTestSender(getEmailFromAddress())) {
    return "Resend test mode only emails your signup address. Use Brevo free tier (brevo.com, no credit card, 300 emails/day) to email customers.";
  }
  if (getResendApiKey()) {
    return "Resend is active with your verified domain — you can email customers.";
  }
  return "Optional: Brevo free tier (300 emails/day, no credit card) in Render → BREVO_API_KEY. Until then, campaigns are saved in Email log only — $0 cost.";
}
