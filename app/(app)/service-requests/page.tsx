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
import { canEditMasterData, equipmentOptions, technicianOptions } from "@/lib/data/master-data";
import { TICKET_LIMIT, listTickets } from "@/lib/data/lists";
import { ExportButton } from "@/components/export-button";
import {
  SLA_STATUSES, TICKET_PRIORITIES, TICKET_STATUSES, formatDateTime, formatHours, options, toBerlinInput,
} from "@/lib/labels";

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
  const canEdit = canEditMasterData(user.role);
  const [{ filters, rows: tickets }, technicians, equipment] = await Promise.all([
    listTickets(sp),
    technicianOptions(),
    canEdit ? equipmentOptions() : Promise.resolve([]),
  ]);
  const { q, status, priority, sla, billable, technician, period } = filters;

  const withSla = tickets.filter((t) => t.sla_status === "MET" || t.sla_status === "BREACHED");
  // One decimal, rounded like the dashboard KPI.
  const metPct = withSla.length
    ? Math.round((1000 * withSla.filter((t) => t.sla_status === "MET").length) / withSla.length) / 10
    : null;
  const filtered = Boolean(q || status !== "OPEN" || priority || sla || billable || technician || period);

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
          <FilterSelect name="period" label="Reported" value={period}
            options={[{ value: "", label: "Any time" }, { value: "90d", label: "Last 90 days" }, { value: "12m", label: "Last 12 months" }]} />
          <FilterSelect name="technician" label="Technician" value={technician}
            options={[{ value: "", label: "All technicians" }, { value: "none", label: "Not assigned" }, ...technicians]} />
        </FilterBar>
        <div className="flex gap-2">
        <ExportButton list="service-requests" filters={filters} />
        {canEdit && (
          <TicketCreateDialog action={createTicket} equipment={equipment} technicians={technicians}
            now={toBerlinInput(new Date().toISOString())}
            trigger={<Button><Plus className="size-4" aria-hidden /> New ticket</Button>} />
        )}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {tickets.length} tickets{tickets.length === TICKET_LIMIT && ` (latest ${TICKET_LIMIT})`}
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

