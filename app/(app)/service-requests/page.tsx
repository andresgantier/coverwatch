import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Plus } from "lucide-react";
import { Page } from "@/components/page";
import { FilterBar, FilterSelect, SearchInput } from "@/components/filters";
import { PriorityBadge, SlaBadge, TicketStatusBadge } from "@/components/service-requests/badges";
import { TicketCreateDialog } from "@/components/service-requests/forms";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createTicket } from "@/app/actions/service-requests";
import { getCurrentUser } from "@/lib/auth";
import { canEditMasterData, equipmentOptions, param, searchTerm, technicianOptions } from "@/lib/data/master-data";
import {
  SLA_STATUSES, TICKET_PRIORITIES, TICKET_STATUSES, formatDateTime, formatHours, options, toBerlinInput,
  type SlaStatus, type TicketPriority, type TicketStatus,
} from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Service requests" };

export default function ServiceRequestsPage({ searchParams }: PageProps<"/service-requests">) {
  return (
    <Page href="/service-requests" title="Service requests"
      description="Breakdown tickets. Coverage and response time (SLA) are decided by the database when a ticket is created.">
      <TicketList searchParams={searchParams} />
    </Page>
  );
}

async function TicketList({ searchParams }: { searchParams: PageProps<"/service-requests">["searchParams"] }) {
  await connection();
  const [user, sp] = await Promise.all([getCurrentUser(), searchParams]);
  const q = searchTerm(param(sp.q));
  const status = param(sp.status) || "OPEN";
  const priority = param(sp.priority);
  const sla = param(sp.sla);
  const billable = param(sp.billable);
  const technician = param(sp.technician);

  const supabase = await createClient();
  let query = supabase.from("v_service_requests").select("*").order("reported_at", { ascending: false }).limit(500);
  if (q) query = query.or(`ticket_number.ilike.%${q}%,customer_name.ilike.%${q}%,serial_number.ilike.%${q}%`);
  if (status in TICKET_STATUSES) query = query.eq("status", status as TicketStatus);
  if (priority in TICKET_PRIORITIES) query = query.eq("priority", priority as TicketPriority);
  if (sla in SLA_STATUSES) query = query.eq("sla_status", sla as SlaStatus);
  if (billable === "yes") query = query.eq("is_billable", true);
  if (technician === "none") query = query.is("assigned_technician_id", null);
  else if (/^[0-9a-f-]{36}$/i.test(technician)) query = query.eq("assigned_technician_id", technician);

  const canEdit = canEditMasterData(user.role);
  const [{ data: tickets, error }, technicians, equipment] = await Promise.all([
    query,
    technicianOptions(),
    canEdit ? equipmentOptions() : Promise.resolve([]),
  ]);
  if (error) throw new Error(error.message);

  const withSla = tickets.filter((t) => t.sla_status === "MET" || t.sla_status === "BREACHED");
  const metPct = withSla.length ? Math.round((100 * withSla.filter((t) => t.sla_status === "MET").length) / withSla.length) : null;
  const filtered = Boolean(q || status !== "OPEN" || priority || sla || billable || technician);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterBar action="/service-requests" clearHref={filtered ? "/service-requests" : undefined}>
          <SearchInput defaultValue={q} placeholder="Ticket, customer or serial" />
          <FilterSelect name="status" label="Status" value={status}
            options={[...options(TICKET_STATUSES), { value: "all", label: "All statuses" }]} />
          <FilterSelect name="priority" label="Priority" value={priority}
            options={[{ value: "", label: "All priorities" }, ...options(TICKET_PRIORITIES)]} />
          <FilterSelect name="sla" label="SLA" value={sla}
            options={[{ value: "", label: "Any SLA status" }, ...options(SLA_STATUSES)]} />
          <FilterSelect name="billable" label="Billable" value={billable}
            options={[{ value: "", label: "Covered and billable" }, { value: "yes", label: "Billable only (no contract)" }]} />
          <FilterSelect name="technician" label="Technician" value={technician}
            options={[{ value: "", label: "All technicians" }, { value: "none", label: "Not assigned" }, ...technicians]} />
        </FilterBar>
        {canEdit && (
          <TicketCreateDialog action={createTicket} equipment={equipment} technicians={technicians}
            now={toBerlinInput(new Date().toISOString())}
            trigger={<Button><Plus className="size-4" aria-hidden /> New ticket</Button>} />
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        {tickets.length} tickets{tickets.length === 500 && " (latest 500)"}
        {metPct !== null && <> · {metPct} % of answered tickets with a contract met the SLA</>}
        {" · "}{tickets.filter((t) => t.is_billable).length} billable
      </p>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ticket</TableHead>
              <TableHead>Unit / customer</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>SLA</TableHead>
              <TableHead className="hidden lg:table-cell">Technician</TableHead>
              <TableHead className="hidden md:table-cell">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="whitespace-nowrap">
                  <Link href={`/service-requests/${t.id}`} className="font-medium hover:underline">{t.ticket_number}</Link>
                  <div className="text-xs text-muted-foreground">{formatDateTime(t.reported_at)}</div>
                </TableCell>
                <TableCell>
                  <div className="line-clamp-1">{t.description}</div>
                  <div className="text-xs text-muted-foreground">{t.customer_name} · {t.manufacturer} {t.model}</div>
                </TableCell>
                <TableCell><PriorityBadge priority={t.priority} /></TableCell>
                <TableCell className="whitespace-nowrap">
                  <SlaBadge status={t.sla_status} />
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {t.response_hours != null
                      ? <>answered in {formatHours(t.response_hours)}{t.sla_hours ? ` / ${t.sla_hours} h` : ""}</>
                      : t.sla_hours ? <>due {formatDateTime(t.sla_due_at)}</> : "billable"}
                  </div>
                </TableCell>
                <TableCell className="hidden lg:table-cell">{t.technician_name ?? <span className="text-muted-foreground">–</span>}</TableCell>
                <TableCell className="hidden md:table-cell"><TicketStatusBadge status={t.status} /></TableCell>
              </TableRow>
            ))}
            {tickets.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">No tickets match these filters.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
