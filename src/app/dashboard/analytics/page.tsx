"use client";

import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { StatCard } from "@/components/ui/card";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { formatCurrency } from "@/lib/utils";

const AnalyticsCharts = dynamic(
  () =>
    import("./analytics-charts").then((m) => ({ default: m.AnalyticsCharts })),
  {
    ssr: false,
    loading: () => (
      <div className="mt-8 flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent" />
      </div>
    ),
  }
);

export default function AnalyticsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["analytics"],
    queryFn: async () => {
      const res = await fetch("/api/analytics");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load analytics");
      return json;
    },
    staleTime: 60_000,
  });

  if (isLoading && !data) {
    return <PageSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {(error as Error)?.message || "Failed to load analytics"}
      </div>
    );
  }

  const {
    summary,
    revenueOverTime,
    reservationVolume,
    topCustomers,
    peakHours,
    staffPerformance,
  } = data;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">Analytics</h1>
        <p className="text-sm text-zinc-500">Performance insights for the last 30 days</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total revenue"
          value={formatCurrency(summary.totalRevenue)}
          change={
            summary.revenueChange
              ? `${summary.revenueChange > 0 ? "+" : ""}${summary.revenueChange}% vs prev period`
              : undefined
          }
        />
        <StatCard label="Reservations" value={String(summary.reservations)} />
        <StatCard label="Repeat customer rate" value={`${summary.repeatRate}%`} />
        <StatCard
          label="Avg spend / visit"
          value={formatCurrency(summary.avgSpend)}
        />
      </div>

      <AnalyticsCharts
        summary={summary}
        revenueOverTime={revenueOverTime}
        reservationVolume={reservationVolume}
        peakHours={peakHours}
        topCustomers={topCustomers}
        staffPerformance={staffPerformance}
      />
    </div>
  );
}
