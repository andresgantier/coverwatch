import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { AlertTriangle, CalendarX, Clock, RefreshCw, type LucideIcon } from "lucide-react";
import { Page } from "@/components/page";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

export const metadata: Metadata = { title: "Alerts" };

type Alert = Database["public"]["Views"]["v_alerts"]["Row"];

const TYPES: Record<string, { title: string; icon: LucideIcon; explain: string }> = {
  SLA_BREACH: { title: "Open tickets out of SLA", icon: Clock, explain: "The contract's first-response time has passed and the ticket is still open." },
  RENEWAL_DECISION: { title: "Renewal decisions", icon: RefreshCw, explain: "Decision deadline (end − notice) overdue or within 30 days." },
  OVERDUE_VISIT: { title: "Overdue preventive visits", icon: CalendarX, explain: "Planned date has passed and the visit is not done." },
};

export default function AlertsPage() {
  return (
    <Page href="/alerts" title="Alerts" description="What needs action today, calculated by the database (v_alerts). No e-mails: this list is the to-do.">
      <AlertList />
    </Page>
  );
}

async function AlertList() {
  await connection();
  const supabase = await createClient();
  const { data, error } = await supabase.from("v_alerts").select("*").order("due_date");
  if (error) throw new Error(error.message);

  // High severity first within each group, then by date.
  const sorted = [...data].sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "HIGH" ? -1 : 1));

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground">
        {data.length} alerts · {data.filter((a) => a.severity === "HIGH").length} high severity
      </p>
      {Object.entries(TYPES).map(([type, meta]) => {
        const rows = sorted.filter((a) => a.alert_type === type);
        const Icon = meta.icon;
        return (
          <section key={type} className="space-y-3">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Icon className="size-5 text-muted-foreground" aria-hidden /> {meta.title}
                <span className="text-muted-foreground">({rows.length})</span>
              </h2>
              <p className="text-sm text-muted-foreground">{meta.explain}</p>
            </div>
            <ul className="divide-y rounded-lg border">
              {rows.map((a) => (
                <li key={`${a.alert_type}-${a.entity_id}`}>
                  <Link href={hrefFor(a)} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-accent">
                    <div className="min-w-0">
                      <p className="font-medium">{a.reference} · <span className="font-normal">{a.customer_name}</span></p>
                      <p className="text-sm text-muted-foreground">{a.title}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{formatDate(a.due_date)}</span>
                      {a.severity === "HIGH" ? (
                        <Badge variant="outline" className="border-red-600/40 text-red-700 dark:text-red-400">
                          <AlertTriangle className="size-3.5" aria-hidden /> High
                        </Badge>
                      ) : (
                        <Badge variant="outline">Medium</Badge>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
              {rows.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">Nothing to do here.</li>}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function hrefFor(a: Alert) {
  if (a.alert_type === "RENEWAL_DECISION") return `/contracts/${a.entity_id}`;
  if (a.alert_type === "SLA_BREACH") return `/service-requests/${a.entity_id}`;
  // Visits have no page of their own: open the plan filtered to that contract.
  const contract = (a.reference ?? "").split(" #")[0];
  return `/visits?view=overdue&q=${encodeURIComponent(contract)}`;
}
