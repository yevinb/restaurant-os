import { withTenant, json } from "@/lib/api";
import { getAnalyticsOverview } from "@/lib/analytics";
import { canAccessFeature } from "@/lib/plans";

export const GET = withTenant(async (_req, ctx) => {
  if (!canAccessFeature(ctx.plan, "analytics")) {
    return json({ error: "Upgrade for analytics access" }, 403);
  }

  const data = await getAnalyticsOverview(ctx.restaurantId);
  return json(data);
});
