import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PrintButton } from "./print-button";
import { requireRole } from "@/lib/auth";
import { addDays } from "@/lib/data/lists";
import { formatDate, formatDateTime, todayBerlin } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

export const metadata: Metadata = { title: "This week (print)" };

type Visit = Database["public"]["Views"]["v_preventive_visits"]["Row"];

// Paper fallback: what the team needs this week if the system or the internet is down.
export default function ThisWeekPage() {
  return (
    <main className="mx-auto max-w-5xl p-6 text-sm print:max-w-none print:p-0">
      <Suspense fallback={<p>Loading…</p>}>
        <ThisWeek />
      </Suspense>
    </main>
  );
}

async function ThisWeek() {
  await connection();
  const user = await requireRole(["manager", "coordinator", "viewer"]);
  const today = todayBerlin();
  // Rolling week (today + 6 days): on a Sunday the printout still shows the days ahead.
  const from = today;
  const to = addDays(today, 6);

  const supabase = await createClient();
  const [week, overdue, tickets, renewals] = await Promise.all([
    supabase.from("v_preventive_visits").select("*").eq("status", "PLANNED")
      .gte("planned_date", from).lte("planned_date", to).order("planned_date"),
    supabase.from("v_preventive_visits").select("*").eq("is_overdue", true).order("planned_date"),
    supabase.from("v_service_requests").select("*").eq("status", "OPEN").order("sla_due_at", { nullsFirst: false }),
    supabase.from("v_renewal_pipeline").select("*").lte("days_to_decision", 30).order("decision_deadline"),
  ]);
  for (const r of [week, overdue, tickets, renewals]) if (r.error) throw new Error(r.error.message);

  const byTechnician = new Map<string, Visit[]>();
  for (const v of week.data!) {
    const key = v.technician_name ?? "Not assigned";
    byTechnician.set(key, [...(byTechnician.get(key) ?? []), v]);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden /> Back to the app
        </Link>
        <PrintButton />
      </div>

      <header className="border-b pb-3">
        <h1 className="text-xl font-semibold">CoverWatch · This week</h1>
        <p className="text-muted-foreground">
          Velden Klimatechnik GmbH · {formatDate(from)} – {formatDate(to)} · printed {formatDateTime(new Date().toISOString())} by {user.fullName}
        </p>
      </header>

      <PrintSection title={`Open service requests (${tickets.data!.length})`}>
        <table className="w-full border-collapse">
          <thead><tr className="border-b text-left"><Th>Ticket</Th><Th>Prio</Th><Th>Reported</Th><Th>Respond by</Th><Th>Customer / address</Th><Th>Problem</Th><Th>Technician</Th></tr></thead>
          <tbody>
            {tickets.data!.map((t) => (
              <tr key={t.id} className="border-b align-top">
                <Td>{t.ticket_number}</Td>
                <Td>{t.priority}</Td>
                <Td>{formatDateTime(t.reported_at)}</Td>
                <Td>{t.sla_due_at ? formatDateTime(t.sla_due_at) : "billable"}{t.sla_status === "BREACHED" && " (late)"}</Td>
                <Td>{t.customer_name}<br />{t.street}, {t.postal_code} {t.city}</Td>
                <Td>{t.description}</Td>
                <Td>{t.technician_name ?? "–"}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </PrintSection>

      <PrintSection title={`Preventive visits in the next 7 days (${week.data!.length})`}>
        {[...byTechnician.entries()].map(([technician, visits]) => (
          <div key={technician} className="mb-4 break-inside-avoid">
            <h3 className="mb-1 font-semibold">{technician}</h3>
            <VisitTable visits={visits} />
          </div>
        ))}
        {week.data!.length === 0 && <p className="text-muted-foreground">No visits planned in the next 7 days.</p>}
      </PrintSection>

      <PrintSection title={`Overdue preventive visits (${overdue.data!.length})`}>
        <VisitTable visits={overdue.data!} showTechnician />
      </PrintSection>

      <PrintSection title={`Renewal decisions due within 30 days or overdue (${renewals.data!.length})`}>
        <table className="w-full border-collapse">
          <thead><tr className="border-b text-left"><Th>Contract</Th><Th>Customer</Th><Th>Decide by</Th><Th>Ends</Th><Th>Auto-renews</Th><Th>Annual value</Th></tr></thead>
          <tbody>
            {renewals.data!.map((r) => (
              <tr key={r.id} className="border-b">
                <Td>{r.contract_number}</Td><Td>{r.customer_name}</Td><Td>{formatDate(r.decision_deadline)}</Td>
                <Td>{formatDate(r.end_date)}</Td><Td>{r.auto_renew ? "Yes" : "No"}</Td>
                <Td>{new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(r.annual_value_eur ?? 0)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </PrintSection>
    </div>
  );
}

function VisitTable({ visits, showTechnician = false }: { visits: Visit[]; showTechnician?: boolean }) {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-b text-left">
          <Th>Date</Th><Th>Customer / address</Th><Th>Contract</Th>{showTechnician && <Th>Technician</Th>}<Th>Done (date, result, signature)</Th>
        </tr>
      </thead>
      <tbody>
        {visits.map((v) => (
          <tr key={v.id} className="border-b align-top">
            <Td>{formatDate(v.planned_date)}</Td>
            <Td>{v.customer_name}<br /><span className="text-muted-foreground">{v.sites}</span></Td>
            <Td>{v.contract_number} #{v.visit_number} · {v.equipment_count} units</Td>
            {showTechnician && <Td>{v.technician_name ?? "–"}</Td>}
            <Td className="w-48">&nbsp;</Td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PrintSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

const Th = ({ children }: { children: React.ReactNode }) => <th className="py-1 pr-2 font-medium">{children}</th>;
const Td = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <td className={`py-1 pr-2 ${className ?? ""}`}>{children}</td>
);
