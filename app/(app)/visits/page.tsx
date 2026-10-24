import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { CalendarClock, CheckCircle2 } from "lucide-react";
import { Page } from "@/components/page";
import { Stat } from "@/components/stat";
import { FilterBar, FilterSelect, SearchInput } from "@/components/filters";
import { ConfirmButton } from "@/components/forms/confirm-button";
import { PlanVisitDialog, VisitOutcomeDialog } from "@/components/visits/forms";
import { VisitStatus } from "@/components/visits/visit-status";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cancelVisit, planVisit, recordVisitOutcome } from "@/app/actions/visits";
import { getCurrentUser } from "@/lib/auth";
import { canEditMasterData, param, searchTerm, technicianOptions } from "@/lib/data/master-data";
import { formatDate, todayBerlin } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Preventive visits" };

const VIEWS = [
  { value: "open", label: "All planned" },
  { value: "overdue", label: "Overdue" },
  { value: "next30", label: "Next 30 days" },
  { value: "unassigned", label: "Planned, no technician" },
  { value: "done", label: "Done" },
  { value: "all", label: "All visits" },
];

export default function VisitsPage({ searchParams }: PageProps<"/visits">) {
  return (
    <Page href="/visits" title="Preventive visits"
      description="The maintenance plan promised by the contracts. Due dates come from the contract; coordinators decide who goes and when.">
      <VisitPlan searchParams={searchParams} />
    </Page>
  );
}

async function VisitPlan({ searchParams }: { searchParams: PageProps<"/visits">["searchParams"] }) {
  await connection();
  const [user, sp] = await Promise.all([getCurrentUser(), searchParams]);
  const view = param(sp.view) || "open";
  const technician = param(sp.technician);
  const q = searchTerm(param(sp.q));
  const today = todayBerlin();
  const in30 = addDays(today, 30);

  const supabase = await createClient();
  let query = supabase.from("v_preventive_visits").select("*").limit(500);
  if (view === "open" || view === "unassigned" || view === "next30") query = query.eq("status", "PLANNED");
  if (view === "overdue") query = query.eq("is_overdue", true);
  if (view === "next30") query = query.gte("planned_date", today).lte("planned_date", in30);
  if (view === "unassigned") query = query.is("assigned_technician_id", null);
  if (view === "done") query = query.eq("status", "DONE");
  if (technician === "none") query = query.is("assigned_technician_id", null);
  else if (/^[0-9a-f-]{36}$/i.test(technician)) query = query.eq("assigned_technician_id", technician);
  if (q) query = query.or(`customer_name.ilike.%${q}%,contract_number.ilike.%${q}%`);
  query = view === "done" || view === "all"
    ? query.order("planned_date", { ascending: false })
    : query.order("planned_date");

  const canEdit = canEditMasterData(user.role);
  const [{ data: visits, error }, technicians, kpis, unassignedSoon] = await Promise.all([
    query,
    technicianOptions(),
    supabase.from("v_dashboard_kpis").select("plan_compliance_pct_12m, overdue_visits").single(),
    supabase.from("v_preventive_visits").select("id", { count: "exact", head: true })
      .eq("status", "PLANNED").gte("planned_date", today).lte("planned_date", in30).is("assigned_technician_id", null),
  ]);
  if (error) throw new Error(error.message);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="Plan compliance (12 months)" value={`${kpis.data?.plan_compliance_pct_12m ?? "–"} %`}
          hint="Visits done within 14 days of their due date" />
        <Stat label="Overdue visits" value={kpis.data?.overdue_visits ?? 0} hint="Planned date passed, not done" />
        <Stat label="Next 30 days without technician" value={unassignedSoon.count ?? 0} className="col-span-2 lg:col-span-1" />
      </div>

      <FilterBar action="/visits" clearHref={view !== "open" || technician || q ? "/visits" : undefined}>
        <SearchInput defaultValue={q} placeholder="Customer or contract" />
        <FilterSelect name="view" label="Visits" value={view} options={VIEWS} />
        <FilterSelect name="technician" label="Technician" value={technician}
          options={[{ value: "", label: "All technicians" }, { value: "none", label: "Not assigned" }, ...technicians]} />
      </FilterBar>

      <p className="text-sm text-muted-foreground">{visits.length} visits{visits.length === 500 && " (first 500)"}</p>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Visit</TableHead>
              <TableHead>Due / scheduled</TableHead>
              <TableHead className="hidden md:table-cell">Technician</TableHead>
              <TableHead>Status</TableHead>
              {canEdit && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visits.map((v) => {
              const label = `${v.contract_number} #${v.visit_number}`;
              return (
                <TableRow key={v.id}>
                  <TableCell>
                    <Link href={`/contracts/${v.contract_id}`} className="font-medium hover:underline">{label}</Link>
                    <div className="text-xs text-muted-foreground">{v.customer_name} · {v.equipment_count} units</div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div>{formatDate(v.due_date)}</div>
                    {v.scheduled_date && <div className="text-xs text-muted-foreground">scheduled {formatDate(v.scheduled_date)}</div>}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{v.technician_name ?? <span className="text-muted-foreground">–</span>}</TableCell>
                  <TableCell><VisitStatus visit={v} /></TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      {v.status === "PLANNED" && (
                        <div className="flex justify-end gap-1">
                          <PlanVisitDialog action={planVisit.bind(null, v.id!)} technicians={technicians}
                            visit={{ label, dueDate: formatDate(v.due_date), scheduled_date: v.scheduled_date, assigned_technician_id: v.assigned_technician_id }}
                            trigger={<Button variant="ghost" size="sm"><CalendarClock className="size-4" aria-hidden /> Plan</Button>} />
                          <VisitOutcomeDialog action={recordVisitOutcome.bind(null, v.id!)} today={today} label={label}
                            trigger={<Button variant="ghost" size="sm"><CheckCircle2 className="size-4" aria-hidden /> Done</Button>} />
                          <ConfirmButton action={cancelVisit.bind(null, v.id!)} title="Cancel this visit?"
                            description="The visit stays in the history but no longer counts as planned. Use it only when the customer agreed to skip it."
                            confirmLabel="Cancel visit" variant="ghost">
                            Cancel
                          </ConfirmButton>
                        </div>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
            {visits.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">No visits match these filters.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function addDays(isoDate: string, n: number) {
  const d = new Date(isoDate + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
