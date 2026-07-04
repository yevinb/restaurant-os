"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Bot,
  Calendar,
  CreditCard,
  Gift,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Settings,
  Users,
  UsersRound,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { prefetchDashboardRoute } from "@/lib/dashboard-prefetch";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/reservations", label: "Reservations", icon: Calendar },
  { href: "/dashboard/crm", label: "CRM", icon: Users },
  { href: "/dashboard/loyalty", label: "Loyalty", icon: Gift },
  { href: "/dashboard/marketing", label: "Marketing", icon: Megaphone },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/staff", label: "Staff", icon: UsersRound },
  { href: "/dashboard/assistant", label: "AI Assistant", icon: Bot },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function Sidebar({
  mobileOpen,
  onMobileClose,
}: {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  function handlePrefetch(href: string) {
    prefetchDashboardRoute(queryClient, href);
  }

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-zinc-200 bg-white transition-transform lg:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}
    >
      <div className="flex h-16 items-center justify-between border-b border-zinc-100 px-5">
        <Link
          href="/dashboard"
          onClick={onMobileClose}
          className="flex items-center gap-2 hover:opacity-80"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white">
            <UtensilsCrossed className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-900">RestaurantOS</p>
            <p className="truncate text-xs text-zinc-500 max-w-[140px]">
              {session?.user?.restaurantName || "Your restaurant"}
            </p>
          </div>
        </Link>
        <button
          type="button"
          onClick={onMobileClose}
          className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {navItems.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onMobileClose}
              onMouseEnter={() => handlePrefetch(item.href)}
              onFocus={() => handlePrefetch(item.href)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-zinc-100 p-3">
        <div className="mb-2 rounded-lg bg-zinc-50 px-3 py-2">
          <p className="truncate text-xs font-medium text-zinc-900">
            {session?.user?.name || session?.user?.email}
          </p>
          <p className="text-xs capitalize text-zinc-500">
            {session?.user?.role?.toLowerCase() || "staff"}
          </p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
