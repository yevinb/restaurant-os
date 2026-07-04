"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { fetchJson } from "@/lib/api-client";
import { Copy, ExternalLink, Mail } from "lucide-react";
import {
  IntegrationsPanel,
  LocationsPanel,
  TimeSlotsPanel,
} from "@/components/settings-extras";

function EmailTestPanel() {
  const { toast } = useToast();
  const { data, isLoading } = useQuery({
    queryKey: ["email-status"],
    queryFn: async () => {
      const res = await fetchJson<{
        configured: boolean;
        provider: string | null;
        from: string;
        hint: string;
        setupSteps: string[] | null;
      }>("/api/email/test");
      if (!res.ok) throw new Error(res.error);
      return res.data!;
    },
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const res = await fetchJson<{ sentTo?: string; hint?: string }>(
        "/api/email/test",
        { method: "POST" }
      );
      if (!res.ok) throw new Error(res.error || res.data?.hint);
      return res.data!;
    },
    onSuccess: (d) => toast(`Test email sent to ${d?.sentTo}`),
    onError: (err: Error) => toast(err.message, "error"),
  });

  if (isLoading) {
    return <p className="text-sm text-zinc-500">Checking email setup…</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-600">
        Status:{" "}
        <span
          className={
            data?.configured ? "font-medium text-emerald-600" : "font-medium text-amber-600"
          }
        >
          {data?.configured
            ? `Ready — ${data.provider === "brevo" ? "Brevo" : "Resend"}`
            : "Not ready for customer emails"}
        </span>
      </p>
      {data?.from && (
        <p className="text-xs text-zinc-500">Sending from: {data.from}</p>
      )}
      <p className="text-xs text-zinc-500">{data?.hint}</p>
      {data?.setupSteps && (
        <ol className="list-decimal space-y-1 pl-4 text-xs text-zinc-600">
          {data.setupSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      )}
      <Button
        type="button"
        variant="outline"
        onClick={() => testMutation.mutate()}
        loading={testMutation.isPending}
        disabled={!data?.configured}
      >
        <Mail className="h-4 w-4" />
        Send test email to me
      </Button>
    </div>
  );
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: restaurant, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await fetchJson("/api/settings");
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
  });

  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    timezone: "Europe/London",
    currency: "GBP",
    locale: "en",
    country: "GB",
    whatsappNumber: "",
  });

  const [inviteForm, setInviteForm] = useState({
    name: "",
    email: "",
    role: "STAFF",
    password: "",
  });

  const [tableForm, setTableForm] = useState({ name: "", capacity: 2 });

  const { data: tables = [], refetch: refetchTables } = useQuery({
    queryKey: ["tables"],
    queryFn: async () => {
      const res = await fetchJson("/api/tables");
      if (!res.ok) throw new Error(res.error);
      return res.data as Array<{
        id: string;
        name: string;
        capacity: number;
        isActive: boolean;
      }>;
    },
  });

  const slug = (restaurant as { slug?: string } | undefined)?.slug ?? "";
  const [bookingUrl, setBookingUrl] = useState("");

  useEffect(() => {
    if (slug) {
      setBookingUrl(`${window.location.origin}/book/${slug}`);
    } else {
      setBookingUrl("");
    }
  }, [slug]);

  useEffect(() => {
    if (restaurant) {
      const r = restaurant as {
        name?: string;
        address?: string;
        phone?: string;
        timezone?: string;
        currency?: string;
        locale?: string;
        country?: string;
        whatsappNumber?: string;
      };
      setForm({
        name: r.name || "",
        address: r.address || "",
        phone: r.phone || "",
        timezone: r.timezone || "Europe/London",
        currency: r.currency || "GBP",
        locale: r.locale || "en",
        country: r.country || "GB",
        whatsappNumber: r.whatsappNumber || "",
      });
    }
  }, [restaurant]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetchJson("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      toast("Settings saved");
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetchJson("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inviteForm),
      });
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: (data) => {
      const d = data as { existing?: boolean };
      toast(
        d.existing
          ? "Existing user added to your team"
          : "Team member invited successfully"
      );
      setInviteForm({ name: "", email: "", role: "STAFF", password: "" });
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const addTableMutation = useMutation({
    mutationFn: async () => {
      const res = await fetchJson("/api/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tableForm),
      });
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      toast("Table added");
      setTableForm({ name: "", capacity: 2 });
      refetchTables();
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const toggleTableMutation = useMutation({
    mutationFn: async ({
      id,
      isActive,
    }: {
      id: string;
      isActive: boolean;
    }) => {
      const res = await fetchJson(`/api/tables/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => refetchTables(),
    onError: (err: Error) => toast(err.message, "error"),
  });

  const deleteTableMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetchJson(`/api/tables/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      toast("Table removed");
      refetchTables();
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

  const memberships =
    (restaurant as {
      slug?: string;
      memberships?: Array<{
        id: string;
        role: string;
        user: { name: string; email: string };
      }>;
    })?.memberships || [];

  const copyBookingLink = async () => {
    if (!bookingUrl) {
      toast("Booking link not ready yet", "error");
      return;
    }
    try {
      await navigator.clipboard.writeText(bookingUrl);
      toast("Booking link copied — paste it in a new tab to test");
    } catch {
      toast("Could not copy — select the link and copy manually", "error");
    }
  };

  const openBookingPage = () => {
    if (!bookingUrl) {
      toast("Booking link not ready yet", "error");
      return;
    }
    window.open(bookingUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">Settings</h1>
        <p className="text-sm text-zinc-500">Restaurant profile and team</p>
      </div>

      <Card className="mb-6 border-zinc-900/10 ring-1 ring-zinc-900/5">
        <CardHeader>
          <CardTitle>Online booking link</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-600">
            Share this link on your website or social media so guests can book tables
            directly. Copy it, then paste into a new browser tab to preview.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              readOnly
              value={bookingUrl || (slug ? "Loading link…" : "No booking slug found")}
              className="flex-1 font-mono text-xs"
              onFocus={(e) => e.target.select()}
            />
            <div className="flex shrink-0 gap-2">
              <Button
                type="button"
                variant="primary"
                onClick={copyBookingLink}
                disabled={!bookingUrl}
              >
                <Copy className="h-4 w-4" />
                Copy link
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={openBookingPage}
                disabled={!bookingUrl}
              >
                <ExternalLink className="h-4 w-4" />
                Open in new tab
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Email delivery</CardTitle>
        </CardHeader>
        <CardContent>
          <EmailTestPanel />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Restaurant profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateMutation.mutate();
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input
                  className="mt-1"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Address</label>
                <Input
                  className="mt-1"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Phone</label>
                <Input
                  className="mt-1"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Timezone</label>
                <Input
                  className="mt-1"
                  value={form.timezone}
                  onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Country</label>
                  <Select
                    className="mt-1"
                    value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                  >
                    <option value="GB">United Kingdom</option>
                    <option value="KW">Kuwait</option>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Language</label>
                  <Select
                    className="mt-1"
                    value={form.locale}
                    onChange={(e) => setForm({ ...form, locale: e.target.value })}
                  >
                    <option value="en">English</option>
                    <option value="ar">Arabic</option>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Currency</label>
                  <Select
                    className="mt-1"
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  >
                    <option value="GBP">GBP (£)</option>
                    <option value="KWD">KWD (KD)</option>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">WhatsApp number</label>
                  <Input
                    className="mt-1"
                    value={form.whatsappNumber}
                    onChange={(e) =>
                      setForm({ ...form, whatsappNumber: e.target.value })
                    }
                    placeholder="+965..."
                  />
                </div>
              </div>
              <Button type="submit" loading={updateMutation.isPending}>
                Save changes
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Tables ({tables.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addTableMutation.mutate();
              }}
              className="mb-4 flex flex-wrap gap-2"
            >
              <Input
                placeholder="Table name"
                value={tableForm.name}
                onChange={(e) =>
                  setTableForm({ ...tableForm, name: e.target.value })
                }
                required
                className="max-w-[160px]"
              />
              <Input
                type="number"
                min={1}
                max={20}
                value={tableForm.capacity}
                onChange={(e) =>
                  setTableForm({
                    ...tableForm,
                    capacity: parseInt(e.target.value) || 2,
                  })
                }
                className="max-w-[100px]"
              />
              <Button type="submit" loading={addTableMutation.isPending}>
                Add table
              </Button>
            </form>
            <div className="divide-y divide-zinc-100 rounded-lg border border-zinc-100">
              {tables.length === 0 && (
                <p className="p-4 text-sm text-zinc-500">No tables yet</p>
              )}
              {tables.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-sm">{t.name}</p>
                    <p className="text-xs text-zinc-500">
                      {t.capacity} seats ·{" "}
                      {t.isActive ? "Active" : "Inactive"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        toggleTableMutation.mutate({
                          id: t.id,
                          isActive: !t.isActive,
                        })
                      }
                    >
                      {t.isActive ? "Deactivate" : "Activate"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (window.confirm(`Delete ${t.name}?`)) {
                          deleteTableMutation.mutate(t.id);
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <LocationsPanel />

          <Card>
            <CardHeader>
              <CardTitle>Invite team member</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  inviteMutation.mutate();
                }}
                className="space-y-3"
              >
                <Input
                  placeholder="Full name"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                  required
                />
                <Input
                  type="email"
                  placeholder="Email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  required
                />
                <Select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                >
                  <option value="STAFF">Staff</option>
                  <option value="MANAGER">Manager</option>
                </Select>
                <Input
                  type="password"
                  placeholder="Temporary password (min 8 chars)"
                  value={inviteForm.password}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, password: e.target.value })
                  }
                  minLength={8}
                  required
                />
                <Button type="submit" loading={inviteMutation.isPending} className="w-full">
                  Send invite
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Team members ({memberships.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-zinc-100">
                {memberships.map((m) => (
                  <div key={m.id} className="flex items-center justify-between px-6 py-4">
                    <div>
                      <p className="font-medium text-sm">
                        {m.user.name || m.user.email}
                      </p>
                      <p className="text-xs text-zinc-500">{m.user.email}</p>
                    </div>
                    <span className="text-xs capitalize text-zinc-500">
                      {m.role.toLowerCase()}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <TimeSlotsPanel />
      <IntegrationsPanel />
    </div>
  );
}
