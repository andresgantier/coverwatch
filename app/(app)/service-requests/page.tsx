import type { Metadata } from "next";
import { ComingSoon, Page } from "@/components/page";

export const metadata: Metadata = { title: "Service requests" };

export default function ServiceRequestsPage() {
  return (
    <Page href="/service-requests" title="Service requests" description="Breakdown tickets with coverage and SLA.">
      <ComingSoon>Service requests are built in Phase 7.</ComingSoon>
    </Page>
  );
}
