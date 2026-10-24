import type { Metadata } from "next";
import { ComingSoon, Page } from "@/components/page";

export const metadata: Metadata = { title: "Renewals" };

export default function RenewalsPage() {
  return (
    <Page href="/renewals" title="Renewals" description="Active contracts by renewal decision deadline.">
      <ComingSoon>The renewal pipeline is built in Phase 6.</ComingSoon>
    </Page>
  );
}
