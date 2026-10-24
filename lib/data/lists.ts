import "server-only";
import { param, searchTerm } from "@/lib/data/master-data";
import {
  CONTRACT_TYPES, EQUIPMENT_TYPES, SEGMENTS, SLA_STATUSES, TICKET_PRIORITIES, TICKET_STATUSES, todayBerlin,
  type ContractType, type EquipmentType, type Segment, type SlaStatus, type TicketPriority, type TicketStatus,
} from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";

// List queries shared by the pages and the Excel export, so an export always
// contains exactly what the screen shows with the same filters (RLS applies to both).

export type SearchParams = Record<string, string | string[] | undefined>;
const isUuid = (v: string) => /^[0-9a-f-]{36}$/i.test(v);

function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export async function listCustomers(sp: SearchParams) {
  const filters = { q: searchTerm(param(sp.q)), segment: param(sp.segment), status: param(sp.status) || "active" };
  const supabase = await createClient();
  let query = supabase.from("v_customer_summary").select("*").order("name");
  if (filters.q) query = query.or(`name.ilike.%${filters.q}%,customer_number.ilike.%${filters.q}%`);
  if (filters.segment in SEGMENTS) query = query.eq("segment", filters.segment as Segment);
  if (filters.status !== "all") query = query.eq("is_active", filters.status === "active");
  const { data, error } = await query;
  fail(error);
  return { filters, rows: data! };
}

export async function listEquipment(sp: SearchParams) {
  const filters = {
    q: searchTerm(param(sp.q)), type: param(sp.type), coverage: param(sp.coverage),
    status: param(sp.status) || "ACTIVE", customer: param(sp.customer),
  };
  const supabase = await createClient();
  let query = supabase.from("v_equipment").select("*").order("customer_name").order("site_name").order("serial_number");
  const q = filters.q;
  if (q) query = query.or(`serial_number.ilike.%${q}%,manufacturer.ilike.%${q}%,model.ilike.%${q}%,customer_name.ilike.%${q}%`);
  if (filters.type in EQUIPMENT_TYPES) query = query.eq("equipment_type", filters.type as EquipmentType);
  if (filters.coverage === "covered") query = query.eq("is_covered", true);
  if (filters.coverage === "uncovered") query = query.eq("is_covered", false);
  if (filters.status === "ACTIVE" || filters.status === "DECOMMISSIONED") query = query.eq("status", filters.status);
  if (isUuid(filters.customer)) query = query.eq("customer_id", filters.customer);
  const { data, error } = await query;
  fail(error);
  return { filters, rows: data! };
}

export async function listContracts(sp: SearchParams) {
  const filters = {
    q: searchTerm(param(sp.q)), status: param(sp.status) || "current", type: param(sp.type), customer: param(sp.customer),
  };
  const supabase = await createClient();
  let query = supabase.from("v_contracts").select("*");
  if (filters.q) query = query.or(`contract_number.ilike.%${filters.q}%,customer_name.ilike.%${filters.q}%`);
  if (filters.status === "current") query = query.in("status", ["DRAFT", "ACTIVE"]);
  else if (filters.status !== "all") query = query.eq("display_status", filters.status);
  if (filters.type in CONTRACT_TYPES) query = query.eq("contract_type", filters.type as ContractType);
  if (isUuid(filters.customer)) query = query.eq("customer_id", filters.customer);
  query = ["current", "ACTIVE", "EXPIRING_SOON"].includes(filters.status)
    ? query.order("decision_deadline")
    : query.order("end_date", { ascending: false });
  const { data, error } = await query;
  fail(error);
  return { filters, rows: data! };
}

export async function listRenewals() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("v_renewal_pipeline").select("*").order("decision_deadline");
  fail(error);
  return { rows: data! };
}

export const TICKET_LIMIT = 500;

export async function listTickets(sp: SearchParams, limit = TICKET_LIMIT) {
  const filters = {
    q: searchTerm(param(sp.q)), status: param(sp.status) || "OPEN", priority: param(sp.priority), sla: param(sp.sla),
    billable: param(sp.billable), technician: param(sp.technician), period: param(sp.period),
  };
  const supabase = await createClient();
  let query = supabase.from("v_service_requests").select("*").order("reported_at", { ascending: false }).limit(limit);
  const q = filters.q;
  if (q) query = query.or(`ticket_number.ilike.%${q}%,customer_name.ilike.%${q}%,serial_number.ilike.%${q}%`);
  if (filters.status in TICKET_STATUSES) query = query.eq("status", filters.status as TicketStatus);
  if (filters.priority in TICKET_PRIORITIES) query = query.eq("priority", filters.priority as TicketPriority);
  if (filters.sla in SLA_STATUSES) query = query.eq("sla_status", filters.sla as SlaStatus);
  if (filters.billable === "yes") query = query.eq("is_billable", true);
  if (filters.period === "90d" || filters.period === "12m") {
    query = query.gte("reported_at", daysAgoIso(filters.period === "90d" ? 90 : 365));
  }
  if (filters.technician === "none") query = query.is("assigned_technician_id", null);
  else if (isUuid(filters.technician)) query = query.eq("assigned_technician_id", filters.technician);
  const { data, error } = await query;
  fail(error);
  return { filters, rows: data! };
}

export async function listVisits(sp: SearchParams, limit = 500) {
  const filters = { view: param(sp.view) || "open", technician: param(sp.technician), q: searchTerm(param(sp.q)) };
  const today = todayBerlin();
  const in30 = addDays(today, 30);
  const supabase = await createClient();
  let query = supabase.from("v_preventive_visits").select("*").limit(limit);
  const view = filters.view;
  if (view === "open" || view === "unassigned" || view === "next30") query = query.eq("status", "PLANNED");
  if (view === "overdue") query = query.eq("is_overdue", true);
  if (view === "next30") query = query.gte("planned_date", today).lte("planned_date", in30);
  if (view === "unassigned") query = query.is("assigned_technician_id", null);
  if (view === "done") query = query.eq("status", "DONE");
  if (filters.technician === "none") query = query.is("assigned_technician_id", null);
  else if (isUuid(filters.technician)) query = query.eq("assigned_technician_id", filters.technician);
  if (filters.q) query = query.or(`customer_name.ilike.%${filters.q}%,contract_number.ilike.%${filters.q}%`);
  query = view === "done" || view === "all" ? query.order("planned_date", { ascending: false }) : query.order("planned_date");
  const { data, error } = await query;
  fail(error);
  return { filters, rows: data!, today, in30 };
}

// Same window as the dashboard KPIs (now − n days).
function daysAgoIso(days: number) {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

export function addDays(isoDate: string, n: number) {
  const d = new Date(isoDate + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Current filters as a query string, for the export link.
export function toQueryString(filters: Record<string, string>) {
  const params = new URLSearchParams(Object.entries(filters).filter(([, v]) => v !== ""));
  return params.toString();
}
