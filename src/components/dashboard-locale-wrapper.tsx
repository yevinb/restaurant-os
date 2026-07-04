"use client";

import { useSession } from "next-auth/react";
import { LocaleProvider } from "@/components/locale-provider";

export function DashboardLocaleWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();

  return (
    <LocaleProvider
      locale={session?.user?.locale ?? "en"}
      currency={session?.user?.currency ?? "GBP"}
    >
      {children}
    </LocaleProvider>
  );
}
