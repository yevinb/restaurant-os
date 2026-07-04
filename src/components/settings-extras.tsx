"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { fetchJson } from "@/lib/api-client";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function TimeSlotsPanel() {
  const { toast } = useToast();
  const [form, setForm] = useState({
    dayOfWeek: 0,
    startTime: "18:00",
    endTime: "22:00",
    maxCovers: 50,
  });

  const { data: slots = [], refetch } = useQuery({
    queryKey: ["time-slots"],
    queryFn: async () => {
      const res = await fetchJson("/api/time-slots");
      if (!res.ok) throw new Error(res.error);
      return res.data as Array<{
        id: string;
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        maxCovers: number;
        isActive: boolean;
      }>;
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const res = await fetchJson("/api/time-slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      toast("Booking hours added");
      refetch();
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetchJson(`/api/time-slots/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(res.error);
    },
    onSuccess: () => refetch(),
  });

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Booking hours</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addMutation.mutate();
          }}
          className="mb-4 flex flex-wrap gap-2"
        >
          <Select
            value={String(form.dayOfWeek)}
            onChange={(e) => setForm({ ...form, dayOfWeek: parseInt(e.target.value) })}
          >
            {DAYS.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </Select>
          <Input
            value={form.startTime}
            onChange={(e) => setForm({ ...form, startTime: e.target.value })}
            placeholder="12:00"
            className="max-w-[100px]"
            required
          />
          <Input
            value={form.endTime}
            onChange={(e) => setForm({ ...form, endTime: e.target.value })}
            placeholder="22:00"
            className="max-w-[100px]"
            required
          />
          <Input
            type="number"
            min={1}
            value={form.maxCovers}
            onChange={(e) =>
              setForm({ ...form, maxCovers: parseInt(e.target.value) || 50 })
            }
            className="max-w-[100px]"
          />
          <Button type="submit" loading={addMutation.isPending}>
            Add hours
          </Button>
        </form>
        <div className="divide-y divide-zinc-100 rounded-lg border border-zinc-100">
          {slots.length === 0 && (
            <p className="p-4 text-sm text-zinc-500">No booking hours configured</p>
          )}
          {slots.map((s) => (
            <div key={s.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <span>
                {DAYS[s.dayOfWeek]} · {s.startTime}–{s.endTime} · max {s.maxCovers} covers
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (window.confirm("Remove these booking hours?")) {
                    deleteMutation.mutate(s.id);
                  }
                }}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function LocationsPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");

  const { data, refetch } = useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const res = await fetchJson<{
        locations: Array<{ id: string; name: string; slug: string }>;
        activeRestaurantId?: string;
      }>("/api/locations");
      if (!res.ok) throw new Error(res.error);
      return res.data!;
    },
  });

  const switchMutation = useMutation({
    mutationFn: async (restaurantId: string) => {
      const res = await fetchJson("/api/locations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId }),
      });
      if (!res.ok) throw new Error(res.error);
    },
    onSuccess: () => {
      toast("Location switched");
      queryClient.invalidateQueries();
      window.location.reload();
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const res = await fetchJson("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, address }),
      });
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      toast("Location created");
      setName("");
      setAddress("");
      refetch();
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const locations = data?.locations ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Locations ({locations.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {locations.map((loc) => (
          <div key={loc.id} className="flex items-center justify-between text-sm">
            <span className="font-medium">{loc.name}</span>
            {data?.activeRestaurantId === loc.id ? (
              <span className="text-xs text-emerald-600">Active</span>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => switchMutation.mutate(loc.id)}
              >
                Switch
              </Button>
            )}
          </div>
        ))}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addMutation.mutate();
          }}
          className="space-y-2 border-t border-zinc-100 pt-3"
        >
          <Input
            placeholder="New location name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            placeholder="Address (optional)"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <Button type="submit" loading={addMutation.isPending} className="w-full">
            Add location (Pro)
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function IntegrationsPanel() {
  const { toast } = useToast();
  const [form, setForm] = useState({
    webhookUrl: "",
    webhookSecret: "",
    posProvider: "custom",
  });

  const { data, refetch } = useQuery({
    queryKey: ["integrations"],
    queryFn: async () => {
      const res = await fetchJson<{
        webhookUrl: string;
        posProvider: string;
        events: Array<{ id: string; eventType: string; status: string; createdAt: string }>;
        supportedProviders: string[];
      }>("/api/integrations");
      if (!res.ok) throw new Error(res.error);
      return res.data!;
    },
  });

  useEffect(() => {
    if (data) {
      setForm({
        webhookUrl: data.webhookUrl || "",
        webhookSecret: "",
        posProvider: data.posProvider || "custom",
      });
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetchJson("/api/integrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      toast("Integrations saved");
      refetch();
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>POS & integrations</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-zinc-600">
          Connect Square, Toast, Lightspeed, or a custom webhook. Events fire on
          reservations and completions.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
          className="space-y-3"
        >
          <Select
            value={form.posProvider}
            onChange={(e) => setForm({ ...form, posProvider: e.target.value })}
          >
            {(data?.supportedProviders ?? ["custom"]).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
          <Input
            placeholder="Webhook URL (https://...)"
            value={form.webhookUrl}
            onChange={(e) => setForm({ ...form, webhookUrl: e.target.value })}
          />
          <Input
            type="password"
            placeholder="Webhook secret (optional)"
            value={form.webhookSecret}
            onChange={(e) => setForm({ ...form, webhookSecret: e.target.value })}
          />
          <Button type="submit" loading={saveMutation.isPending}>
            Save integrations
          </Button>
        </form>
        {data?.events && data.events.length > 0 && (
          <div className="mt-4 divide-y divide-zinc-100 rounded-lg border border-zinc-100">
            {data.events.slice(0, 5).map((ev) => (
              <div key={ev.id} className="px-4 py-2 text-xs text-zinc-600">
                {ev.eventType} · {ev.status} ·{" "}
                {new Date(ev.createdAt).toLocaleString()}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
