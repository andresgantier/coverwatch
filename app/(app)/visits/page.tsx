import type { Metadata } from "next";
import { ComingSoon, Page } from "@/components/page";

export const metadata: Metadata = { title: "Preventive visits" };

export default function VisitsPage() {
  return (
    <Page href="/visits" title="Preventive visits" description="The preventive maintenance plan.">
      <ComingSoon>Visit planning is built in Phase 8.</ComingSoon>
    </Page>
  );
}
