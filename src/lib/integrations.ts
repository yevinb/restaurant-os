import { prisma } from "./prisma";
import { createHmac } from "crypto";

export async function emitWebhook(
  restaurantId: string,
  eventType: string,
  payload: Record<string, unknown>
) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { webhookUrl: true, webhookSecret: true, posProvider: true },
  });

  if (!restaurant?.webhookUrl) return { sent: false };

  const body = JSON.stringify({
    event: eventType,
    restaurantId,
    provider: restaurant.posProvider || "custom",
    data: payload,
    timestamp: new Date().toISOString(),
  });

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-RestaurantOS-Event": eventType,
  };

  if (restaurant.webhookSecret) {
    const sig = createHmac("sha256", restaurant.webhookSecret)
      .update(body)
      .digest("hex");
    headers["X-RestaurantOS-Signature"] = sig;
  }

  try {
    const res = await fetch(restaurant.webhookUrl, {
      method: "POST",
      headers,
      body,
    });

    await prisma.integrationEvent.create({
      data: {
        restaurantId,
        provider: restaurant.posProvider || "custom",
        eventType,
        payload: payload as object,
        status: res.ok ? "delivered" : `failed:${res.status}`,
      },
    });

    return { sent: res.ok, status: res.status };
  } catch (err) {
    await prisma.integrationEvent.create({
      data: {
        restaurantId,
        provider: restaurant.posProvider || "custom",
        eventType,
        payload: payload as object,
        status: "error",
      },
    });
    return { sent: false, error: err instanceof Error ? err.message : "failed" };
  }
}
