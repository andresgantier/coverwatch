import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { CheckCircle2, Clock, MapPin } from "lucide-react";
import { Page } from "@/components/page";
import { PriorityBadge, SlaBadge } from "@/components/service-requests/badges";
import { TicketProgressDialog } from "@/components/service-requests/forms";
import { VisitOutcomeDialog } from "@/components/visits/forms";
import { VisitStatus } from "@/components/visits/visit-status";
import { Button } from "@/components/ui/button";
import { recordTicketProgress } from "@/app/actions/service-requests";
import { recordVisitOutcome } from "@/app/actions/visits";
import { getCurrentUser } from "@/lib/auth";
import { EQUIPMENT_TYPES, formatDate, formatDateTime, toBerlinInput, todayBerlin, type EquipmentType } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

export const metadata: Metadata = { title: "My work" };

type Visit = Database["public"]["Views"]["v_preventive_visits"]["Row"];
type Unit = Database["public"]["Views"]["v_equipment"]["Row"];

export default function MyWorkPage() {
  return (
    <Page href="/my-work" title="My work" description="Your preventive visits and open service requests.">
      <MyWork />
    </Page>
  );
}

async function MyWork() {
  await connection();
  const user = await getCurrentUser();
  const supabase = await createClient();
  const today = todayBerlin();

  // RLS returns only the visits and tickets assigned to the signed-in technician.
  const [planned, done, tickets] = await Promise.all([
    supabase.from("v_preventive_visits").select("*").eq("assigned_technician_id", user.id).eq("status", "PLANNED").order("planned_date"),
    supabase.from("v_preventive_visits").select("*").eq("assigned_technician_id", user.id).eq("status", "DONE")
      .gte("actual_date", addDays(today, -30)).order("actual_date", { ascending: false }),
    supabase.from("v_service_requests").select("*").eq("assigned_technician_id", user.id).eq("status", "OPEN")
      .order("sla_due_at", { nullsFirst: false }),
  ]);
  for (const r of [planned, done, tickets]) if (r.error) throw new Error(r.error.message);

  // Units of each visit's contract, so the technician knows what to service.
  const contractIds = [...new Set(planned.data!.map((v) => v.contract_id!))];
  const unitsByContract = new Map<string, Unit[]>();
  if (contractIds.length) {
    const { data: links, error } = await supabase.from("contract_equipment").select("contract_id, equipment_id").in("contract_id", contractIds);
    if (error) throw new Error(error.message);
    const { data: units, error: unitError } = await supabase.from("v_equipment").select("*")
      .in("id", [...new Set(links.map((l) => l.equipment_id))]);
    if (unitError) throw new Error(unitError.message);
    for (const l of links) {
      const unit = units.find((u) => u.id === l.equipment_id);
      if (unit) unitsByContract.set(l.contract_id, [...(unitsByContract.get(l.contract_id) ?? []), unit]);
    }
  }

  const overdue = planned.data!.filter((v) => v.is_overdue);
  const upcoming = planned.data!.filter((v) => !v.is_overdue && v.planned_date! <= addDays(today, 30));
  const later = planned.data!.filter((v) => !v.is_overdue && v.planned_date! > addDays(today, 30));
  const now = toBerlinInput(new Date().toISOString());

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Open service requests <span className="text-muted-foreground">({tickets.data!.length})</span></h2>
        <div className="grid gap-3 md:grid-cols-2">
          {tickets.data!.map((t) => (
            <article key={t.id} className="space-y-3 rounded-lg border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/service-requests/${t.id}`} className="font-medium hover:underline">{t.ticket_number}</Link>
                <PriorityBadge priority={t.priority} />
                <SlaBadge status={t.sla_status} />
              </div>
              <p className="text-sm">{t.description}</p>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>{t.manufacturer} {t.model} · {t.serial_number}</p>
                <MapLink address={`${t.street}, ${t.postal_code} ${t.city}`} label={`${t.customer_name}, ${t.site_name}`} />
                <p>{t.sla_hours ? <>First response due {formatDateTime(t.sla_due_at)}</> : "No contract: billable work"}</p>
              </div>
              <TicketProgressDialog
                action={recordTicketProgress.bind(null, t.id!)}
                now={now}
                ticket={{
                  first_response_at: toBerlinInput(t.first_response_at), failure_start: toBerlinInput(t.failure_start),
                  failure_end: toBerlinInput(t.failure_end), resolved_at: toBerlinInput(t.resolved_at), resolution_notes: t.resolution_notes,
                }}
                trigger={<Button size="sm" className="w-full sm:w-auto"><Clock className="size-4" aria-hidden /> Record progress</Button>}
              />
            </article>
          ))}
          {tickets.data!.length === 0 && <Empty>No open tickets assigned to you.</Empty>}
        </div>
      </section>

      <VisitSection title="Overdue visits" visits={overdue} units={unitsByContract} today={today} empty="Nothing overdue." />
      <VisitSection title="Next 30 days" visits={upcoming} units={unitsByContract} today={today} empty="No visits in the next 30 days." />
      {later.length > 0 && (
        <details className="rounded-lg border p-4">
          <summary className="cursor-pointer font-medium">Later ({later.length})</summary>
          <ul className="mt-3 space-y-1 text-sm">
            {later.map((v) => (
              <li key={v.id}>{formatDate(v.planned_date)} · {v.contract_number} #{v.visit_number} · {v.customer_name}</li>
            ))}
          </ul>
        </details>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Done in the last 30 days <span className="text-muted-foreground">({done.data!.length})</span></h2>
        <ul className="divide-y rounded-lg border text-sm">
          {done.data!.map((v) => (
            <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
              <span>{v.contract_number} #{v.visit_number} · {v.customer_name}</span>
              <VisitStatus visit={v} />
            </li>
          ))}
          {done.data!.length === 0 && <li className="p-4 text-center text-muted-foreground">Nothing recorded yet.</li>}
        </ul>
      </section>
    </div>
  );
}

function VisitSection({
  title, visits, units, today, empty,
}: { title: string; visits: Visit[]; units: Map<string, Unit[]>; today: string; empty: string }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{title} <span className="text-muted-foreground">({visits.length})</span></h2>
      <div className="grid gap-3 md:grid-cols-2">
        {visits.map((v) => {
          const label = `${v.contract_number} #${v.visit_number}`;
          return (
            <article key={v.id} className="space-y-3 rounded-lg border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{v.customer_name}</span>
                <VisitStatus visit={v} />
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>
                  {v.scheduled_date ? <>Scheduled {formatDate(v.scheduled_date)}</> : <>Due {formatDate(v.due_date)}</>}
                  {" · "}{label}
                </p>
                {(v.sites ?? "").split(" | ").filter(Boolean).map((s) => <MapLink key={s} address={s} label={s} />)}
              </div>
              <ul className="space-y-1 rounded-md bg-muted/50 p-2 text-sm">
                {(units.get(v.contract_id!) ?? []).map((u) => (
                  <li key={u.id}>
                    {u.manufacturer} {u.model} <span className="text-muted-foreground">· {EQUIPMENT_TYPES[u.equipment_type as EquipmentType]} · {u.serial_number}</span>
                  </li>
                ))}
              </ul>
              <VisitOutcomeDialog action={recordVisitOutcome.bind(null, v.id!)} today={today} label={label}
                trigger={<Button size="sm" className="w-full sm:w-auto"><CheckCircle2 className="size-4" aria-hidden /> Record visit</Button>} />
            </article>
          );
        })}
        {visits.length === 0 && <Empty>{empty}</Empty>}
      </div>
    </section>
  );
}

function MapLink({ address, label }: { address: string; label: string }) {
  return (
    <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} target="_blank" rel="noopener noreferrer"
      className="flex items-start gap-1 hover:text-foreground hover:underline">
      <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden /> <span>{label}</span>
    </a>
  );
}

function Empty({ children }: { children: string }) {
  return <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground md:col-span-2">{children}</p>;
}

function addDays(isoDate: string, n: number) {
  const d = new Date(isoDate + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
