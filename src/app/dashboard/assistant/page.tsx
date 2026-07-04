"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
  "What should my menu pricing strategy be?",
  "How should I schedule staff for peak hours?",
];

const AI_LABELS: Record<AiProvider, string> = {
  groq: "AI · Groq",
  openai: "AI · OpenAI",
  gemini: "AI · Gemini",
  anthropic: "AI · Claude",
  rules: "Smart mode (add API key for full AI)",
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
  const bottomRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.messages, sendMutation.isPending]);

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
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <div className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-zinc-900">AI Assistant</h1>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${AI_COLORS[aiMode]}`}
            >
              <Sparkles className="h-3 w-3" />
              {AI_LABELS[aiMode]}
            </span>
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
            >
              <Trash2 className="h-4 w-4" />
              Clear chat
            </Button>
          )}
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          Ask anything about your restaurant — operations, marketing, menu, staff,
          revenue, loyalty, and more. Powered by your live dashboard data.
        </p>
      </div>

      {!aiConfigured && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Enable full AI (free)</p>
            <p className="mt-1 text-amber-800">
              Add <strong>GROQ_API_KEY</strong> (groq.com) or{" "}
              <strong>GEMINI_API_KEY</strong> (aistudio.google.com) in your Render
              environment variables, then redeploy. This unlocks ChatGPT-level
              answers on any restaurant question.
            </p>
          </div>
        </div>
      )}

      <Card className="flex flex-1 flex-col overflow-hidden">
        <CardContent className="flex flex-1 flex-col p-0">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-8 sm:py-12">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100">
                  <Bot className="h-7 w-7 text-violet-600" />
                </div>
                <p className="mt-4 font-medium text-zinc-900">
                  Your restaurant AI advisor
                </p>
                <p className="mt-2 text-sm text-zinc-500 max-w-md mx-auto">
                  Ask me anything — I&apos;ll analyze your live data and give you
                  step-by-step action plans.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2 max-w-2xl mx-auto px-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => sendMutation.mutate(s)}
                      disabled={sendMutation.isPending}
                      className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-600 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 transition-colors text-left"
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
                  className={`max-w-[92%] sm:max-w-[85%] rounded-xl px-4 py-3 ${
                    m.role === "user"
                      ? "bg-zinc-900 text-white text-sm"
                      : "bg-zinc-50 border border-zinc-100 text-zinc-900"
                  }`}
                >
                  {m.role === "user" ? (
                    <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                  ) : (
                    <AssistantMessage content={m.content} />
                  )}
                </div>
              </div>
            ))}
            {sendMutation.isPending && (
              <div className="flex justify-start">
                <div className="rounded-xl bg-zinc-50 border border-zinc-100 px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-zinc-500">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
                    {aiConfigured
                      ? "Thinking through your restaurant data…"
                      : "Building your action plan…"}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (input.trim() && !sendMutation.isPending) {
                sendMutation.mutate(input.trim());
              }
            }}
            className="flex gap-2 border-t border-zinc-100 p-3 sm:p-4"
          >
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
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
