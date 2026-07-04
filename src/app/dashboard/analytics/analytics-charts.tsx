"use client";

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

type AnalyticsChartsProps = {
  summary: {
    totalRevenue: number;
    revenueChange: number;
    reservations: number;
    customers: number;
    repeatRate: number;
    avgSpend: number;
  };
  revenueOverTime: Array<{ date: string; revenue: number }>;
  reservationVolume: Array<{ date: string; count: number }>;
  peakHours: Array<{ hour: string; count: number }>;
  topCustomers: Array<{
    id: string;
    firstName: string;
    lastName: string;
    totalSpend: number;
    visitCount: number;
  }>;
  staffPerformance: Array<{ name: string; shifts: number }>;
};

export function AnalyticsCharts({
  revenueOverTime,
  reservationVolume,
  peakHours,
  topCustomers,
  staffPerformance,
}: AnalyticsChartsProps) {
  return (
    <>
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
              {topCustomers?.map((c) => (
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
              ))}
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
                <YAxis
                  dataKey="name"
                  type="category"
                  width={100}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip />
                <Bar dataKey="shifts" fill="#52525b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </>
  );
}
