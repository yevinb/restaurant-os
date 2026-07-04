"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { AssistantMessage } from "@/components/assistant-message";
import { fetchJson } from "@/lib/api-client";
import { Bot, Send, Sparkles } from "lucide-react";

type Message = {
  id: string;
  role: string;
  content: string;
  createdAt: string;
};

const suggestions = [
  "How did we perform this week?",
  "Who are my best customers and how do I keep them?",
  "What days are slowest and what promos should I run?",
  "How can I reduce no-shows and fill empty tables?",
  "Give me a 7-day action plan to increase revenue",
  "Which inactive customers should I win back first?",
];

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
      return json as { messages: Message[]; aiMode: "groq" | "openai" | "rules" };
    },
    staleTime: 30_000,
  });

  const messages = data?.messages ?? [];
  const aiMode = data?.aiMode ?? "rules";

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

  const aiLabel =
    aiMode === "groq"
      ? "Groq powered"
      : aiMode === "openai"
        ? "OpenAI powered"
        : "Rules engine";

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-zinc-900">AI Assistant</h1>
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700">
            <Sparkles className="h-3 w-3" />
            {aiLabel}
          </span>
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          Expert restaurant intelligence — live data from your bookings, CRM, loyalty, and marketing.
        </p>
      </div>

      <Card className="flex flex-1 flex-col overflow-hidden">
        <CardContent className="flex flex-1 flex-col p-0">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {isLoading && (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent" />
              </div>
            )}
            {messages.length === 0 && !isLoading && (
              <div className="text-center py-12">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100">
                  <Bot className="h-7 w-7 text-violet-600" />
                </div>
                <p className="mt-4 font-medium text-zinc-900">
                  Your restaurant intelligence advisor
                </p>
                <p className="mt-2 text-sm text-zinc-500 max-w-md mx-auto">
                  Ask about performance, customers, slow days, marketing ideas, or get a custom action plan.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => sendMutation.mutate(s)}
                      disabled={sendMutation.isPending}
                      className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-600 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 transition-colors"
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
                  className={`max-w-[85%] rounded-xl px-4 py-3 ${
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
                    Analyzing your restaurant data…
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
            className="flex gap-2 border-t border-zinc-100 p-4"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about your restaurant…"
              disabled={sendMutation.isPending}
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
