import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft, CheckCircle2, FileText, ListChecks, Pencil, RefreshCw, Upload, XCircle } from "lucide-react";
import { Page } from "@/components/page";
import { Stat } from "@/components/stat";
import { ConfirmButton } from "@/components/forms/confirm-button";
import {
  ContractDialog, EquipmentPickerDialog, PdfUploadDialog, RenewDialog, TerminateDialog, type PickableUnit,
} from "@/components/contracts/forms";
import { ContractStatusBadge } from "@/components/contracts/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  activateContract, renewContract, setContractEquipment, terminateContract, updateDraftContract, uploadContractPdf,
} from "@/app/actions/contracts";
import { getCurrentUser } from "@/lib/auth";
import { customerOptions, param } from "@/lib/data/master-data";
import {
  BILLING_FREQUENCIES, CONTRACT_TYPES, EQUIPMENT_TYPES, VISIT_RESULTS, formatDate, formatEur, relativeDays, todayBerlin,
  type BillingFrequency, type ContractType, type EquipmentType,
} from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Contract" };

export default function ContractPage({ params, searchParams }: PageProps<"/contracts/[id]">) {
  return (
    <Page href="/contracts">
      <ContractDetail params={params} searchParams={searchParams} />
    </Page>
  );
}

async function ContractDetail({
  params, searchParams,
}: { params: PageProps<"/contracts/[id]">["params"]; searchParams: PageProps<"/contracts/[id]">["searchParams"] }) {
  await connection();
  const [user, { id }, sp] = await Promise.all([getCurrentUser(), params, searchParams]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const { data: c, error } = await supabase.from("v_contracts").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!c) notFound();

  const isManager = user.role === "manager";
  const canSeeAudit = user.role === "manager" || user.role === "viewer";

  const [links, visits, chain, audit, customerUnits, customers] = await Promise.all([
    supabase.from("contract_equipment").select("equipment_id").eq("contract_id", id),
    supabase.from("v_preventive_visits").select("*").eq("contract_id", id).order("visit_number"),
    supabase.from("contracts").select("id, contract_number, previous_contract_id, status, start_date, end_date")
      .eq("customer_id", c.customer_id!),
    canSeeAudit
      ? supabase.from("v_audit_log").select("*").eq("record_id", id).order("changed_at", { ascending: false }).limit(20)
      : Promise.resolve({ data: [], error: null }),
    supabase.from("v_equipment").select("*").eq("customer_id", c.customer_id!).order("site_name").order("serial_number"),
    isManager && c.status === "DRAFT" ? customerOptions() : Promise.resolve([]),
  ]);
  for (const r of [links, visits, chain, audit, customerUnits]) if (r.error) throw new Error(r.error.message);

  const coveredIds = new Set(links.data!.map((l) => l.equipment_id));
  const covered = customerUnits.data!.filter((u) => coveredIds.has(u.id!));
  const versions = buildChain(chain.data!, id);

  // For the draft picker: units already covered by another binding contract in this period.
  let pickable: PickableUnit[] = [];
  if (isManager && c.status === "DRAFT") {
    const candidates = customerUnits.data!.filter((u) => u.status === "ACTIVE" || coveredIds.has(u.id!));
    const { data: others, error: othersError } = await supabase
      .from("contract_equipment")
      .select("equipment_id, contract:contracts!inner(contract_number, start_date, end_date, terminated_on)")
      .in("equipment_id", candidates.map((u) => u.id!))
      .eq("is_binding", true)
      .neq("contract_id", id);
    if (othersError) throw new Error(othersError.message);
    pickable = candidates.map((u) => {
      const clash = others.find((o) =>
        o.equipment_id === u.id &&
        o.contract.start_date <= c.end_date! && (o.contract.terminated_on ?? o.contract.end_date) >= c.start_date!);
      return {
        id: u.id!, label: `${u.manufacturer} ${u.model}`, detail: `${u.serial_number} · ${u.site_name}`,
        type: u.equipment_type!, selected: coveredIds.has(u.id!), blockedBy: clash?.contract.contract_number ?? null,
      };
    });
  }

  const today = todayBerlin();
  const days = c.days_to_decision ?? 0;
  const draftValues = {
    customer_id: c.customer_id!, contract_number: c.contract_number!, contract_type: c.contract_type!,
    start_date: c.start_date!, end_date: c.end_date!, notice_period_days: c.notice_period_days!, auto_renew: c.auto_renew!,
    annual_value_eur: c.annual_value_eur!, billing_frequency: c.billing_frequency!, sla_p1_hours: c.sla_p1_hours!,
    sla_p2_hours: c.sla_p2_hours!, sla_p3_hours: c.sla_p3_hours!,
    preventive_visits_per_year: c.preventive_visits_per_year!, notes: c.notes,
  };
  const nextNumber = `${c.contract_number!.replace(/-R\d+$/, "")}-R${versions.length}`;
  const renewalStart = formatDate(addDays(c.end_date!, 1));

  return (
    <div className="space-y-6">
      {param(sp.renewed) && c.previous_contract_number && (
        <Alert>
          <CheckCircle2 className="size-4" />
          <AlertTitle>Renewal created</AlertTitle>
          <AlertDescription>
            This is the new version. {c.previous_contract_number} is now marked as renewed and stays in the history.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        <Link href="/contracts" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden /> Contracts
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{c.contract_number}</h1>
              <ContractStatusBadge status={c.display_status} />
            </div>
            <p className="text-sm text-muted-foreground">
              <Link href={`/customers/${c.customer_id}`} className="hover:underline">{c.customer_name}</Link>
              {" · "}{CONTRACT_TYPES[c.contract_type as ContractType]}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {c.pdf_path && (
              <Button asChild variant="outline" size="sm">
                <a href={`/contracts/${id}/pdf`} target="_blank" rel="noopener"><FileText className="size-4" aria-hidden /> Open PDF</a>
              </Button>
            )}
            {isManager && (
              <PdfUploadDialog action={uploadContractPdf.bind(null, id)}
                trigger={<Button variant="outline" size="sm"><Upload className="size-4" aria-hidden /> {c.pdf_path ? "Replace PDF" : "Upload PDF"}</Button>} />
            )}
            {isManager && c.status === "DRAFT" && (
              <>
                <ContractDialog title="Edit draft" action={updateDraftContract.bind(null, id)} customers={customers}
                  contract={draftValues} submitLabel="Save draft"
                  trigger={<Button variant="outline" size="sm"><Pencil className="size-4" aria-hidden /> Edit terms</Button>} />
                <ConfirmButton
                  action={activateContract.bind(null, id)}
                  title="Activate this contract?"
                  description={`The terms are frozen from now on, the units become covered and ${c.preventive_visits_per_year} preventive visit(s) per year are planned. The database refuses if a unit is already covered by another contract in this period.`}
                  confirmLabel="Activate"
                  variant="default"
                >
                  <CheckCircle2 className="size-4" aria-hidden /> Activate
                </ConfirmButton>
              </>
            )}
            {isManager && c.status === "ACTIVE" && (
              <>
                <RenewDialog action={renewContract.bind(null, id)} suggestedNumber={nextNumber}
                  suggestedValue={Math.round((c.annual_value_eur ?? 0) * 1.03 / 10) * 10} startsOn={renewalStart}
                  trigger={<Button size="sm"><RefreshCw className="size-4" aria-hidden /> Renew</Button>} />
                <TerminateDialog action={terminateContract.bind(null, id)} today={today}
                  trigger={<Button variant="outline" size="sm"><XCircle className="size-4" aria-hidden /> Terminate</Button>} />
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Period" value={<span className="text-lg">{formatDate(c.start_date)} – {formatDate(c.end_date)}</span>}
          hint={c.terminated_on ? `Terminated on ${formatDate(c.terminated_on)}` : undefined} />
        <Stat
          label="Decision deadline"
          value={<span className="text-lg">{formatDate(c.decision_deadline)}</span>}
          hint={c.status === "ACTIVE" ? (
            <span className={cn(days < 0 && "font-medium text-red-700 dark:text-red-400", days >= 0 && days <= 90 && "text-amber-700 dark:text-amber-400")}>
              {relativeDays(days)} · end − {c.notice_period_days} days notice
            </span>
          ) : `end − ${c.notice_period_days} days notice`}
        />
        <Stat label="Annual value" value={formatEur(c.annual_value_eur)}
          hint={BILLING_FREQUENCIES[c.billing_frequency as BillingFrequency] + " billing"} />
        <Stat label="Response time (SLA)" value={<span className="text-lg">{c.sla_p1_hours} / {c.sla_p2_hours} / {c.sla_p3_hours} h</span>}
          hint="P1 / P2 / P3, first response" />
      </div>

      {c.status === "DRAFT" && (
        <Alert>
          <ListChecks className="size-4" />
          <AlertTitle>Draft</AlertTitle>
          <AlertDescription>
            Choose the covered units, check the terms, then activate. Activation freezes the terms and generates the preventive plan.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Covered equipment</CardTitle>
            <CardDescription>{covered.length} units</CardDescription>
            {isManager && c.status === "DRAFT" && (
              <CardAction>
                <EquipmentPickerDialog action={setContractEquipment.bind(null, id)} units={pickable}
                  trigger={<Button size="sm" variant="outline">Choose units</Button>} />
              </CardAction>
            )}
          </CardHeader>
          <CardContent>
            <ul className="divide-y rounded-lg border">
              {covered.map((u) => (
                <li key={u.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium">{u.manufacturer} {u.model}</div>
                    <div className="text-xs text-muted-foreground">
                      {u.serial_number} · {EQUIPMENT_TYPES[u.equipment_type as EquipmentType]} · {u.site_name}, {u.city}
                    </div>
                  </div>
                  {u.status === "DECOMMISSIONED" && <Badge variant="outline">Decommissioned</Badge>}
                </li>
              ))}
              {covered.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">No units yet.</li>}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Terms and history</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
              <dt className="text-muted-foreground">Notice period</dt><dd>{c.notice_period_days} days</dd>
              <dt className="text-muted-foreground">Auto-renewal</dt><dd>{c.auto_renew ? "Yes" : "No"}</dd>
              <dt className="text-muted-foreground">Visits per year</dt><dd>{c.preventive_visits_per_year}</dd>
              <dt className="text-muted-foreground">Activated</dt><dd>{c.activated_at ? formatDate(c.activated_at) : "–"}</dd>
            </dl>
            {c.termination_reason && <p className="rounded-md bg-muted p-2"><span className="font-medium">Termination: </span>{c.termination_reason}</p>}
            {c.notes && <p className="text-muted-foreground">{c.notes}</p>}
            <div className="space-y-2">
              <p className="font-medium">Versions</p>
              <ol className="space-y-1">
                {versions.map((v) => (
                  <li key={v.id} className="flex items-center justify-between gap-2">
                    {v.id === id ? (
                      <span className="font-medium">{v.contract_number} (this)</span>
                    ) : (
                      <Link href={`/contracts/${v.id}`} className="hover:underline">{v.contract_number}</Link>
                    )}
                    <ContractStatusBadge status={v.status} />
                  </li>
                ))}
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Preventive plan</CardTitle>
          <CardDescription>Generated by the database when the contract was activated.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="hidden sm:table-cell">Scheduled</TableHead>
                  <TableHead className="hidden md:table-cell">Technician</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visits.data!.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>{v.visit_number}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(v.due_date)}</TableCell>
                    <TableCell className="hidden whitespace-nowrap sm:table-cell">{formatDate(v.scheduled_date)}</TableCell>
                    <TableCell className="hidden md:table-cell">{v.technician_name ?? "–"}</TableCell>
                    <TableCell>
                      {v.status === "DONE" ? (
                        <span>Done {formatDate(v.actual_date)} · {VISIT_RESULTS[v.result as keyof typeof VISIT_RESULTS]}
                          {!v.done_on_time && <Badge variant="outline" className="ml-1">late</Badge>}</span>
                      ) : v.status === "CANCELLED" ? (
                        <span className="text-muted-foreground">Cancelled</span>
                      ) : v.is_overdue ? (
                        <Badge variant="outline" className="border-red-600/40 text-red-700 dark:text-red-400">Overdue</Badge>
                      ) : (
                        <span className="text-muted-foreground">Planned</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {visits.data!.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                      {c.status === "DRAFT" ? "Visits are planned when the contract is activated." : "No preventive visits in this contract."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {canSeeAudit && (
        <Card>
          <CardHeader>
            <CardTitle>Change history</CardTitle>
            <CardDescription>Written by a database trigger on every change. Nobody can edit it.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-sm">
              {audit.data!.map((a) => (
                <li key={a.id} className="border-l-2 pl-3">
                  <div className="text-muted-foreground">
                    {formatDateTime(a.changed_at)} · {a.changed_by_name ?? "System"} · {a.action === "INSERT" ? "created" : a.action === "UPDATE" ? "changed" : "deleted"}
                  </div>
                  {a.action === "UPDATE" && <div>{describeChanges(a.old_data, a.new_data)}</div>}
                </li>
              ))}
              {audit.data!.length === 0 && <li className="text-muted-foreground">No changes recorded.</li>}
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

type ChainRow = { id: string; contract_number: string; previous_contract_id: string | null; status: string };

// All versions of this contract, oldest first, following previous_contract_id both ways.
function buildChain(rows: ChainRow[], id: string): ChainRow[] {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const byPrevious = new Map(rows.filter((r) => r.previous_contract_id).map((r) => [r.previous_contract_id!, r]));
  let first = byId.get(id)!;
  while (first.previous_contract_id && byId.has(first.previous_contract_id)) first = byId.get(first.previous_contract_id)!;
  const chain = [first];
  while (byPrevious.has(chain.at(-1)!.id)) chain.push(byPrevious.get(chain.at(-1)!.id)!);
  return chain;
}

const HIDDEN_FIELDS = new Set(["activated_at", "updated_at"]);

function describeChanges(oldData: unknown, newData: unknown) {
  const before = (oldData ?? {}) as Record<string, unknown>;
  const after = (newData ?? {}) as Record<string, unknown>;
  const parts = Object.keys(after)
    .filter((k) => !HIDDEN_FIELDS.has(k))
    .map((k) => `${k.replace(/_/g, " ")}: ${show(before[k])} → ${show(after[k])}`);
  return parts.length ? parts.join(" · ") : "activation timestamp updated";
}

const show = (v: unknown) => (v == null || v === "" ? "–" : String(v));

const dateTimeFormat = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin",
});
const formatDateTime = (v: string | null) => (v ? dateTimeFormat.format(new Date(v)) : "–");

function addDays(isoDate: string, n: number) {
  const d = new Date(isoDate + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
