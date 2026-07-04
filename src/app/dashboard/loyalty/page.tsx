"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import { formatDate } from "@/lib/utils";
import { fetchJson } from "@/lib/api-client";

export default function LoyaltyPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [redeemForm, setRedeemForm] = useState({
    customerId: "",
    points: 100,
    description: "Reward redemption",
  });
  const [ruleForm, setRuleForm] = useState({
    id: "",
    name: "Standard rewards",
    pointsPerPound: 1,
    minSpend: 0,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["loyalty"],
    queryFn: async () => {
      const res = await fetch("/api/loyalty");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load loyalty");
      return json;
    },
  });

  useEffect(() => {
    if (data?.rules?.[0]) {
      const r = data.rules[0];
      setRuleForm({
        id: r.id,
        name: r.name,
        pointsPerPound: Number(r.pointsPerPound),
        minSpend: Number(r.minSpend),
      });
    }
  }, [data]);

  const redeemMutation = useMutation({
    mutationFn: async () => {
      const res = await fetchJson("/api/loyalty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "redeem", ...redeemForm }),
      });
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyalty"] });
      toast("Points redeemed");
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const ruleMutation = useMutation({
    mutationFn: async () => {
      const res = await fetchJson("/api/loyalty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateRule", ...ruleForm }),
      });
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyalty"] });
      toast("Reward rules updated");
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const { accounts = [], transactions = [] } = data || {};

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

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">Loyalty</h1>
        <p className="text-sm text-zinc-500">Points, rewards, and member ledger</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Reward rules</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              ruleMutation.mutate();
            }}
            className="grid gap-4 md:grid-cols-4"
          >
            <Input
              placeholder="Rule name"
              value={ruleForm.name}
              onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
              required
            />
            <Input
              type="number"
              min={0}
              step="0.1"
              placeholder="Points per £1"
              value={ruleForm.pointsPerPound}
              onChange={(e) =>
                setRuleForm({ ...ruleForm, pointsPerPound: parseFloat(e.target.value) })
              }
            />
            <Input
              type="number"
              min={0}
              step="0.01"
              placeholder="Min spend (£)"
              value={ruleForm.minSpend}
              onChange={(e) =>
                setRuleForm({ ...ruleForm, minSpend: parseFloat(e.target.value) })
              }
            />
            <Button type="submit" loading={ruleMutation.isPending}>
              Save rules
            </Button>
          </form>
          <p className="mt-3 text-xs text-zinc-500">
            Points are awarded automatically when a reservation is marked completed.
          </p>
        </CardContent>
      </Card>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Redeem points</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                redeemMutation.mutate();
              }}
              className="space-y-3"
            >
              <Select
                value={redeemForm.customerId}
                onChange={(e) =>
                  setRedeemForm({ ...redeemForm, customerId: e.target.value })
                }
                required
              >
                <option value="">Select member</option>
                {accounts.map(
                  (a: {
                    customerId: string;
                    points: number;
                    customer: { firstName: string; lastName: string };
                  }) => (
                    <option key={a.customerId} value={a.customerId}>
                      {a.customer.firstName} {a.customer.lastName} ({a.points} pts)
                    </option>
                  )
                )}
              </Select>
              <Input
                type="number"
                min={1}
                value={redeemForm.points}
                onChange={(e) =>
                  setRedeemForm({
                    ...redeemForm,
                    points: parseInt(e.target.value),
                  })
                }
              />
              <Input
                value={redeemForm.description}
                onChange={(e) =>
                  setRedeemForm({ ...redeemForm, description: e.target.value })
                }
              />
              <Button type="submit" loading={redeemMutation.isPending}>
                Redeem
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top members</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-zinc-100">
              {accounts.slice(0, 8).map(
                (a: {
                  id: string;
                  points: number;
                  customer: { firstName: string; lastName: string };
                }) => (
                  <div
                    key={a.id}
                    className="flex justify-between px-6 py-3 text-sm"
                  >
                    <span>
                      {a.customer.firstName} {a.customer.lastName}
                    </span>
                    <span className="font-medium">{a.points} pts</span>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Points history</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-24 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent" />
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {transactions.map(
                (t: {
                  id: string;
                  points: number;
                  description: string;
                  createdAt: string;
                  loyaltyAccount: {
                    customer: { firstName: string; lastName: string };
                  };
                }) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between px-6 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {t.loyaltyAccount.customer.firstName}{" "}
                        {t.loyaltyAccount.customer.lastName}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {t.description} · {formatDate(t.createdAt)}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-medium ${
                        t.points > 0 ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {t.points > 0 ? "+" : ""}
                      {t.points}
                    </span>
                  </div>
                )
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
