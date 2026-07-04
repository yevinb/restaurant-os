"use client";

import { personalize } from "@/lib/marketing-utils";

export function EmailPreview({
  subject,
  body,
  sampleName = "Sarah",
}: {
  subject: string;
  body: string;
  sampleName?: string;
}) {
  const lines = personalize(body, sampleName).split("\n");

  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-3">
        <p className="text-xs text-zinc-500">Preview for {sampleName}</p>
        <p className="mt-1 text-sm font-medium text-zinc-900">
          {personalize(subject, sampleName) || "Subject line…"}
        </p>
      </div>
      <div className="p-4 text-sm text-zinc-700 max-h-64 overflow-y-auto space-y-2">
        {body ? (
          lines.map((line, i) => {
            const trimmed = line.trim();
            if (!trimmed) return <br key={i} />;
            const parts = trimmed.split(/(\*\*[^*]+\*\*)/g);
            return (
              <p key={i}>
                {parts.map((part, j) =>
                  part.startsWith("**") && part.endsWith("**") ? (
                    <strong key={j}>{part.slice(2, -2)}</strong>
                  ) : (
                    part
                  )
                )}
              </p>
            );
          })
        ) : (
          <p className="text-zinc-400">Email body will appear here…</p>
        )}
      </div>
    </div>
  );
}
