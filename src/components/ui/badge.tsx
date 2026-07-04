import { cn } from "@/lib/utils";

const variants = {
  default: "bg-zinc-100 text-zinc-700",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-red-50 text-red-700",
  info: "bg-blue-50 text-blue-700",
  purple: "bg-violet-50 text-violet-700",
};

export function Badge({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: keyof typeof variants;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function statusBadge(status: string) {
  const map: Record<string, keyof typeof variants> = {
    PENDING: "warning",
    CONFIRMED: "info",
    SEATED: "purple",
    COMPLETED: "success",
    CANCELLED: "danger",
    DRAFT: "default",
    SCHEDULED: "info",
    SENT: "success",
    FAILED: "danger",
    VIP: "purple",
    REGULAR: "default",
    INACTIVE: "warning",
  };
  return map[status] || "default";
}
