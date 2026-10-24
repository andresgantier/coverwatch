import type { Metadata } from "next";
import { ComingSoon, Page } from "@/components/page";

export const metadata: Metadata = { title: "Equipment" };

export default function EquipmentPage() {
  return (
    <Page href="/equipment" title="Equipment" description="Installed units and their coverage.">
      <ComingSoon>Equipment management is built in Phase 5.</ComingSoon>
    </Page>
  );
}
