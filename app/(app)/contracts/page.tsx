import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Plus, RefreshCw } from "lucide-react";
import { Page } from "@/components/page";
import { FilterBar, FilterSelect, SearchInput } from "@/components/filters";
import { ContractDialog } from "@/components/contracts/forms";
import { ContractStatusBadge } from "@/components/contracts/status-badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createContract } from "@/app/actions/contracts";
import { getCurrentUser } from "@/lib/auth";
import { customerOptions, param, searchTerm } from "@/lib/data/master-data";
import {
  CONTRACT_STATUSES, CONTRACT_TYPES, formatDate, formatEur, options, relativeDays, todayBerlin, type ContractType,
} from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Contracts" };

const STATUS_FILTERS = [
  { value: "current", label: "Draft and active" },
  ...options(CONTRACT_STATUSES),
  { value: "all", label: "All statuses" },
];

export default function ContractsPage({ searchParams }: PageProps<"/contracts">) {
  return (
    <Page href="/contracts" title="Contracts" description="Maintenance contracts. Expiring soon = decision deadline (end − notice) within 90 days.">
      <ContractList searchParams={searchParams} />
    </Page>
  );
}

async function ContractList({ searchParams }: { searchParams: PageProps<"/contracts">["searchParams"] }) {
  await connection();
  const [user, sp] = await Promise.all([getCurrentUser(), searchParams]);
  const q = searchTerm(param(sp.q));
  const status = param(sp.status) || "current";
  const type = param(sp.type);
  const customer = param(sp.customer);

  const supabase = await createClient();
  let query = supabase.from("v_contracts").select("*");
  if (q) query = query.or(`contract_number.ilike.%${q}%,customer_name.ilike.%${q}%`);
  if (status === "current") query = query.in("status", ["DRAFT", "ACTIVE"]);
  else if (status !== "all") query = query.eq("display_status", status);
  if (type in CONTRACT_TYPES) query = query.eq("contract_type", type as ContractType);
  if (/^[0-9a-f-]{36}$/i.test(customer)) query = query.eq("customer_id", customer);
  query = status === "current" || status === "ACTIVE" || status === "EXPIRING_SOON"
    ? query.order("decision_deadline")
    : query.order("end_date", { ascending: false });

  const isManager = user.role === "manager";
  const [{ data: contracts, error }, customers, suggestedNumber] = await Promise.all([
    query,
    isManager ? customerOptions() : Promise.resolve([]),
    isManager ? nextContractNumber() : Promise.resolve(""),
  ]);
  if (error) throw new Error(error.message);

  const today = todayBerlin();
  const total = contracts.filter((c) => c.status === "ACTIVE").reduce((sum, c) => sum + (c.annual_value_eur ?? 0), 0);
  const filtered = Boolean(q || status !== "current" || type || customer);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterBar action="/contracts" clearHref={filtered ? "/contracts" : undefined}>
          <SearchInput defaultValue={q} placeholder="Contract number or customer" />
          <FilterSelect name="status" label="Status" value={status} options={STATUS_FILTERS} />
          <FilterSelect name="type" label="Type" value={type}
            options={[{ value: "", label: "All types" }, ...options(CONTRACT_TYPES)]} />
          {customer && <input type="hidden" name="customer" value={customer} />}
        </FilterBar>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/renewals"><RefreshCw className="size-4" aria-hidden /> Renewal pipeline</Link>
          </Button>
          {isManager && (
            <ContractDialog
              title="New contract (draft)"
              action={createContract}
              customers={customers}
              submitLabel="Create draft"
              contract={{
                customer_id: customer, contract_number: suggestedNumber, contract_type: "FULL_SERVICE",
                start_date: today, end_date: oneYearFrom(today), notice_period_days: 90, auto_renew: false,
                annual_value_eur: 0, billing_frequency: "ANNUAL", sla_p1_hours: 8, sla_p2_hours: 24, sla_p3_hours: 48,
                preventive_visits_per_year: 2, notes: null,
              }}
              trigger={<Button><Plus className="size-4" aria-hidden /> New contract</Button>}
            />
          )}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {contracts.length} contracts{total > 0 && <> · {formatEur(total)} annual value of the active ones</>}
      </p>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contract</TableHead>
              <TableHead className="hidden md:table-cell">Type</TableHead>
              <TableHead className="hidden sm:table-cell">Period</TableHead>
              <TableHead>Decision deadline</TableHead>
              <TableHead className="hidden text-right md:table-cell">Annual value</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contracts.map((c) => {
              const open = c.status === "ACTIVE";
              const days = c.days_to_decision ?? 0;
              return (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link href={`/contracts/${c.id}`} className="font-medium hover:underline">{c.contract_number}</Link>
                    <div className="text-xs text-muted-foreground">{c.customer_name}</div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{CONTRACT_TYPES[c.contract_type as ContractType]}</TableCell>
                  <TableCell className="hidden whitespace-nowrap sm:table-cell">
                    {formatDate(c.start_date)} – {formatDate(c.end_date)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {open ? (
                      <>
                        <div>{formatDate(c.decision_deadline)}</div>
                        <div className={cn("text-xs", days < 0 ? "font-medium text-red-700 dark:text-red-400" : days <= 90 ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground")}>
                          {relativeDays(days)}{c.auto_renew && " · auto-renews"}
                        </div>
                      </>
                    ) : <span className="text-muted-foreground">–</span>}
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums md:table-cell">{formatEur(c.annual_value_eur)}</TableCell>
                  <TableCell><ContractStatusBadge status={c.display_status} /></TableCell>
                </TableRow>
              );
            })}
            {contracts.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">No contracts match these filters.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function oneYearFrom(isoDate: string) {
  const d = new Date(isoDate + "T12:00:00Z");
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

// Next number in the VK-<year>-<nnn> series.
async function nextContractNumber() {
  const supabase = await createClient();
  const { data } = await supabase.from("contracts").select("contract_number").like("contract_number", "VK-%");
  const max = Math.max(0, ...(data ?? []).map((c) => Number(/^VK-\d{4}-(\d+)/.exec(c.contract_number)?.[1] ?? 0)));
  return `VK-${todayBerlin().slice(0, 4)}-${String(max + 1).padStart(3, "0")}`;
}
