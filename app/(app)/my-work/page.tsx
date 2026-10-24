import type { Metadata } from "next";
import { ComingSoon, Page } from "@/components/page";

export const metadata: Metadata = { title: "My work" };

export default function MyWorkPage() {
  return (
    <Page href="/my-work" title="My work" description="Your assigned preventive visits and service requests.">
      <ComingSoon>Your visits and tickets are listed here in Phase 8.</ComingSoon>
    </Page>
  );
}
