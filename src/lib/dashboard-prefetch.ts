import { QueryClient } from "@tanstack/react-query";
import { format, startOfWeek } from "date-fns";

const STALE_MS = 60_000;

async function fetchApi(path: string) {
  const res = await fetch(path);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Request failed");
  return json;
}

const routePrefetch: Record<string, { queryKey: string[]; path: string }> = {
  "/dashboard/loyalty": { queryKey: ["loyalty"], path: "/api/loyalty" },
  "/dashboard/marketing": { queryKey: ["marketing"], path: "/api/marketing" },
  "/dashboard/analytics": { queryKey: ["analytics"], path: "/api/analytics" },
};

export function prefetchDashboardRoute(
  queryClient: QueryClient,
  href: string
) {
  if (href === "/dashboard/staff") {
    const weekStart = format(
      startOfWeek(new Date(), { weekStartsOn: 1 }),
      "yyyy-MM-dd"
    );
    void queryClient.prefetchQuery({
      queryKey: ["shifts", weekStart],
      queryFn: () => fetchApi(`/api/shifts?weekStart=${weekStart}`),
      staleTime: STALE_MS,
    });
    void queryClient.prefetchQuery({
      queryKey: ["team-members"],
      queryFn: () => fetchApi("/api/team/members"),
      staleTime: 300_000,
    });
    return;
  }

  const config = routePrefetch[href];
  if (!config) return;

  void queryClient.prefetchQuery({
    queryKey: config.queryKey,
    queryFn: () => fetchApi(config.path),
    staleTime: STALE_MS,
  });
}
