/** Build a WhatsApp click-to-chat link (wa.me). */
export function buildWhatsAppLink(phone: string, message: string) {
  const digits = phone.replace(/\D/g, "");
  const text = encodeURIComponent(message);
  return `https://wa.me/${digits}?text=${text}`;
}

export function buildBookingConfirmationMessage(params: {
  guestName: string;
  restaurantName: string;
  dateLabel: string;
  startTime: string;
  partySize: number;
  locale?: string;
}) {
  if (params.locale === "ar") {
    return `مرحباً ${params.guestName}،

تم تأكيد حجزك في ${params.restaurantName}.

التاريخ: ${params.dateLabel}
الوقت: ${params.startTime}
عدد الضيوف: ${params.partySize}

نتطلع لاستقبالك!`;
  }

  return `Hi ${params.guestName},

Your table at ${params.restaurantName} is confirmed.

Date: ${params.dateLabel}
Time: ${params.startTime}
Party size: ${params.partySize}

We look forward to seeing you!`;
}

export async function notifyGuestViaWhatsApp(params: {
  guestPhone: string;
  restaurantWhatsApp?: string | null;
  message: string;
}) {
  if (!params.guestPhone) return null;
  const fromNumber = params.restaurantWhatsApp || params.guestPhone;
  return buildWhatsAppLink(fromNumber, params.message);
}
