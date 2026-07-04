"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, statusBadge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { fetchJson } from "@/lib/api-client";
import { Plus, Search } from "lucide-react";

type Customer = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  tags: string[];
  totalSpend: number | string;
  visitCount: number;
  loyaltyAccount?: { points: number };
};

export default function CRMPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [tag, setTag] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    notes: "",
    tags: ["REGULAR"] as string[],
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ["customers", search, tag],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (tag) params.set("tag", tag);
      return fetch(`/api/customers?${params}`).then((r) => r.json());
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetchJson("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setShowForm(false);
      setSuccess("Customer added");
      setError("");
      setForm({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        notes: "",
        tags: ["REGULAR"],
      });
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">CRM</h1>
          <p className="text-sm text-zinc-500">
            Customers are created from reservations. Search and manage guest profiles below.
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} variant="outline">
          <Plus className="h-4 w-4" />
          Add walk-in guest
        </Button>
      </div>

      {success && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mb-6 flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={tag} onChange={(e) => setTag(e.target.value)} className="w-40">
          <option value="">All tags</option>
          <option value="VIP">VIP</option>
          <option value="REGULAR">Regular</option>
          <option value="INACTIVE">Inactive</option>
        </Select>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate();
              }}
              className="grid gap-4 md:grid-cols-3"
            >
              <Input
                placeholder="First name"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                required
              />
              <Input
                placeholder="Last name"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                required
              />
              <Input
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <Input
                placeholder="Phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
              <Select
                value={form.tags[0]}
                onChange={(e) => setForm({ ...form, tags: [e.target.value] })}
              >
                <option value="REGULAR">Regular</option>
                <option value="VIP">VIP</option>
                <option value="INACTIVE">Inactive</option>
              </Select>
              <Button type="submit" loading={createMutation.isPending}>
                Save customer
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent" />
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-100 text-left text-xs uppercase text-zinc-500">
                  <th className="px-6 py-3">Customer</th>
                  <th className="px-6 py-3">Contact</th>
                  <th className="px-6 py-3">Tags</th>
                  <th className="px-6 py-3">Visits</th>
                  <th className="px-6 py-3">Spend</th>
                  <th className="px-6 py-3">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-zinc-50">
                    <td className="px-6 py-4">
                      <Link
                        href={`/dashboard/crm/${c.id}`}
                        className="font-medium text-zinc-900 hover:underline"
                      >
                        {c.firstName} {c.lastName}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-500">
                      {c.email || c.phone || "—"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1">
                        {c.tags.map((t) => (
                          <Badge key={t} variant={statusBadge(t)}>
                            {t.toLowerCase()}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">{c.visitCount}</td>
                    <td className="px-6 py-4 text-sm">
                      {formatCurrency(Number(c.totalSpend))}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {c.loyaltyAccount?.points ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
