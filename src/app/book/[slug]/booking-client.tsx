"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { UtensilsCrossed, Calendar, CheckCircle2 } from "lucide-react";

type Props = { slug: string };

export default function PublicBookingClient({ slug }: Props) {
  const [date, setDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [startTime, setStartTime] = useState("");
  const [partySize, setPartySize] = useState(2);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    notes: "",
  });
  const [confirmed, setConfirmed] = useState<{
    date: string;
    startTime: string;
    partySize: number;
  } | null>(null);

  const { data: restaurantData, isLoading: loadingRestaurant } = useQuery({
    queryKey: ["public-book", slug],
    queryFn: () =>
      fetch(`/api/public/book/${slug}`).then((r) => {
        if (!r.ok) throw new Error("Restaurant not found");
        return r.json();
      }),
  });

  const { data: slotsData, isLoading: loadingSlots } = useQuery({
    queryKey: ["public-slots", slug, date],
    queryFn: () =>
      fetch(`/api/public/book/${slug}?date=${date}`).then((r) => r.json()),
    enabled: !!date,
  });

  const bookMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/public/book/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          date,
          startTime,
          partySize,
          notes: form.notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Booking failed");
      return data;
    },
    onSuccess: (data) => {
      setConfirmed(data.reservation);
    },
  });

  if (loadingRestaurant) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent" />
      </div>
    );
  }

  if (!restaurantData?.restaurant) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <p className="text-zinc-600">Restaurant not found.</p>
      </div>
    );
  }

  const restaurant = restaurantData.restaurant;
  const slots = slotsData?.slots || [];

  if (confirmed) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
            <h1 className="mt-4 text-2xl font-bold text-zinc-900">You&apos;re booked!</h1>
            <p className="mt-2 text-zinc-600">
              {restaurant.name} · {confirmed.partySize} guests
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              {new Date(confirmed.date).toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}{" "}
              at {confirmed.startTime}
            </p>
            <p className="mt-4 text-sm text-zinc-500">
              A confirmation email has been sent to {form.email}.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-16 max-w-lg items-center gap-3 px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white">
            <UtensilsCrossed className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-zinc-900">{restaurant.name}</p>
            <p className="text-xs text-zinc-500">Book a table</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-6 py-8">
        {restaurant.address && (
          <p className="mb-6 text-sm text-zinc-500">{restaurant.address}</p>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            bookMutation.mutate();
          }}
          className="space-y-6"
        >
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-700">
              <Calendar className="h-4 w-4" />
              Date
            </label>
            <Input
              type="date"
              value={date}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => {
                setDate(e.target.value);
                setStartTime("");
              }}
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              Party size
            </label>
            <Select
              value={String(partySize)}
              onChange={(e) => setPartySize(parseInt(e.target.value))}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? "guest" : "guests"}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              Time
            </label>
            {loadingSlots ? (
              <p className="text-sm text-zinc-500">Loading times…</p>
            ) : slots.length === 0 ? (
              <p className="text-sm text-zinc-500">No availability on this date.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {slots.map((s: { time: string; remaining: number }) => (
                  <button
                    key={s.time}
                    type="button"
                    onClick={() => setStartTime(s.time)}
                    className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                      startTime === s.time
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-200 bg-white hover:border-zinc-400"
                    }`}
                  >
                    {s.time}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
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
          </div>

          <Input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />

          <Input
            type="tel"
            placeholder="Phone (optional)"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />

          <textarea
            className="min-h-[60px] w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            placeholder="Special requests (optional)"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />

          {bookMutation.error && (
            <p className="text-sm text-red-600">
              {(bookMutation.error as Error).message}
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            loading={bookMutation.isPending}
            disabled={!startTime}
          >
            Confirm reservation
          </Button>
        </form>

        <p className="mt-8 text-center text-xs text-zinc-400">
          Powered by{" "}
          <a href="/" className="underline hover:text-zinc-600">
            RestaurantOS
          </a>
        </p>
      </main>
    </div>
  );
}
