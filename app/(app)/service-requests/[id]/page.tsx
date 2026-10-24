import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft, Ban, CheckCircle2, Clock, Pencil, Receipt } from "lucide-react";
import { Page } from "@/components/page";
import { AuditHistory } from "@/components/audit-history";
import { ConfirmButton } from "@/components/forms/confirm-button";
import { PriorityBadge, SlaBadge, TicketStatusBadge } from "@/components/service-requests/badges";
import { TicketEditDialog, TicketProgressDialog } from "@/components/service-requests/forms";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cancelTicket, recordTicketProgress, updateTicket } from "@/app/actions/service-requests";
import { getCurrentUser } from "@/lib/auth";
import { canEditMasterData, param, technicianOptions } from "@/lib/data/master-data";
import { EQUIPMENT_TYPES, formatDateTime, formatHours, toBerlinInput, type EquipmentType } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Service request" };

export default function ServiceRequestPage({ params, searchParams }: PageProps<"/service-requests/[id]">) {
  return (
    // Technicians may open their own tickets (RLS hides the others).
    <Page href="/service-requests" roles={["manager", "coordinator", "viewer", "technician"]}>
      <TicketDetail params={params} searchParams={searchParams} />
    </Page>
  );
}

async function TicketDetail({
  params, searchParams,
}: { params: PageProps<"/service-requests/[id]">["params"]; searchParams: PageProps<"/service-requests/[id]">["searchParams"] }) {
  await connection();
  const [user, { id }, sp] = await Promise.all([getCurrentUser(), params, searchParams]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const { data: t, error } = await supabase.from("v_service_requests").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!t) notFound();

  const isStaff = canEditMasterData(user.role);
  const isOwnTechnician = user.role === "technician" && t.assigned_technician_id === user.id;
  const canRecord = (isStaff || isOwnTechnician) && t.status !== "CANCELLED";
  const canSeeAudit = user.role === "manager" || user.role === "viewer";

  const [technicians, audit] = await Promise.all([
    isStaff ? technicianOptions() : Promise.resolve([]),
    canSeeAudit
      ? supabase.from("v_audit_log").select("*").eq("record_id", id).order("changed_at", { ascending: false }).limit(20)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (audit.error) throw new Error(audit.error.message);

  const now = toBerlinInput(new Date().toISOString());
  const downtime = downtimeHours(t.failure_start, t.failure_end);
  const backHref = user.role === "technician" ? "/my-work" : "/service-requests";

  return (
    <div className="space-y-6">
      {param(sp.created) && (
        <Alert>
          {t.is_billable ? <Receipt className="size-4" /> : <CheckCircle2 className="size-4" />}
          <AlertTitle>{t.is_billable ? "Unit not under contract: this ticket is billable" : `Covered by ${t.covering_contract_number}`}</AlertTitle>
          <AlertDescription>
            {t.is_billable
              ? "The database found no contract covering this unit at the reported time. Offer the customer a maintenance contract."
              : `The contract's ${t.priority} response time applies: first response within ${t.sla_hours} h, by ${formatDateTime(t.sla_due_at)}.`}
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        <Link href={backHref} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden /> {user.role === "technician" ? "My work" : "Service requests"}
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{t.ticket_number}</h1>
              <PriorityBadge priority={t.priority} />
              <TicketStatusBadge status={t.status} />
              <SlaBadge status={t.sla_status} />
            </div>
            <p className="text-sm text-muted-foreground">Reported {formatDateTime(t.reported_at)}{t.reported_by_name && ` by ${t.reported_by_name}`}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canRecord && (
              <TicketProgressDialog
                action={recordTicketProgress.bind(null, id)}
                now={now}
                ticket={{
                  first_response_at: toBerlinInput(t.first_response_at), failure_start: toBerlinInput(t.failure_start),
                  failure_end: toBerlinInput(t.failure_end), resolved_at: toBerlinInput(t.resolved_at),
                  resolution_notes: t.resolution_notes,
                }}
                trigger={<Button size="sm"><Clock className="size-4" aria-hidden /> Record progress</Button>}
              />
            )}
            {isStaff && t.status === "OPEN" && (
              <>
                <TicketEditDialog
                  action={updateTicket.bind(null, id)}
                  technicians={technicians}
                  ticket={{
                    priority: t.priority!, description: t.description!, reported_by_name: t.reported_by_name,
                    assigned_technician_id: t.assigned_technician_id,
                  }}
                  trigger={<Button variant="outline" size="sm"><Pencil className="size-4" aria-hidden /> Edit</Button>}
                />
                <ConfirmButton action={cancelTicket.bind(null, id)} title="Cancel this ticket?"
                  description="Use this when no service is needed (e.g. the customer solved it). The ticket stays in the history."
                  confirmLabel="Cancel ticket" variant="ghost">
                  <Ban className="size-4" aria-hidden /> Cancel
                </ConfirmButton>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Problem</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="whitespace-pre-wrap">{t.description}</p>
            <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-[10rem_1fr]">
              <dt className="text-muted-foreground">Unit</dt>
              <dd>
                {t.manufacturer} {t.model} · {EQUIPMENT_TYPES[t.equipment_type as EquipmentType]}
                <span className="block text-xs text-muted-foreground">{t.serial_number}</span>
              </dd>
              <dt className="text-muted-foreground">Site</dt>
              <dd>{t.site_name}, {t.street}, {t.postal_code} {t.city}</dd>
              <dt className="text-muted-foreground">Customer</dt>
              <dd>
                {isStaff || user.role === "viewer"
                  ? <Link href={`/customers/${t.customer_id}`} className="hover:underline">{t.customer_name}</Link>
                  : t.customer_name}
              </dd>
              <dt className="text-muted-foreground">Technician</dt>
              <dd>{t.technician_name ?? "Not assigned"}</dd>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Coverage and SLA</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {t.is_billable ? (
              <p className="rounded-md bg-amber-50 p-2 text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                No contract covered this unit when it was reported. Billable work.
              </p>
            ) : (
              <dl className="grid grid-cols-2 gap-y-2">
                <dt className="text-muted-foreground">Contract</dt>
                <dd>
                  {user.role === "technician" ? t.covering_contract_number
                    : <Link href={`/contracts/${t.covering_contract_id}`} className="hover:underline">{t.covering_contract_number}</Link>}
                </dd>
                <dt className="text-muted-foreground">{t.priority} response</dt><dd>{t.sla_hours} h</dd>
                <dt className="text-muted-foreground">Due by</dt><dd>{formatDateTime(t.sla_due_at)}</dd>
              </dl>
            )}
            <dl className="grid grid-cols-2 gap-y-2">
              <dt className="text-muted-foreground">First response</dt><dd>{formatDateTime(t.first_response_at)}</dd>
              <dt className="text-muted-foreground">Response time</dt><dd>{formatHours(t.response_hours)}</dd>
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Failure and resolution</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-[10rem_1fr]">
            <dt className="text-muted-foreground">Failure</dt>
            <dd>
              {t.failure_start ? <>{formatDateTime(t.failure_start)} – {t.failure_end ? formatDateTime(t.failure_end) : "ongoing"}</> : "–"}
              {downtime != null && <span className="text-muted-foreground"> · {formatHours(downtime)} down (counts against availability)</span>}
            </dd>
            <dt className="text-muted-foreground">Resolved</dt><dd>{formatDateTime(t.resolved_at)}</dd>
            <dt className="text-muted-foreground">What was done</dt><dd className="whitespace-pre-wrap">{t.resolution_notes ?? "–"}</dd>
          </dl>
        </CardContent>
      </Card>

      {canSeeAudit && <AuditHistory entries={audit.data!} />}
    </div>
  );
}

// Hours the unit was down; an open failure counts until now.
function downtimeHours(start: string | null, end: string | null) {
  if (!start) return null;
  const until = end ? new Date(end).getTime() : Date.now();
  return (until - new Date(start).getTime()) / 3_600_000;
}
