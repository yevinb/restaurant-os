"use client";

import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { StatCard, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import { formatCurrency } from "@/lib/utils";

export default function AnalyticsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["analytics"],
    queryFn: async () => {
      const res = await fetch("/api/analytics");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load analytics");
      return json;
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return <UpgradePrompt message={(error as Error).message} />;
  }

  const { summary, revenueOverTime, reservationVolume, topCustomers, peakHours, staffPerformance } =
    data;

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

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue over time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={revenueOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`£${Number(v).toFixed(0)}`, "Revenue"]} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#18181b"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reservation volume</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={reservationVolume}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#71717a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Peak booking hours</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={peakHours}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#18181b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top customers</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-zinc-100">
              {topCustomers?.map(
                (c: {
                  id: string;
                  firstName: string;
                  lastName: string;
                  totalSpend: number;
                  visitCount: number;
                }) => (
                  <div
                    key={c.id}
                    className="flex justify-between px-6 py-3 text-sm"
                  >
                    <span>
                      {c.firstName} {c.lastName} · {c.visitCount} visits
                    </span>
                    <span className="font-medium">
                      {formatCurrency(c.totalSpend)}
                    </span>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {staffPerformance?.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Staff performance (shifts logged)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={staffPerformance} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="shifts" fill="#52525b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
