import type { Metadata } from "next";
import { ComingSoon, Page } from "@/components/page";

export const metadata: Metadata = { title: "Alerts" };

export default function AlertsPage() {
  return (
    <Page href="/alerts" title="Alerts" description="What needs action today.">
      <ComingSoon>Renewal decisions, overdue visits and tickets out of SLA are listed here in Phase 9.</ComingSoon>
    </Page>
  );
}
