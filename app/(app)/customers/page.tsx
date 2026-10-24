import type { Metadata } from "next";
import { ComingSoon, Page } from "@/components/page";

export const metadata: Metadata = { title: "Customers" };

export default function CustomersPage() {
  return (
    <Page href="/customers" title="Customers" description="Customers and their sites.">
      <ComingSoon>Customer management is built in Phase 5.</ComingSoon>
    </Page>
  );
}
