"use client";

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-zinc-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && !part.startsWith("**")) {
      return (
        <em key={i} className="italic">
          {part.slice(1, -1)}
        </em>
      );
    }
    return part;
  });
}

export function AssistantMessage({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const trimmed = lines[i].trim();

    if (!trimmed) {
      i++;
      continue;
    }

    if (trimmed.startsWith("### ")) {
      elements.push(
        <h4 key={i} className="mt-3 text-sm font-semibold text-zinc-900">
          {renderInline(trimmed.slice(4))}
        </h4>
      );
      i++;
      continue;
    }

    if (trimmed.startsWith("## ")) {
      elements.push(
        <h3 key={i} className="mt-4 text-base font-semibold text-zinc-900">
          {renderInline(trimmed.slice(3))}
        </h3>
      );
      i++;
      continue;
    }

    if (trimmed.startsWith("# ")) {
      elements.push(
        <h2 key={i} className="mt-4 text-lg font-bold text-zinc-900">
          {renderInline(trimmed.slice(2))}
        </h2>
      );
      i++;
      continue;
    }

    if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
      elements.push(
        <div key={i} className="flex gap-2 pl-1">
          <span className="mt-0.5 text-violet-500 shrink-0">•</span>
          <span>{renderInline(trimmed.replace(/^[-•]\s*/, ""))}</span>
        </div>
      );
      i++;
      continue;
    }

    if (/^\d+\.\s/.test(trimmed)) {
      const match = trimmed.match(/^(\d+)\.\s(.*)$/);
      if (match) {
        elements.push(
          <div key={i} className="flex gap-2 pl-1">
            <span className="font-semibold text-violet-600 shrink-0">
              {match[1]}.
            </span>
            <span>{renderInline(match[2])}</span>
          </div>
        );
      }
      i++;
      continue;
    }

    elements.push(
      <p key={i} className="leading-relaxed">
        {renderInline(trimmed)}
      </p>
    );
    i++;
  }

  return <div className="space-y-2 text-sm">{elements}</div>;
}
