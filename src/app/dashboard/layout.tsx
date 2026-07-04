import { DashboardShell } from "@/components/layout/dashboard-shell";
import { DashboardLocaleWrapper } from "@/components/dashboard-locale-wrapper";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardLocaleWrapper>
      <DashboardShell>{children}</DashboardShell>
    </DashboardLocaleWrapper>
  );
}
