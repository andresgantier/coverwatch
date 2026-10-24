import type { Metadata } from "next";
import { ComingSoon, Page } from "@/components/page";

export const metadata: Metadata = { title: "Contracts" };

export default function ContractsPage() {
  return (
    <Page href="/contracts" title="Contracts" description="Maintenance contracts, their status and covered equipment.">
      <ComingSoon>The contract list, detail, activation and renewal are built in Phase 6.</ComingSoon>
    </Page>
  );
}
