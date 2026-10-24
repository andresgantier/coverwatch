import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft, Mail, Pencil, Phone, Plus, User } from "lucide-react";
import { Page } from "@/components/page";
import { Stat } from "@/components/stat";
import { ContractStatusBadge } from "@/components/contracts/status-badge";
import { PriorityBadge, SlaBadge, TicketStatusBadge } from "@/components/service-requests/badges";
import { VisitStatus } from "@/components/visits/visit-status";
import { ConfirmButton } from "@/components/forms/confirm-button";
import { EquipmentTable } from "@/components/master-data/equipment-table";
import { CustomerDialog, EquipmentDialog, SiteDialog, SiteOptionsProvider } from "@/components/master-data/forms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  createEquipment, createSite, setCustomerActive, setSiteActive, updateCustomer, updateSite,
} from "@/app/actions/master-data";
import { getCurrentUser } from "@/lib/auth";
import { canEditMasterData, siteOptions } from "@/lib/data/master-data";
import {
  CONTRACT_TYPES, SEGMENTS, formatDate, formatDateTime, formatEur, type ContractType, type Segment,
} from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Customer" };

export default function CustomerPage({ params }: PageProps<"/customers/[id]">) {
  return (
    <Page href="/customers">
      <CustomerDetail params={params} />
    </Page>
  );
}

