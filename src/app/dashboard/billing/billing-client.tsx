"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PLANS } from "@/lib/plans";
import { fetchJson } from "@/lib/api-client";
import { Check } from "lucide-react";

export default function BillingPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const success = searchParams.get("success");
  const [message, setMessage] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["billing"],
    queryFn: async () => {
      const res = await fetchJson<{
        subscription: unknown;
        currentPlan: string;
      }>("/api/stripe/checkout");
      return res.data;
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async (plan: string) => {
      const res = await fetchJson<{ url?: string; success?: boolean; message?: string }>(
        "/api/stripe/checkout",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan }),
        }
      );
      if (!res.ok) throw new Error(res.error);
      return res.data!;
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      } else if (data.success) {
        setMessage(data.message || "Plan updated successfully");
        queryClient.invalidateQueries({ queryKey: ["billing"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      }
    },
    onError: (err: Error) => setMessage(err.message),
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      const res = await fetchJson<{ url?: string; message?: string }>("/api/stripe/portal", {
        method: "POST",
      });
      if (!res.ok) throw new Error(res.error);
      return res.data!;
    },
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
      else if (data.message) setMessage(data.message);
    },
    onError: (err: Error) => setMessage(err.message),
  });

  const subscription = data?.subscription as {
    status?: string;
    currentPeriodEnd?: string;
    stripeCustomerId?: string;
  } | null;
  const currentPlan = data?.currentPlan ?? "";

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">Billing</h1>
        <p className="text-sm text-zinc-500">Manage your subscription and payment</p>
      </div>

      {message && (
        <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
      )}

      {success && !message && (
        <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Subscription updated successfully!
        </div>
      )}

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Current subscription</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent" />
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-bold capitalize">
                  {currentPlan.toLowerCase()} plan
                </p>
                <Badge variant={subscription?.status === "ACTIVE" ? "success" : "warning"}>
                  {subscription?.status?.toLowerCase() || "trialing"}
                </Badge>
                {subscription?.currentPeriodEnd && (
                  <p className="mt-2 text-sm text-zinc-500">
                    Renews{" "}
                    {new Date(subscription.currentPeriodEnd).toLocaleDateString("en-GB")}
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                onClick={() => portalMutation.mutate()}
                loading={portalMutation.isPending}
              >
                Subscription details
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        {Object.values(PLANS).map((plan) => {
          const isCurrent = plan.id === currentPlan;
          return (
            <Card
              key={plan.id}
              className={isCurrent ? "border-zinc-900 ring-1 ring-zinc-900" : ""}
            >
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p className="mt-2 text-3xl font-bold">
                  £{plan.price}
                  <span className="text-sm font-normal text-zinc-500">/mo</span>
                </p>
                <ul className="mt-6 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-zinc-600">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-6 w-full"
                  variant={isCurrent ? "secondary" : "primary"}
                  disabled={isCurrent}
                  loading={checkoutMutation.isPending}
                  onClick={() => checkoutMutation.mutate(plan.id)}
                >
                  {isCurrent ? "Current plan" : `Upgrade to ${plan.name}`}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
