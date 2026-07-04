"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { format, startOfWeek, addDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { fetchJson } from "@/lib/api-client";

const ROLES = ["SERVER", "HOST", "BARTENDER", "CHEF", "MANAGER"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function StaffPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [weekStart, setWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [showForm, setShowForm] = useState(false);
  const [editShift, setEditShift] = useState<{
    id: string;
    userId: string;
    date: string;
    startTime: string;
    endTime: string;
    role: string;
    notes: string;
  } | null>(null);
  const [form, setForm] = useState({
    userId: "",
    date: format(new Date(), "yyyy-MM-dd"),
    startTime: "09:00",
    endTime: "17:00",
    role: "SERVER",
    notes: "",
  });

  const weekStr = format(weekStart, "yyyy-MM-dd");

  const { data, isLoading } = useQuery({
    queryKey: ["shifts", weekStr],
    queryFn: () =>
      fetch(`/api/shifts?weekStart=${weekStr}`).then((r) => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetchJson("/api/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      setShowForm(false);
      toast("Shift added");
      setForm({
        userId: "",
        date: format(new Date(), "yyyy-MM-dd"),
        startTime: "09:00",
        endTime: "17:00",
        role: "SERVER",
        notes: "",
      });
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetchJson(`/api/shifts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      toast("Shift removed");
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: NonNullable<typeof editShift>) => {
      const res = await fetchJson(`/api/shifts/${payload.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      setEditShift(null);
      toast("Shift updated");
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  function handleDeleteShift(id: string) {
    if (window.confirm("Remove this shift?")) {
      deleteMutation.mutate(id);
    }
  }

  const { shifts = [], staff = [] } = data || {};
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  function getShiftsForDay(date: Date) {
    const dateStr = format(date, "yyyy-MM-dd");
    return shifts.filter(
      (s: { date: string }) =>
        format(new Date(s.date), "yyyy-MM-dd") === dateStr
    );
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Staff scheduling</h1>
          <p className="text-sm text-zinc-500">Weekly shift calendar</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" />
          Add shift
        </Button>
      </div>

      <div className="mb-6 flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setWeekStart(addDays(weekStart, -7))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-medium">
          Week of {format(weekStart, "d MMM yyyy")}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setWeekStart(addDays(weekStart, 7))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>New shift</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate();
              }}
              className="grid gap-4 md:grid-cols-3"
            >
              <Select
                value={form.userId}
                onChange={(e) => setForm({ ...form, userId: e.target.value })}
                required
              >
                <option value="">Staff member</option>
                {staff.map(
                  (m: {
                    user: { id: string; name: string; email: string };
                  }) => (
                    <option key={m.user.id} value={m.user.id}>
                      {m.user.name || m.user.email}
                    </option>
                  )
                )}
              </Select>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
              <Select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r.toLowerCase()}
                  </option>
                ))}
              </Select>
              <Input
                type="time"
                value={form.startTime}
                onChange={(e) =>
                  setForm({ ...form, startTime: e.target.value })
                }
              />
              <Input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
              />
              <Input
                placeholder="Notes (availability, section...)"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
              <Button type="submit" loading={createMutation.isPending}>
                Save
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-7">
          {weekDays.map((day, i) => {
            const dayShifts = getShiftsForDay(day);
            return (
              <Card key={i} className="min-h-[180px]">
                <CardHeader className="py-3">
                  <CardTitle className="text-xs">
                    {DAYS[i]} {format(day, "d")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 p-2">
                  {dayShifts.length === 0 && (
                    <p className="px-2 text-xs text-zinc-400">No shifts</p>
                  )}
                  {dayShifts.map(
                    (s: {
                      id: string;
                      startTime: string;
                      endTime: string;
                      role: string;
                      notes?: string;
                      date: string;
                      userId: string;
                      user: { name: string };
                    }) => (
                      <div
                        key={s.id}
                        className="group rounded-lg bg-zinc-100 p-2 text-xs hover:bg-zinc-200"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <button
                            type="button"
                            className="flex-1 text-left"
                            onClick={() =>
                              setEditShift({
                                id: s.id,
                                userId: s.userId,
                                date: format(new Date(s.date), "yyyy-MM-dd"),
                                startTime: s.startTime,
                                endTime: s.endTime,
                                role: s.role,
                                notes: s.notes || "",
                              })
                            }
                          >
                            <p className="font-medium truncate">
                              {s.user.name || "Staff"}
                            </p>
                            <p className="text-zinc-500">
                              {s.startTime}–{s.endTime}
                            </p>
                            <p className="text-zinc-400 capitalize">
                              {s.role.toLowerCase()}
                            </p>
                            {s.notes && (
                              <p className="mt-1 truncate text-zinc-400">{s.notes}</p>
                            )}
                          </button>
                          <button
                            type="button"
                            className="opacity-0 group-hover:opacity-100 p-1 text-red-500"
                            onClick={() => handleDeleteShift(s.id)}
                            title="Remove shift"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    )
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={!!editShift} onClose={() => setEditShift(null)} title="Edit shift">
        {editShift && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateMutation.mutate(editShift);
            }}
            className="space-y-3"
          >
            <Select
              value={editShift.userId}
              onChange={(e) =>
                setEditShift({ ...editShift, userId: e.target.value })
              }
            >
              {staff.map(
                (m: { user: { id: string; name: string; email: string } }) => (
                  <option key={m.user.id} value={m.user.id}>
                    {m.user.name || m.user.email}
                  </option>
                )
              )}
            </Select>
            <Input
              type="date"
              value={editShift.date}
              onChange={(e) =>
                setEditShift({ ...editShift, date: e.target.value })
              }
            />
            <Select
              value={editShift.role}
              onChange={(e) =>
                setEditShift({ ...editShift, role: e.target.value })
              }
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r.toLowerCase()}
                </option>
              ))}
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="time"
                value={editShift.startTime}
                onChange={(e) =>
                  setEditShift({ ...editShift, startTime: e.target.value })
                }
              />
              <Input
                type="time"
                value={editShift.endTime}
                onChange={(e) =>
                  setEditShift({ ...editShift, endTime: e.target.value })
                }
              />
            </div>
            <Input
              placeholder="Notes"
              value={editShift.notes}
              onChange={(e) =>
                setEditShift({ ...editShift, notes: e.target.value })
              }
            />
            <Button type="submit" loading={updateMutation.isPending} className="w-full">
              Save changes
            </Button>
          </form>
        )}
      </Modal>
    </div>
  );
}