async function CustomerDetail({ params }: { params: PageProps<"/customers/[id]">["params"] }) {
  await connection();
  const [user, { id }] = await Promise.all([getCurrentUser(), params]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const [customerRes, summaryRes, sitesRes, equipmentRes, contractsRes, ticketsRes, visitsRes, availabilityRes] = await Promise.all([
    supabase.from("customers").select("*").eq("id", id).maybeSingle(),
    supabase.from("v_customer_summary").select("*").eq("id", id).maybeSingle(),
    supabase.from("sites").select("*").eq("customer_id", id).order("is_active", { ascending: false }).order("name"),
    supabase.from("v_equipment").select("*").eq("customer_id", id).order("site_name").order("serial_number"),
    supabase.from("v_contracts").select("*").eq("customer_id", id).order("start_date", { ascending: false }),
    supabase.from("v_service_requests").select("*").eq("customer_id", id).order("reported_at", { ascending: false }).limit(10),
    supabase.from("v_preventive_visits").select("*").eq("customer_id", id).neq("status", "CANCELLED")
      .order("planned_date", { ascending: false }).limit(8),
    supabase.from("v_equipment_availability").select("equipment_id, availability_90d").eq("customer_id", id),
  ]);
  for (const r of [customerRes, summaryRes, sitesRes, equipmentRes, contractsRes, ticketsRes, visitsRes, availabilityRes]) {
    if (r.error) throw new Error(r.error.message);
  }
  const customer = customerRes.data;
  if (!customer) notFound();
  const summary = summaryRes.data;
  const sites = sitesRes.data!;
  const equipment = equipmentRes.data!;
  const contracts = contractsRes.data!;
  const tickets = ticketsRes.data!;
  const visits = visitsRes.data!;
  const availability = new Map(availabilityRes.data!.map((a) => [a.equipment_id!, a.availability_90d ?? 1]));

  const canEdit = canEditMasterData(user.role);
  const siteOpts = canEdit ? await siteOptions(id) : [];
  const unitsPerSite = new Map<string, number>();
  for (const e of equipment) if (e.status === "ACTIVE") unitsPerSite.set(e.site_id!, (unitsPerSite.get(e.site_id!) ?? 0) + 1);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link href="/customers" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden /> Customers
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">{customer.name}</h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>{customer.customer_number}</span>
              <span>·</span>
              <span>{SEGMENTS[customer.segment as Segment]}</span>
              <Badge variant={customer.is_active ? "secondary" : "outline"}>{customer.is_active ? "Active" : "Inactive"}</Badge>
            </div>
          </div>
          {canEdit && (
            <div className="flex gap-2">
              <CustomerDialog
                title="Edit customer"
                action={updateCustomer.bind(null, customer.id)}
                customer={customer}
                trigger={<Button variant="outline" size="sm"><Pencil className="size-4" aria-hidden /> Edit</Button>}
              />
              {customer.is_active ? (
                <ConfirmButton
                  action={setCustomerActive.bind(null, customer.id, false)}
                  title="Deactivate this customer?"
                  description="The customer stays in the history but no longer appears in active lists. Customers with active contracts cannot be deactivated."
                  confirmLabel="Deactivate"
                  variant="destructive"
                >
                  Deactivate
                </ConfirmButton>
              ) : (
                <ConfirmButton
                  action={setCustomerActive.bind(null, customer.id, true)}
                  title="Reactivate this customer?"
                  description="The customer will appear in active lists again."
                  confirmLabel="Reactivate"
                >
                  Reactivate
                </ConfirmButton>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Sites" value={summary?.sites_count ?? 0} />
        <Stat label="Units in service" value={summary?.equipment_count ?? 0}
          hint={`${summary?.covered_equipment_count ?? 0} covered by a contract`} />
        <Stat label="Active contracts" value={summary?.active_contracts ?? 0} />
        <Stat label="Annual contract value" value={formatEur(summary?.annual_value_eur)} />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="SLA met (90 days)" value={summary?.sla_met_pct_90d == null ? "–" : `${summary.sla_met_pct_90d} %`} />
        <Stat label="Availability (90 days)"
          value={summary?.availability_90d == null ? "–" : `${(summary.availability_90d * 100).toFixed(1)} %`}
          hint="Average of the units in service" />
        <Stat label="Open tickets" value={summary?.open_tickets ?? 0}
          hint={`${summary?.billable_tickets_90d ?? 0} billable in the last 90 days`} />
        <Stat label="Overdue visits" value={summary?.overdue_visits ?? 0} />
      </div>

      {(customer.contact_name || customer.contact_email || customer.contact_phone || customer.notes) && (
        <Card>
          <CardHeader><CardTitle>Contact</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {customer.contact_name && <span className="flex items-center gap-2"><User className="size-4 text-muted-foreground" />{customer.contact_name}</span>}
            {customer.contact_phone && <span className="flex items-center gap-2"><Phone className="size-4 text-muted-foreground" />{customer.contact_phone}</span>}
            {customer.contact_email && <a href={`mailto:${customer.contact_email}`} className="flex items-center gap-2 hover:underline"><Mail className="size-4 text-muted-foreground" />{customer.contact_email}</a>}
            {customer.notes && <p className="w-full text-muted-foreground">{customer.notes}</p>}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Contracts</CardTitle>
          <CardDescription>Current and past versions</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y rounded-lg border text-sm">
            {contracts.map((c) => (
              <li key={c.id}>
                <Link href={`/contracts/${c.id}`} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 hover:bg-accent">
                  <div>
                    <span className="font-medium">{c.contract_number}</span>
                    <span className="text-muted-foreground"> · {CONTRACT_TYPES[c.contract_type as ContractType]} · {formatDate(c.start_date)} – {formatDate(c.end_date)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums text-muted-foreground">{formatEur(c.annual_value_eur)}</span>
                    <ContractStatusBadge status={c.display_status} />
                  </div>
                </Link>
              </li>
            ))}
            {contracts.length === 0 && <li className="p-6 text-center text-muted-foreground">No contracts: every ticket for this customer is billable.</li>}
          </ul>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent service requests</CardTitle>
            <CardAction>
              <Link href={`/service-requests?status=all&q=${encodeURIComponent(customer.name)}`} className="text-sm text-muted-foreground hover:underline">All</Link>
            </CardAction>
          </CardHeader>
          <CardContent>
            <ul className="divide-y text-sm">
              {tickets.map((t) => (
                <li key={t.id} className="py-2">
                  <Link href={`/service-requests/${t.id}`} className="block hover:underline">
                    <span className="font-medium">{t.ticket_number}</span> · {t.description}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                    {formatDateTime(t.reported_at)} <PriorityBadge priority={t.priority} /> <SlaBadge status={t.sla_status} />
                    <TicketStatusBadge status={t.status} />
                  </div>
                </li>
              ))}
              {tickets.length === 0 && <li className="py-6 text-center text-muted-foreground">No tickets.</li>}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Preventive visits</CardTitle>
            <CardDescription>Latest and upcoming</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y text-sm">
              {visits.map((v) => (
                <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    {formatDate(v.planned_date)} · {v.contract_number} #{v.visit_number}
                    <span className="text-muted-foreground"> · {v.technician_name ?? "no technician"}</span>
                  </span>
                  <VisitStatus visit={v} />
                </li>
              ))}
              {visits.length === 0 && <li className="py-6 text-center text-muted-foreground">No preventive visits.</li>}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sites</CardTitle>
          {canEdit && (
            <CardAction>
              <SiteDialog title="Add site" action={createSite.bind(null, customer.id)}
                trigger={<Button size="sm" variant="outline"><Plus className="size-4" aria-hidden /> Add site</Button>} />
            </CardAction>
          )}
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Site</TableHead>
                  <TableHead className="hidden md:table-cell">On-site contact</TableHead>
                  <TableHead className="text-right">Units</TableHead>
                  {canEdit && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sites.map((s) => (
                  <TableRow key={s.id} className={s.is_active ? undefined : "opacity-60"}>
                    <TableCell>
                      <div className="font-medium">{s.name} {!s.is_active && <Badge variant="outline" className="ml-1">Inactive</Badge>}</div>
                      <div className="text-xs text-muted-foreground">{s.street}, {s.postal_code} {s.city}</div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {s.contact_name ?? "–"}
                      {s.contact_phone && <div className="text-xs text-muted-foreground">{s.contact_phone}</div>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{unitsPerSite.get(s.id) ?? 0}</TableCell>
                    {canEdit && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <SiteDialog title={`Edit ${s.name}`} action={updateSite.bind(null, s.id, customer.id)} site={s}
                            trigger={<Button variant="ghost" size="icon" aria-label={`Edit ${s.name}`}><Pencil className="size-4" /></Button>} />
                          <ConfirmButton
                            action={setSiteActive.bind(null, s.id, customer.id, !s.is_active)}
                            title={s.is_active ? "Deactivate this site?" : "Reactivate this site?"}
                            description={s.is_active ? "The site stays in the history but can no longer be chosen for new equipment." : "The site can be used again."}
                            confirmLabel={s.is_active ? "Deactivate" : "Reactivate"}
                            variant="ghost"
                          >
                            {s.is_active ? "Deactivate" : "Reactivate"}
                          </ConfirmButton>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {sites.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">No sites yet.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Equipment</CardTitle>
          {canEdit && siteOpts.length > 0 && (
            <CardAction>
              <SiteOptionsProvider sites={siteOpts}>
                <EquipmentDialog title="Add equipment" action={createEquipment} defaultSiteId={siteOpts[0]?.value}
                  trigger={<Button size="sm" variant="outline"><Plus className="size-4" aria-hidden /> Add equipment</Button>} />
              </SiteOptionsProvider>
            </CardAction>
          )}
        </CardHeader>
        <CardContent>
          <SiteOptionsProvider sites={siteOpts}>
            <EquipmentTable rows={equipment} canEdit={canEdit} showCustomer={false} availability={availability} />
          </SiteOptionsProvider>
        </CardContent>
      </Card>
    </div>
  );
}
