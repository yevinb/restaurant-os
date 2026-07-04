"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, statusBadge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { formatCurrency, formatDate } from "@/lib/utils";
import { fetchJson } from "@/lib/api-client";
import { ArrowLeft, Trash2 } from "lucide-react";

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    notes: "",
    tags: ["REGULAR"] as string[],
  });

  const { data: customer, isLoading } = useQuery({
    queryKey: ["customer", id],
    queryFn: async () => {
      const res = await fetchJson(`/api/customers/${id}`);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (customer) {
      const c = customer as {
        firstName: string;
        lastName: string;
        email?: string;
        phone?: string;
        notes?: string;
        tags?: string[];
      };
      setForm({
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email || "",
        phone: c.phone || "",
        notes: c.notes || "",
        tags: c.tags?.length ? c.tags : ["REGULAR"],
      });
    }
  }, [customer]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetchJson(`/api/customers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", id] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast("Customer updated");
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetchJson(`/api/customers/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      toast("Customer deleted");
      router.push("/dashboard/crm");
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent" />
      </div>
    );
  }

  if (!customer || !(customer as { id?: string }).id) {
    return <p>Customer not found</p>;
  }

  const c = customer as {
    id: string;
    totalSpend: number;
    visitCount: number;
    loyaltyAccount?: { points: number };
    reservations?: Array<{
      id: string;
      date: string;
      startTime: string;
      status: string;
      spendAmount?: number;
      table?: { name: string };
    }>;
  };

  return (
    <div>
      <Link
        href="/dashboard/crm"
        className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to CRM
      </Link>

      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">
            {form.firstName} {form.lastName}
          </h1>
          <div className="mt-2 flex gap-2">
            {form.tags.map((t) => (
              <Badge key={t} variant={statusBadge(t)}>
                {t.toLowerCase()}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              if (
                window.confirm(
                  "Delete this customer permanently? This cannot be undone."
                )
              ) {
                deleteMutation.mutate();
              }
            }}
            loading={deleteMutation.isPending}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
            Delete
          </Button>
          <Button onClick={() => updateMutation.mutate()} loading={updateMutation.isPending}>
            Save changes
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Edit profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              placeholder="First name"
            />
            <Input
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              placeholder="Last name"
            />
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Email"
            />
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="Phone"
            />
            <Select
              value={form.tags[0]}
              onChange={(e) => setForm({ ...form, tags: [e.target.value] })}
            >
              <option value="REGULAR">Regular</option>
              <option value="VIP">VIP</option>
              <option value="INACTIVE">Inactive</option>
            </Select>
            <textarea
              className="min-h-[80px] w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Notes (allergies, preferences...)"
            />
            <p className="text-sm text-zinc-500">
              Total spend: {formatCurrency(Number(c.totalSpend))} · {c.visitCount} visits ·{" "}
              {c.loyaltyAccount?.points ?? 0} points
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Visit history</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-zinc-100">
              {c.reservations?.length === 0 && (
                <p className="p-6 text-sm text-zinc-500">No visits yet</p>
              )}
              {c.reservations?.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between px-6 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {formatDate(r.date)} · {r.startTime}
                      {r.table && ` · ${r.table.name}`}
                    </p>
                    {r.spendAmount && (
                      <p className="text-xs text-zinc-500">
                        {formatCurrency(Number(r.spendAmount))}
                      </p>
                    )}
                  </div>
                  <Badge variant={statusBadge(r.status)}>
                    {r.status.toLowerCase()}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
