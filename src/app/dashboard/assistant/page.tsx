"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AssistantMessage } from "@/components/assistant-message";
import { fetchJson } from "@/lib/api-client";
import { Bot, Send, Sparkles, Trash2, AlertCircle } from "lucide-react";
import type { AiProvider } from "@/lib/openai-assistant";

type Message = {
  id: string;
  role: string;
  content: string;
  createdAt: string;
};

const suggestions = [
  "How can I improve my restaurant this week?",
  "Give me a step-by-step plan to increase revenue",
  "Who are my best customers and how do I keep them?",
  "What marketing campaign should I run for slow days?",
  "How do I reduce no-shows and fill empty tables?",
  "Help me design a loyalty program that actually works",
];

const AI_LABELS: Record<AiProvider, string> = {
  groq: "AI · Groq",
  openai: "AI · OpenAI",
  gemini: "AI · Gemini",
  anthropic: "AI · Claude",
  rules: "Smart mode",
};

const AI_COLORS: Record<AiProvider, string> = {
  groq: "bg-violet-100 text-violet-700",
  openai: "bg-emerald-100 text-emerald-700",
  gemini: "bg-blue-100 text-blue-700",
  anthropic: "bg-orange-100 text-orange-700",
  rules: "bg-amber-100 text-amber-700",
};

export default function AssistantPage() {
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const prevMessageCountRef = useRef(0);

  const { data, isLoading, error } = useQuery({
    queryKey: ["assistant"],
    queryFn: async () => {
      const res = await fetch("/api/assistant");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load assistant");
      return json as {
        messages: Message[];
        aiMode: AiProvider;
        aiConfigured: boolean;
      };
    },
    staleTime: 30_000,
  });

  const messages = data?.messages ?? [];
  const aiMode = data?.aiMode ?? "rules";
  const aiConfigured = data?.aiConfigured ?? false;

  const sendMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await fetchJson("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      shouldAutoScrollRef.current = true;
      queryClient.invalidateQueries({ queryKey: ["assistant"] });
      setInput("");
    },
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      const res = await fetchJson("/api/assistant", { method: "DELETE" });
      if (!res.ok) throw new Error(res.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assistant"] });
    },
  });

  function scrollToBottom() {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    shouldAutoScrollRef.current = distanceFromBottom < 100;
  }

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (!shouldAutoScrollRef.current) return;
    const count = messages.length;
    const newMessages = count > prevMessageCountRef.current;
    prevMessageCountRef.current = count;
    if (newMessages || sendMutation.isPending) {
      requestAnimationFrame(() => scrollToBottom());
    }
  }, [messages.length, sendMutation.isPending]);

  function sendMessage(message: string) {
    shouldAutoScrollRef.current = true;
    sendMutation.mutate(message);
  }

  if (isLoading && !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {(error as Error).message}
      </div>
    );
  }

  return (
    /*
     * Fixed viewport chat — breaks out of dashboard padding so the message
     * list gets a real bounded height and scrolls on mobile.
     */
    <div className="fixed inset-x-0 bottom-0 top-14 z-10 flex flex-col bg-zinc-50 lg:left-64 lg:top-0">
      {/* Header */}
      <div className="shrink-0 border-b border-zinc-200 bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-lg font-bold text-zinc-900 sm:text-xl">
                AI Assistant
              </h1>
              <span
                className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium sm:text-xs ${AI_COLORS[aiMode]}`}
              >
                <Sparkles className="h-3 w-3" />
                {AI_LABELS[aiMode]}
              </span>
            </div>
            <p className="hidden text-xs text-zinc-500 sm:block">
              Ask anything about your restaurant — powered by your live data.
            </p>
          </div>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (window.confirm("Clear chat history?")) {
                  clearMutation.mutate();
                }
              }}
              loading={clearMutation.isPending}
              className="shrink-0"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        {!aiConfigured && messages.length === 0 && (
          <div className="mx-auto mt-2 flex max-w-3xl items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <p>
              Add <strong>GROQ_API_KEY</strong> in Render for full AI (free at
              groq.com).
            </p>
          </div>
        )}
      </div>

      {/* Scrollable messages — flex-1 + min-h-0 is critical */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4 sm:px-6"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div className="mx-auto max-w-3xl space-y-4">
          {messages.length === 0 && (
            <div className="py-6 text-center sm:py-10">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100">
                <Bot className="h-6 w-6 text-violet-600" />
              </div>
              <p className="mt-3 font-medium text-zinc-900">
                Your restaurant AI advisor
              </p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500">
                Ask me anything — I&apos;ll analyze your live data and give
                step-by-step action plans.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => sendMessage(s)}
                    disabled={sendMutation.isPending}
                    className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-left text-xs text-zinc-600 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[90%] rounded-xl px-4 py-3 sm:max-w-[85%] ${
                  m.role === "user"
                    ? "bg-zinc-900 text-white"
                    : "border border-zinc-200 bg-white text-zinc-900 shadow-sm"
                }`}
              >
                {m.role === "user" ? (
                  <p className="whitespace-pre-wrap text-sm">{m.content}</p>
                ) : (
                  <AssistantMessage content={m.content} />
                )}
              </div>
            </div>
          ))}

          {sendMutation.isPending && (
            <div className="flex justify-start">
              <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2 text-sm text-zinc-500">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
                  {aiConfigured
                    ? "Thinking through your data…"
                    : "Building your action plan…"}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input pinned to bottom */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim() && !sendMutation.isPending) {
            sendMessage(input.trim());
          }
        }}
        className="shrink-0 border-t border-zinc-200 bg-white px-4 py-3 sm:px-6"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto flex max-w-3xl gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about your restaurant…"
            disabled={sendMutation.isPending}
            className="flex-1"
          />
          <Button type="submit" loading={sendMutation.isPending}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
