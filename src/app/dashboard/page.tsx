"use client";

import { useQuery } from "@tanstack/react-query";
import { Calendar, Clock, PoundSterling, Users } from "lucide-react";
import { StatCard, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, statusBadge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => fetch("/api/dashboard").then((r) => r.json()),
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent" />
      </div>
    );
  }

  const { stats, recentReservations, plan } = data || {};

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">Dashboard</h1>
        <p className="text-sm text-zinc-500">
          Overview of your restaurant today
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Today's reservations"
          value={String(stats?.todayReservations || 0)}
          icon={<Calendar className="h-5 w-5" />}
        />
        <StatCard
          label="Pending confirmations"
          value={String(stats?.pendingReservations || 0)}
          icon={<Clock className="h-5 w-5" />}
        />
        <StatCard
          label="Total customers"
          value={String(stats?.totalCustomers || 0)}
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          label="Revenue (30 days)"
          value={formatCurrency(stats?.revenueThisMonth || 0)}
          icon={<PoundSterling className="h-5 w-5" />}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent reservations</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-zinc-100">
              {recentReservations?.length === 0 && (
                <p className="p-6 text-sm text-zinc-500">No reservations yet</p>
              )}
              {recentReservations?.map(
                (r: {
                  id: string;
                  customer: { firstName: string; lastName: string };
                  date: string;
                  startTime: string;
                  partySize: number;
                  status: string;
                  table?: { name: string };
                }) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between px-6 py-4"
                  >
                    <div>
                      <p className="font-medium text-zinc-900">
                        {r.customer.firstName} {r.customer.lastName}
                      </p>
                      <p className="text-sm text-zinc-500">
                        {formatDate(r.date)} · {r.startTime} · {r.partySize} guests
                        {r.table && ` · ${r.table.name}`}
                      </p>
                    </div>
                    <Badge variant={statusBadge(r.status)}>
                      {r.status.toLowerCase()}
                    </Badge>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your plan</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold capitalize text-zinc-900">
              {plan?.toLowerCase() || "Starter"}
            </p>
            <p className="mt-2 text-sm text-zinc-500">
              Manage your subscription in Billing
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
