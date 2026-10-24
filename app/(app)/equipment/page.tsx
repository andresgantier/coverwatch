import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Plus } from "lucide-react";
import { Page } from "@/components/page";
import { FilterBar, FilterSelect, SearchInput } from "@/components/filters";
import { EquipmentTable } from "@/components/master-data/equipment-table";
import { EquipmentDialog, SiteOptionsProvider } from "@/components/master-data/forms";
import { Button } from "@/components/ui/button";
import { createEquipment } from "@/app/actions/master-data";
import { getCurrentUser } from "@/lib/auth";
import { canEditMasterData, param, searchTerm, siteOptions } from "@/lib/data/master-data";
import { EQUIPMENT_TYPES, options, type EquipmentType } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Equipment" };

export default function EquipmentPage({ searchParams }: PageProps<"/equipment">) {
  return (
    <Page href="/equipment" title="Equipment" description="Installed units, where they are and which contract covers them today.">
      <EquipmentList searchParams={searchParams} />
    </Page>
  );
}

async function EquipmentList({ searchParams }: { searchParams: PageProps<"/equipment">["searchParams"] }) {
  await connection();
  const [user, sp] = await Promise.all([getCurrentUser(), searchParams]);
  const q = searchTerm(param(sp.q));
  const type = param(sp.type);
  const coverage = param(sp.coverage);
  const status = param(sp.status) || "ACTIVE";
  const customer = param(sp.customer);

  const supabase = await createClient();
  let query = supabase.from("v_equipment").select("*").order("customer_name").order("site_name").order("serial_number");
  if (q) query = query.or(`serial_number.ilike.%${q}%,manufacturer.ilike.%${q}%,model.ilike.%${q}%,customer_name.ilike.%${q}%`);
  if (type in EQUIPMENT_TYPES) query = query.eq("equipment_type", type as EquipmentType);
  if (coverage === "covered") query = query.eq("is_covered", true);
  if (coverage === "uncovered") query = query.eq("is_covered", false);
  if (status === "ACTIVE" || status === "DECOMMISSIONED") query = query.eq("status", status);
  if (/^[0-9a-f-]{36}$/i.test(customer)) query = query.eq("customer_id", customer);

  const canEdit = canEditMasterData(user.role);
  const [{ data: rows, error }, sites] = await Promise.all([query, canEdit ? siteOptions() : Promise.resolve([])]);
  if (error) throw new Error(error.message);

  const filtered = Boolean(q || type || coverage || status !== "ACTIVE" || customer);

  return (
    <SiteOptionsProvider sites={sites}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <FilterBar action="/equipment" clearHref={filtered ? "/equipment" : undefined}>
            <SearchInput defaultValue={q} placeholder="Serial, model or customer" />
            <FilterSelect name="type" label="Type" value={type}
              options={[{ value: "", label: "All types" }, ...options(EQUIPMENT_TYPES)]} />
            <FilterSelect name="coverage" label="Coverage" value={coverage}
              options={[{ value: "", label: "Any coverage" }, { value: "covered", label: "Under contract" }, { value: "uncovered", label: "No contract" }]} />
            <FilterSelect name="status" label="Status" value={status}
              options={[{ value: "ACTIVE", label: "In service" }, { value: "DECOMMISSIONED", label: "Decommissioned" }, { value: "all", label: "All" }]} />
            {customer && <input type="hidden" name="customer" value={customer} />}
          </FilterBar>
          {canEdit && (
            <EquipmentDialog title="Add equipment" action={createEquipment}
              trigger={<Button><Plus className="size-4" aria-hidden /> Add equipment</Button>} />
          )}
        </div>

        <p className="text-sm text-muted-foreground">
          {rows.length} units
          {customer && rows[0] && (
            <> of <Link href={`/customers/${customer}`} className="underline">{rows[0].customer_name}</Link></>
          )}
          {" · "}{rows.filter((r) => r.status === "ACTIVE" && !r.is_covered).length} in service without a contract
        </p>

        <EquipmentTable rows={rows} canEdit={canEdit} />
      </div>
    </SiteOptionsProvider>
  );
}
