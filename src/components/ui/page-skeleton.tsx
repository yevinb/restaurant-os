export function PageSkeleton({
  cards = 4,
  showHeader = true,
}: {
  cards?: number;
  showHeader?: boolean;
}) {
  return (
    <div className="animate-pulse">
      {showHeader && (
        <div className="mb-8 space-y-2">
          <div className="h-8 w-48 rounded-lg bg-zinc-200" />
          <div className="h-4 w-72 rounded bg-zinc-100" />
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: cards }, (_, i) => (
          <div key={i} className="h-28 rounded-xl bg-zinc-100" />
        ))}
      </div>
      <div className="mt-6 h-64 rounded-xl bg-zinc-100" />
    </div>
  );
}
