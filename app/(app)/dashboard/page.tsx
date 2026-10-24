import type { Metadata } from "next";
import { ComingSoon, Page } from "@/components/page";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <Page href="/dashboard" title="Dashboard" description="Portfolio, renewals, SLA and preventive maintenance at a glance.">
      <ComingSoon>KPIs and charts are added in Phase 9.</ComingSoon>
    </Page>
  );
}
