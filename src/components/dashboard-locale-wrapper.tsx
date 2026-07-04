"use client";

import { useQuery } from "@tanstack/react-query";
import { LocaleProvider } from "@/components/locale-provider";
import { fetchJson } from "@/lib/api-client";

export function DashboardLocaleWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data } = useQuery({
    queryKey: ["settings-locale"],
    queryFn: async () => {
      const res = await fetchJson<{ locale?: string; currency?: string }>(
        "/api/settings"
      );
      if (!res.ok) return { locale: "en", currency: "GBP" };
      return res.data!;
    },
    staleTime: 60_000,
  });

  return (
    <LocaleProvider
      locale={data?.locale ?? "en"}
      currency={data?.currency ?? "GBP"}
    >
      {children}
    </LocaleProvider>
  );
}
