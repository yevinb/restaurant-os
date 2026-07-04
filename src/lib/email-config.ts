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
    return "Brevo is active — you can email any customer. Sender must be verified in your Brevo dashboard.";
  }
  if (getResendApiKey() && isResendTestSender(getEmailFromAddress())) {
    return "Resend test mode only emails your Resend signup address. Add BREVO_API_KEY (free at brevo.com) to email customers, or verify a domain in Resend.";
  }
  if (getResendApiKey()) {
    return "Resend is active with your verified domain — you can email customers.";
  }
  return "Add BREVO_API_KEY (recommended) or RESEND_API_KEY with a verified domain in Render → Environment.";
}
