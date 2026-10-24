import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Page } from "@/components/page";
import { Badge } from "@/components/ui/badge";
import { CONTRACT_TYPES, RENEWAL_BUCKETS, formatDate, formatEur, relativeDays, type ContractType, type RenewalBucket } from "@/lib/labels";
import { listRenewals } from "@/lib/data/lists";
import { ExportButton } from "@/components/export-button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Renewals" };

const COLUMN_STYLE: Record<RenewalBucket, string> = {
  OVERDUE: "border-t-red-600",
  DUE_30: "border-t-amber-500",
  DUE_60: "border-t-yellow-400",
  DUE_90: "border-t-sky-500",
};

export default function RenewalsPage() {
  return (
    <Page
      href="/renewals"
      title="Renewal pipeline"
      description="Active contracts sorted by decision deadline (end date − notice period). After that date the contract renews or ends without a decision."
    >
      <Pipeline />
    </Page>
  );
}

async function Pipeline() {
  await connection();
  const { rows: data } = await listRenewals();

  const buckets = Object.keys(RENEWAL_BUCKETS) as RenewalBucket[];
  const total = data.reduce((s, r) => s + (r.annual_value_eur ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><ExportButton list="renewals" filters={{}} /></div>
      <p className="text-sm text-muted-foreground">
        {data.length} contracts with a decision due in the next 90 days or overdue · {formatEur(total)} annual value at stake
      </p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {buckets.map((b) => {
          const rows = data.filter((r) => r.bucket === b);
          const value = rows.reduce((s, r) => s + (r.annual_value_eur ?? 0), 0);
          return (
            <section key={b} className={cn("space-y-3 rounded-lg border border-t-4 bg-muted/30 p-3", COLUMN_STYLE[b])}>
              <header className="flex items-baseline justify-between gap-2">
                <h2 className="font-medium">{RENEWAL_BUCKETS[b]}</h2>
                <span className="text-sm tabular-nums text-muted-foreground">{rows.length} · {formatEur(value)}</span>
              </header>
              <ul className="space-y-2">
                {rows.map((r) => (
                  <li key={r.id}>
                    <Link href={`/contracts/${r.id}`} className="block rounded-md border bg-background p-3 text-sm transition-colors hover:bg-accent">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium">{r.contract_number}</span>
                        <span className="tabular-nums">{formatEur(r.annual_value_eur)}</span>
                      </div>
                      <div className="text-muted-foreground">{r.customer_name}</div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        <span className={cn(b === "OVERDUE" && "font-medium text-red-700 dark:text-red-400")}>
                          Decide by {formatDate(r.decision_deadline)} ({relativeDays(r.days_to_decision)})
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <Badge variant="secondary">{CONTRACT_TYPES[r.contract_type as ContractType]}</Badge>
                        {r.auto_renew && <Badge variant="outline">Auto-renews</Badge>}
                        <Badge variant="outline">Ends {formatDate(r.end_date)}</Badge>
                      </div>
                    </Link>
                  </li>
                ))}
                {rows.length === 0 && <li className="p-4 text-center text-sm text-muted-foreground">Nothing here.</li>}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
