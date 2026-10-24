import "server-only";
import type { Option } from "@/components/forms/field";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/roles";

export const canEditMasterData = (role: Role) => role === "manager" || role === "coordinator";

// Text typed in a search box, made safe for a PostgREST "or" filter.
export const searchTerm = (q: string | undefined) => (q ?? "").replace(/[%,()*\\]/g, " ").trim();

// First value of a search param (?a=1&a=2 -> "1").
export const param = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

// Active sites as select options, grouped by customer.
export async function siteOptions(customerId?: string): Promise<Option[]> {
  const supabase = await createClient();
  let query = supabase
    .from("sites")
    .select("id, name, city, customer:customers!inner(name, is_active)")
    .eq("is_active", true)
    .eq("customer.is_active", true);
  if (customerId) query = query.eq("customer_id", customerId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return data
    .map((s) => ({ value: s.id, label: `${s.name} (${s.city})`, group: s.customer.name }))
    .sort((a, b) => a.group.localeCompare(b.group) || a.label.localeCompare(b.label));
}

// Active customers as select options.
export async function customerOptions(): Promise<Option[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("customers").select("id, name, customer_number").eq("is_active", true).order("name");
  if (error) throw new Error(error.message);
  return data.map((c) => ({ value: c.id, label: `${c.name} (${c.customer_number})` }));
}
