"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { format, addDays, startOfWeek } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, statusBadge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/utils";
import { fetchJson } from "@/lib/api-client";
import { Plus, ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";

type Reservation = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  partySize: number;
  status: string;
  notes?: string;
  customer: { id: string; firstName: string; lastName: string };
  table?: { id: string; name: string };
};

type EditForm = {
  customerId: string;
  tableId: string;
  date: string;
  startTime: string;
  endTime: string;
  partySize: number;
  notes: string;
  status: string;
};

export default function ReservationsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<"day" | "week">("day");
  const [showForm, setShowForm] = useState(false);
  const [editReservation, setEditReservation] = useState<Reservation | null>(null);
  const [completeReservation, setCompleteReservation] = useState<Reservation | null>(null);
  const [spendAmount, setSpendAmount] = useState("45");
  const [guestMode, setGuestMode] = useState<"existing" | "new">("existing");
  const [form, setForm] = useState({
    customerId: "",
    newGuest: { firstName: "", lastName: "", email: "", phone: "" },
    tableId: "",
    date: format(new Date(), "yyyy-MM-dd"),
    startTime: "19:00",
    endTime: "21:00",
    partySize: 2,
    notes: "",
  });
  const [editForm, setEditForm] = useState<EditForm>({
    customerId: "",
    tableId: "",
    date: "",
    startTime: "",
    endTime: "",
    partySize: 2,
    notes: "",
    status: "PENDING",
  });

  const dateStr = format(selectedDate, "yyyy-MM-dd");

  const { data: reservations = [], isLoading } = useQuery<Reservation[]>({
    queryKey: ["reservations", dateStr, view],
    queryFn: () =>
      fetch(`/api/reservations?date=${dateStr}&view=${view}`).then((r) => r.json()),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => fetch("/api/customers").then((r) => r.json()),
  });

  const { data: tables = [] } = useQuery({
    queryKey: ["tables"],
    queryFn: () => fetch("/api/tables?active=true").then((r) => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form & { guestMode: string }) => {
      const payload: Record<string, unknown> = {
        tableId: data.tableId || undefined,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        partySize: Number(data.partySize),
        notes: data.notes,
      };
      if (data.guestMode === "new") {
        payload.newGuest = data.newGuest;
      } else {
        payload.customerId = data.customerId;
      }
      const res = await fetchJson("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setShowForm(false);
      toast("Reservation created — customer added to CRM");
      setForm({
        customerId: "",
        newGuest: { firstName: "", lastName: "", email: "", phone: "" },
        tableId: "",
        date: format(new Date(), "yyyy-MM-dd"),
        startTime: "19:00",
        endTime: "21:00",
        partySize: 2,
        notes: "",
      });
      setGuestMode("existing");
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Record<string, unknown> }) => {
      const res = await fetchJson(`/api/reservations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      setEditReservation(null);
      setCompleteReservation(null);
      toast("Reservation updated");
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetchJson(`/api/reservations/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      toast("Reservation cancelled");
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  function openEdit(r: Reservation) {
    setEditForm({
      customerId: r.customer.id,
      tableId: r.table?.id || "",
      date: format(new Date(r.date), "yyyy-MM-dd"),
      startTime: r.startTime,
      endTime: r.endTime,
      partySize: r.partySize,
      notes: r.notes || "",
      status: r.status,
    });
    setEditReservation(r);
  }

  function handleStatusChange(r: Reservation, status: string) {
    if (status === "COMPLETED" && r.status !== "COMPLETED") {
      setSpendAmount("45");
      setCompleteReservation(r);
      return;
    }
    updateMutation.mutate({ id: r.id, body: { status } });
  }

  function navigate(dir: number) {
    setSelectedDate((d) => addDays(d, view === "week" ? dir * 7 : dir));
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Reservations</h1>
          <p className="text-sm text-zinc-500">Manage bookings and table assignments</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" />
          New reservation
        </Button>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[180px] text-center font-medium">
            {view === "week"
              ? `Week of ${format(startOfWeek(selectedDate, { weekStartsOn: 1 }), "d MMM yyyy")}`
              : format(selectedDate, "EEEE, d MMMM yyyy")}
          </span>
          <Button variant="ghost" size="sm" onClick={() => navigate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex rounded-lg border border-zinc-200">
          {(["day", "week"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`px-3 py-1.5 text-sm capitalize ${
                view === v ? "bg-zinc-900 text-white" : "text-zinc-600"
              } ${v === "day" ? "rounded-l-lg" : "rounded-r-lg"}`}
            >
              {v}
            </button>
          ))}
        </div>
        <Input
          type="date"
          value={dateStr}
          onChange={(e) => setSelectedDate(new Date(e.target.value))}
          className="w-auto"
        />
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>New reservation</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate({ ...form, guestMode });
              }}
              className="grid gap-4 md:grid-cols-3"
            >
              <div className="md:col-span-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setGuestMode("existing")}
                  className={`rounded-lg px-3 py-1.5 text-sm ${guestMode === "existing" ? "bg-zinc-900 text-white" : "bg-zinc-100"}`}
                >
                  Existing customer
                </button>
                <button
                  type="button"
                  onClick={() => setGuestMode("new")}
                  className={`rounded-lg px-3 py-1.5 text-sm ${guestMode === "new" ? "bg-zinc-900 text-white" : "bg-zinc-100"}`}
                >
                  New guest (creates CRM profile)
                </button>
              </div>
              {guestMode === "existing" ? (
                <Select
                  value={form.customerId}
                  onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                  required
                >
                  <option value="">Select customer</option>
                  {customers.map((c: { id: string; firstName: string; lastName: string }) => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName}
                    </option>
                  ))}
                </Select>
              ) : (
                <>
                  <Input
                    placeholder="First name"
                    value={form.newGuest.firstName}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        newGuest: { ...form.newGuest, firstName: e.target.value },
                      })
                    }
                    required
                  />
                  <Input
                    placeholder="Last name"
                    value={form.newGuest.lastName}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        newGuest: { ...form.newGuest, lastName: e.target.value },
                      })
                    }
                    required
                  />
                  <Input
                    type="email"
                    placeholder="Email (optional)"
                    value={form.newGuest.email}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        newGuest: { ...form.newGuest, email: e.target.value },
                      })
                    }
                  />
                </>
              )}
              <Select
                value={form.tableId}
                onChange={(e) => setForm({ ...form, tableId: e.target.value })}
              >
                <option value="">No table assigned</option>
                {tables.map((t: { id: string; name: string; capacity: number }) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.capacity} seats)
                  </option>
                ))}
              </Select>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
              <Input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                required
              />
              <Input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                required
              />
              <Input
                type="number"
                min={1}
                max={20}
                value={form.partySize}
                onChange={(e) =>
                  setForm({ ...form, partySize: parseInt(e.target.value) })
                }
                required
              />
              <Input
                placeholder="Notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="md:col-span-2"
              />
              <Button type="submit" loading={createMutation.isPending}>
                Create reservation
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
          ) : reservations.length === 0 ? (
            <p className="p-8 text-center text-sm text-zinc-500">
              No reservations for this period
            </p>
          ) : (
            <div className="divide-y divide-zinc-100">
              {reservations.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6"
                >
                  <div>
                    <p className="font-medium text-zinc-900">
                      {r.customer.firstName} {r.customer.lastName}
                    </p>
                    <p className="text-sm text-zinc-500">
                      {formatDate(r.date)} · {r.startTime}–{r.endTime} ·{" "}
                      {r.partySize} guests
                      {r.table && ` · Table ${r.table.name}`}
                    </p>
                    {r.notes && (
                      <p className="mt-1 text-xs text-zinc-400">{r.notes}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={statusBadge(r.status)}>
                      {r.status.toLowerCase()}
                    </Badge>
                    <Select
                      value={r.status}
                      onChange={(e) => handleStatusChange(r, e.target.value)}
                      className="w-32"
                    >
                      {["PENDING", "CONFIRMED", "SEATED", "COMPLETED", "CANCELLED"].map(
                        (s) => (
                          <option key={s} value={s}>
                            {s.toLowerCase()}
                          </option>
                        )
                      )}
                    </Select>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(r)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {r.status !== "CANCELLED" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (window.confirm("Cancel this reservation?")) {
                            cancelMutation.mutate(r.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        open={!!editReservation}
        onClose={() => setEditReservation(null)}
        title="Edit reservation"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!editReservation) return;
            updateMutation.mutate({
              id: editReservation.id,
              body: {
                ...editForm,
                tableId: editForm.tableId || null,
                partySize: Number(editForm.partySize),
              },
            });
          }}
          className="space-y-4"
        >
          <Select
            value={editForm.customerId}
            onChange={(e) => setEditForm({ ...editForm, customerId: e.target.value })}
            required
          >
            {customers.map((c: { id: string; firstName: string; lastName: string }) => (
              <option key={c.id} value={c.id}>
                {c.firstName} {c.lastName}
              </option>
            ))}
          </Select>
          <Select
            value={editForm.tableId}
            onChange={(e) => setEditForm({ ...editForm, tableId: e.target.value })}
          >
            <option value="">No table</option>
            {tables.map((t: { id: string; name: string }) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="date"
              value={editForm.date}
              onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
              required
            />
            <Input
              type="number"
              min={1}
              max={20}
              value={editForm.partySize}
              onChange={(e) =>
                setEditForm({ ...editForm, partySize: parseInt(e.target.value) })
              }
            />
            <Input
              type="time"
              value={editForm.startTime}
              onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })}
            />
            <Input
              type="time"
              value={editForm.endTime}
              onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })}
            />
          </div>
          <Input
            placeholder="Notes"
            value={editForm.notes}
            onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
          />
          <Select
            value={editForm.status}
            onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
          >
            {["PENDING", "CONFIRMED", "SEATED", "COMPLETED", "CANCELLED"].map((s) => (
              <option key={s} value={s}>
                {s.toLowerCase()}
              </option>
            ))}
          </Select>
          <Button type="submit" loading={updateMutation.isPending} className="w-full">
            Save changes
          </Button>
        </form>
      </Modal>

      <Modal
        open={!!completeReservation}
        onClose={() => setCompleteReservation(null)}
        title="Complete visit"
      >
        <p className="mb-4 text-sm text-zinc-600">
          Enter the spend amount for{" "}
          <strong>
            {completeReservation?.customer.firstName}{" "}
            {completeReservation?.customer.lastName}
          </strong>
          . Loyalty points will be awarded automatically.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!completeReservation) return;
            updateMutation.mutate({
              id: completeReservation.id,
              body: {
                status: "COMPLETED",
                spendAmount: parseFloat(spendAmount) || 0,
              },
            });
          }}
          className="space-y-4"
        >
          <div>
            <label className="text-sm font-medium">Spend amount (£)</label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={spendAmount}
              onChange={(e) => setSpendAmount(e.target.value)}
              className="mt-1"
              required
            />
          </div>
          <Button type="submit" loading={updateMutation.isPending} className="w-full">
            Mark completed
          </Button>
        </form>
      </Modal>
    </div>
  );
}
