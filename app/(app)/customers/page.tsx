import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Plus } from "lucide-react";
import { Page } from "@/components/page";
import { FilterBar, FilterSelect, SearchInput } from "@/components/filters";
import { CustomerDialog } from "@/components/master-data/forms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createCustomer } from "@/app/actions/master-data";
import { getCurrentUser } from "@/lib/auth";
import { canEditMasterData } from "@/lib/data/master-data";
import { listCustomers } from "@/lib/data/lists";
import { ExportButton } from "@/components/export-button";
import { SEGMENTS, formatEur, options, type Segment } from "@/lib/labels";

export const metadata: Metadata = { title: "Customers" };

export default function CustomersPage({ searchParams }: PageProps<"/customers">) {
  return (
    <Page href="/customers" title="Customers" description="Customers, their sites and installed equipment.">
      <CustomerList searchParams={searchParams} />
    </Page>
  );
}

async function CustomerList({ searchParams }: { searchParams: PageProps<"/customers">["searchParams"] }) {
  await connection();
  const [user, sp] = await Promise.all([getCurrentUser(), searchParams]);
  const { filters, rows: customers } = await listCustomers(sp);
  const { q, segment, status } = filters;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterBar action="/customers" clearHref={q || segment || status !== "active" ? "/customers" : undefined}>
          <SearchInput defaultValue={q} placeholder="Search name or number" />
          <FilterSelect name="segment" label="Segment" value={segment}
            options={[{ value: "", label: "All segments" }, ...options(SEGMENTS)]} />
          <FilterSelect name="status" label="Status" value={status}
            options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }, { value: "all", label: "All" }]} />
        </FilterBar>
        <div className="flex gap-2">
        <ExportButton list="customers" filters={filters} />
        {canEditMasterData(user.role) && (
          <CustomerDialog title="New customer" action={createCustomer}
            trigger={<Button><Plus className="size-4" aria-hidden /> New customer</Button>} />
        )}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">{customers.length} customers</p>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead className="hidden sm:table-cell">Segment</TableHead>
              <TableHead className="text-right">Sites</TableHead>
              <TableHead className="text-right">Units</TableHead>
              <TableHead className="hidden text-right md:table-cell">Active contracts</TableHead>
              <TableHead className="hidden text-right md:table-cell">Annual value</TableHead>
              <TableHead className="hidden lg:table-cell">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <Link href={`/customers/${c.id}`} className="font-medium hover:underline">{c.name}</Link>
                  <div className="text-xs text-muted-foreground">{c.customer_number}</div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">{SEGMENTS[c.segment as Segment]}</TableCell>
                <TableCell className="text-right tabular-nums">{c.sites_count}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {c.equipment_count}
                  {(c.equipment_count ?? 0) > (c.covered_equipment_count ?? 0) && (
                    <span className="block text-xs text-amber-700 dark:text-amber-400">
                      {(c.equipment_count ?? 0) - (c.covered_equipment_count ?? 0)} not covered
                    </span>
                  )}
                </TableCell>
                <TableCell className="hidden text-right tabular-nums md:table-cell">{c.active_contracts}</TableCell>
                <TableCell className="hidden text-right tabular-nums md:table-cell">{formatEur(c.annual_value_eur)}</TableCell>
                <TableCell className="hidden lg:table-cell">
                  <Badge variant={c.is_active ? "secondary" : "outline"}>{c.is_active ? "Active" : "Inactive"}</Badge>
                </TableCell>
              </TableRow>
            ))}
            {customers.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">No customers match these filters.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
