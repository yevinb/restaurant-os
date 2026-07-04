export function personalize(text: string, firstName: string) {
  return text.replace(/\{name\}/g, firstName);
}

export function renderEmailHtml(body: string) {
  const htmlBody = body
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br/>");
  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.6;color:#18181b;max-width:560px;margin:0 auto;padding:24px">${htmlBody}</body></html>`;
}

export const CAMPAIGN_TEMPLATES = [
  {
    id: "winback",
    name: "Win-back offer",
    segment: "INACTIVE" as const,
    subject: "We miss you, {name}! Here's 15% off your next visit",
    body: `Hi {name},

It's been a while since we've seen you at our restaurant, and we'd love to welcome you back.

Enjoy **15% off** your next booking when you dine with us this week. Just mention this email when you arrive.

Book your table today — we can't wait to serve you again!

Warm regards,
The team`,
  },
  {
    id: "vip-thanks",
    name: "VIP thank you",
    segment: "VIP" as const,
    subject: "{name}, thank you for being one of our best guests",
    body: `Dear {name},

As one of our most valued guests, we wanted to personally thank you for your continued loyalty.

We've reserved a complimentary dessert for your next visit — our way of saying thank you.

See you soon!`,
  },
  {
    id: "weekday-special",
    name: "Mid-week special",
    segment: "ALL" as const,
    subject: "Slow night? Join us for a mid-week treat, {name}",
    body: `Hi {name},

Our quietest nights are the perfect time for a relaxed dinner. This Wednesday and Thursday:

• Prix fixe 2 courses for £25
• Complimentary welcome drink
• Priority seating

Reserve now and beat the weekend rush!`,
  },
  {
    id: "high-spender",
    name: "Exclusive tasting menu",
    segment: "HIGH_SPENDERS" as const,
    subject: "{name}, you're invited — exclusive tasting experience",
    body: `Hi {name},

You've been one of our top guests, and we'd like to invite you to an exclusive 5-course tasting menu preview.

Limited to 12 seats. Reply to reserve your spot.

We look forward to creating something special for you.`,
  },
];
