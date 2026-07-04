"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, statusBadge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { EmailPreview } from "@/components/marketing/email-preview";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/utils";
import { fetchJson } from "@/lib/api-client";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import {
  Megaphone,
  Zap,
  Sparkles,
  Users,
  Mail,
  Trash2,
  Pencil,
  LayoutTemplate,
} from "lucide-react";

type Template = {
  id: string;
  name: string;
  segment: string;
  subject: string;
  body: string;
};

type AutomationRule = {
  id: string;
  name: string;
  triggerDays: number;
  segment: string;
  subject: string;
  body: string;
  isActive: boolean;
  lastRunAt?: string;
};

export default function MarketingPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showAutomationForm, setShowAutomationForm] = useState(false);
  const [editRule, setEditRule] = useState<AutomationRule | null>(null);
  const [aiGoal, setAiGoal] = useState("Fill empty tables this week");
  const [form, setForm] = useState({
    name: "",
    subject: "",
    body: "",
    segment: "INACTIVE",
  });
  const [automationForm, setAutomationForm] = useState({
    name: "",
    triggerDays: 30,
    segment: "INACTIVE",
    subject: "We miss you at our restaurant!",
    body: "Hi {name}, it's been a while! Come back and enjoy 10% off your next visit.",
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["marketing"],
    queryFn: async () => {
      const res = await fetch("/api/marketing");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load marketing");
      return json;
    },
  });

  const { data: segmentPreview } = useQuery({
    queryKey: ["marketing-preview", form.segment],
    queryFn: () =>
      fetch(`/api/marketing?preview=${form.segment}&days=30`).then((r) =>
        r.json()
      ),
    enabled: !error,
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const res = await fetchJson("/api/marketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", ...form }),
      });
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["marketing"] });
      setForm({ name: "", subject: "", body: "", segment: "INACTIVE" });
      const d = data as { emailsSent?: number };
      toast(`Campaign sent to ${d.emailsSent ?? 0} recipients`);
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const aiMutation = useMutation({
    mutationFn: async () => {
      const res = await fetchJson("/api/marketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generateCopy",
          segment: form.segment,
          goal: aiGoal,
        }),
      });
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: (data) => {
      const d = data as { subject: string; body: string; campaignName: string };
      setForm({
        ...form,
        name: d.campaignName,
        subject: d.subject,
        body: d.body,
      });
      toast("AI campaign copy generated");
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const createAutomation = useMutation({
    mutationFn: async (payload: typeof automationForm) => {
      const res = await fetchJson("/api/marketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "createAutomation", ...payload }),
      });
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing"] });
      setShowAutomationForm(false);
      toast("Automation rule created");
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const updateAutomation = useMutation({
    mutationFn: async (payload: AutomationRule) => {
      const res = await fetchJson("/api/marketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateAutomation", ...payload }),
      });
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing"] });
      setEditRule(null);
      toast("Automation updated");
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const deleteAutomation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetchJson("/api/marketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deleteAutomation", id }),
      });
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing"] });
      toast("Automation deleted");
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const runAutomations = useMutation({
    mutationFn: async () => {
      const res = await fetchJson("/api/marketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "runAutomations" }),
      });
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["marketing"] });
      const d = data as { ran?: number; totalEmailsSent?: number };
      toast(
        `Ran ${d.ran ?? 0} automation(s), ${d.totalEmailsSent ?? 0} emails sent`
      );
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const {
    campaigns = [],
    automationRules = [],
    segments = {},
    templates = [],
    emailLogs = [],
    emailConfigured = false,
  } = data || {};

  const segmentCards = [
    {
      label: "VIP customers",
      segment: "VIP",
      desc: "High-value guests",
      stats: segments.VIP,
    },
    {
      label: "Inactive (30+ days)",
      segment: "INACTIVE",
      desc: "Win-back targets",
      stats: segments.INACTIVE,
    },
    {
      label: "High spenders",
      segment: "HIGH_SPENDERS",
      desc: "Top 20 by spend",
      stats: segments.HIGH_SPENDERS,
    },
    {
      label: "All customers",
      segment: "ALL",
      desc: "Full database",
      stats: segments.ALL,
    },
  ];

  function applyTemplate(t: Template) {
    setForm({
      name: t.name,
      subject: t.subject,
      body: t.body,
      segment: t.segment,
    });
    toast(`Template "${t.name}" applied`);
  }

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
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-zinc-900">Marketing</h1>
            <Badge variant={emailConfigured ? "success" : "warning"}>
              {emailConfigured ? "Email sending on" : "Email log only"}
            </Badge>
          </div>
          <p className="text-sm text-zinc-500">
            AI-powered campaigns, segments, automations & templates
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAutomationForm(true)}>
            New automation
          </Button>
          <Button
            onClick={() => runAutomations.mutate()}
            loading={runAutomations.isPending}
          >
            <Zap className="h-4 w-4" />
            Run automations
          </Button>
        </div>
      </div>

      {/* Segment analytics */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {segmentCards.map((s) => (
          <button
            key={s.segment}
            type="button"
            onClick={() => setForm((f) => ({ ...f, segment: s.segment }))}
            className={`rounded-xl border p-5 text-left transition-all hover:shadow-md ${
              form.segment === s.segment
                ? "border-zinc-900 bg-zinc-50 ring-1 ring-zinc-900"
                : "border-zinc-200 bg-white"
            }`}
          >
            <Megaphone className="h-5 w-5 text-zinc-400" />
            <p className="mt-3 font-medium">{s.label}</p>
            <p className="text-xs text-zinc-500">{s.desc}</p>
            {s.stats && (
              <div className="mt-3 flex gap-3 text-xs">
                <span className="flex items-center gap-1 text-zinc-600">
                  <Users className="h-3 w-3" />
                  {s.stats.total} total
                </span>
                <span className="flex items-center gap-1 text-emerald-600">
                  <Mail className="h-3 w-3" />
                  {s.stats.reachable} reachable
                </span>
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Campaign composer */}
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Compose campaign</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => aiMutation.mutate()}
                  loading={aiMutation.isPending}
                >
                  <Sparkles className="h-4 w-4" />
                  AI write
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="AI goal (e.g. Fill Tuesday tables, win back VIPs…)"
                value={aiGoal}
                onChange={(e) => setAiGoal(e.target.value)}
              />

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMutation.mutate();
                }}
                className="space-y-4"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    placeholder="Campaign name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                  <Select
                    value={form.segment}
                    onChange={(e) =>
                      setForm({ ...form, segment: e.target.value })
                    }
                  >
                    <option value="VIP">VIP</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="HIGH_SPENDERS">High spenders</option>
                    <option value="ALL">All customers</option>
                  </Select>
                </div>

                {segmentPreview && (
                  <p className="text-xs text-zinc-500">
                    This segment: {segmentPreview.total} customers ·{" "}
                    {segmentPreview.reachable} with email addresses
                  </p>
                )}

                <Input
                  placeholder="Email subject"
                  value={form.subject}
                  onChange={(e) =>
                    setForm({ ...form, subject: e.target.value })
                  }
                  required
                />
                <textarea
                  className="min-h-[120px] w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                  placeholder="Email body — use {name} for personalization, **bold** for emphasis"
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  required
                />
                <Button type="submit" loading={sendMutation.isPending} className="w-full">
                  Send campaign
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Templates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LayoutTemplate className="h-5 w-5" />
                Campaign templates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {(templates as Template[]).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => applyTemplate(t)}
                    className="rounded-lg border border-zinc-200 p-4 text-left hover:border-zinc-400 hover:bg-zinc-50 transition-colors"
                  >
                    <p className="font-medium text-sm">{t.name}</p>
                    <p className="mt-1 text-xs text-zinc-500 truncate">
                      {t.subject}
                    </p>
                    <Badge variant="default" className="mt-2">
                      {t.segment.toLowerCase()}
                    </Badge>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live preview */}
        <div className="lg:col-span-2">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Live preview</CardTitle>
            </CardHeader>
            <CardContent>
              <EmailPreview
                subject={form.subject}
                body={form.body}
                sampleName={
                  segmentPreview?.sample?.[0]?.name?.split(" ")[0] || "Sarah"
                }
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* History + automations */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Campaign history</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex h-24 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent" />
              </div>
            ) : campaigns.length === 0 ? (
              <p className="p-6 text-sm text-zinc-500">No campaigns yet</p>
            ) : (
              <div className="divide-y divide-zinc-100 max-h-96 overflow-y-auto">
                {campaigns.map(
                  (c: {
                    id: string;
                    name: string;
                    segment: string;
                    status: string;
                    recipientCount: number;
                    openRate?: number;
                    sentAt?: string;
                  }) => (
                    <div key={c.id} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{c.name}</p>
                        <Badge variant={statusBadge(c.status)}>
                          {c.status.toLowerCase()}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">
                        {c.segment.replace("_", " ").toLowerCase()} ·{" "}
                        {c.recipientCount} recipients
                        {c.sentAt && ` · ${formatDate(c.sentAt)}`}
                      </p>
                    </div>
                  )
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Automation rules</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-zinc-100">
              {automationRules.length === 0 && (
                <p className="p-6 text-sm text-zinc-500">
                  No rules yet — create one to auto-send win-back emails.
                </p>
              )}
              {(automationRules as AutomationRule[]).map((r) => (
                <div
                  key={r.id}
                  className="flex items-start justify-between gap-3 px-6 py-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{r.name}</p>
                      <Badge variant={r.isActive ? "success" : "default"}>
                        {r.isActive ? "active" : "paused"}
                      </Badge>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">
                      {r.segment.replace("_", " ").toLowerCase()} · after{" "}
                      {r.triggerDays} days
                      {r.lastRunAt && ` · last run ${formatDate(r.lastRunAt)}`}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditRule(r)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (window.confirm("Delete this automation?")) {
                          deleteAutomation.mutate(r.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email log
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {emailLogs.length === 0 ? (
            <p className="p-6 text-sm text-zinc-500">
              Sent emails will appear here after you run a campaign.
            </p>
          ) : (
            <div className="divide-y divide-zinc-100 max-h-64 overflow-y-auto">
              {emailLogs.map(
                (e: {
                  id: string;
                  toName: string;
                  toEmail: string;
                  subject: string;
                  status: string;
                  errorMessage?: string;
                  sentAt: string;
                }) => (
                  <div key={e.id} className="flex items-center justify-between px-6 py-3">
                    <div>
                      <p className="text-sm font-medium">{e.toName}</p>
                      <p className="text-xs text-zinc-500">
                        {e.toEmail} · {e.subject}
                      </p>
                      {e.errorMessage && (
                        <p className="mt-1 text-xs text-red-600">{e.errorMessage}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <Badge
                        variant={e.status === "DELIVERED" ? "success" : "warning"}
                      >
                        {e.status.toLowerCase()}
                      </Badge>
                      <p className="mt-1 text-xs text-zinc-400">
                        {formatDate(e.sentAt)}
                      </p>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* New automation modal */}
      <Modal
        open={showAutomationForm}
        onClose={() => setShowAutomationForm(false)}
        title="Create automation rule"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createAutomation.mutate(automationForm);
          }}
          className="space-y-4"
        >
          <Input
            placeholder="Rule name"
            value={automationForm.name}
            onChange={(e) =>
              setAutomationForm({ ...automationForm, name: e.target.value })
            }
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="number"
              min={1}
              placeholder="Days inactive"
              value={automationForm.triggerDays}
              onChange={(e) =>
                setAutomationForm({
                  ...automationForm,
                  triggerDays: parseInt(e.target.value),
                })
              }
            />
            <Select
              value={automationForm.segment}
              onChange={(e) =>
                setAutomationForm({ ...automationForm, segment: e.target.value })
              }
            >
              <option value="INACTIVE">Inactive</option>
              <option value="VIP">VIP</option>
              <option value="HIGH_SPENDERS">High spenders</option>
              <option value="ALL">All</option>
            </Select>
          </div>
          <Input
            placeholder="Email subject"
            value={automationForm.subject}
            onChange={(e) =>
              setAutomationForm({ ...automationForm, subject: e.target.value })
            }
            required
          />
          <textarea
            className="min-h-[80px] w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            value={automationForm.body}
            onChange={(e) =>
              setAutomationForm({ ...automationForm, body: e.target.value })
            }
            required
          />
          <Button type="submit" loading={createAutomation.isPending} className="w-full">
            Create rule
          </Button>
        </form>
      </Modal>

      {/* Edit automation modal */}
      <Modal
        open={!!editRule}
        onClose={() => setEditRule(null)}
        title="Edit automation"
      >
        {editRule && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateAutomation.mutate(editRule);
            }}
            className="space-y-4"
          >
            <Input
              value={editRule.name}
              onChange={(e) =>
                setEditRule({ ...editRule, name: e.target.value })
              }
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                value={editRule.triggerDays}
                onChange={(e) =>
                  setEditRule({
                    ...editRule,
                    triggerDays: parseInt(e.target.value),
                  })
                }
              />
              <Select
                value={editRule.isActive ? "active" : "paused"}
                onChange={(e) =>
                  setEditRule({
                    ...editRule,
                    isActive: e.target.value === "active",
                  })
                }
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
              </Select>
            </div>
            <Input
              value={editRule.subject}
              onChange={(e) =>
                setEditRule({ ...editRule, subject: e.target.value })
              }
            />
            <textarea
              className="min-h-[80px] w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              value={editRule.body}
              onChange={(e) =>
                setEditRule({ ...editRule, body: e.target.value })
              }
            />
            <Button type="submit" loading={updateAutomation.isPending} className="w-full">
              Save changes
            </Button>
          </form>
        )}
      </Modal>
    </div>
  );
}
