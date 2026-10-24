import "server-only";
import type { Database } from "@/lib/database.types";
import type { Column } from "@/lib/export/excel";
import {
  CONTRACT_STATUSES, CONTRACT_TYPES, EQUIPMENT_TYPES, RENEWAL_BUCKETS, SEGMENTS, SLA_STATUSES, TICKET_STATUSES,
  VISIT_RESULTS,
} from "@/lib/labels";

type Views = Database["public"]["Views"];
const label = (map: Record<string, string>) => (v: string | null) => (v ? map[v] ?? v : null);
const seg = label(SEGMENTS);
const eqType = label(EQUIPMENT_TYPES);
const cType = label(CONTRACT_TYPES);
const cStatus = label(CONTRACT_STATUSES);

export const customerColumns: Column<Views["v_customer_summary"]["Row"]>[] = [
  { header: "Customer no.", value: (r) => r.customer_number },
  { header: "Name", value: (r) => r.name, width: 36 },
  { header: "Segment", value: (r) => seg(r.segment) },
  { header: "Active", value: (r) => r.is_active, type: "bool" },
  { header: "Sites", value: (r) => r.sites_count, type: "number" },
  { header: "Units in service", value: (r) => r.equipment_count, type: "number" },
  { header: "Units covered", value: (r) => r.covered_equipment_count, type: "number" },
  { header: "Active contracts", value: (r) => r.active_contracts, type: "number" },
  { header: "Annual value", value: (r) => r.annual_value_eur, type: "eur" },
  { header: "Open tickets", value: (r) => r.open_tickets, type: "number" },
  { header: "SLA met % (90 d)", value: (r) => (r.sla_met_pct_90d == null ? null : r.sla_met_pct_90d / 100), type: "percent" },
  { header: "Overdue visits", value: (r) => r.overdue_visits, type: "number" },
  { header: "Availability (90 d)", value: (r) => r.availability_90d, type: "percent" },
];

export const equipmentColumns: Column<Views["v_equipment"]["Row"]>[] = [
  { header: "Serial number", value: (r) => r.serial_number, width: 22 },
  { header: "Manufacturer", value: (r) => r.manufacturer },
  { header: "Model", value: (r) => r.model, width: 24 },
  { header: "Type", value: (r) => eqType(r.equipment_type) },
  { header: "Capacity (kW)", value: (r) => r.cooling_capacity_kw, type: "number" },
  { header: "Customer", value: (r) => r.customer_name, width: 32 },
  { header: "Site", value: (r) => r.site_name },
  { header: "City", value: (r) => r.city },
  { header: "Installed", value: (r) => r.install_date, type: "date" },
  { header: "Warranty until", value: (r) => r.warranty_end_date, type: "date" },
  { header: "Status", value: (r) => r.status },
  { header: "Covered today", value: (r) => r.is_covered, type: "bool" },
  { header: "Contract", value: (r) => r.current_contract_number },
];

export const contractColumns: Column<Views["v_contracts"]["Row"]>[] = [
  { header: "Contract no.", value: (r) => r.contract_number, width: 20 },
  { header: "Customer", value: (r) => r.customer_name, width: 32 },
  { header: "Type", value: (r) => cType(r.contract_type) },
  { header: "Status", value: (r) => cStatus(r.display_status) },
  { header: "Start", value: (r) => r.start_date, type: "date" },
  { header: "End", value: (r) => r.end_date, type: "date" },
  { header: "Notice (days)", value: (r) => r.notice_period_days, type: "number" },
  { header: "Decision deadline", value: (r) => r.decision_deadline, type: "date" },
  { header: "Days to decision", value: (r) => r.days_to_decision, type: "number" },
  { header: "Auto-renew", value: (r) => r.auto_renew, type: "bool" },
  { header: "Annual value", value: (r) => r.annual_value_eur, type: "eur" },
  { header: "Billing", value: (r) => r.billing_frequency },
  { header: "SLA P1 (h)", value: (r) => r.sla_p1_hours, type: "number" },
  { header: "SLA P2 (h)", value: (r) => r.sla_p2_hours, type: "number" },
  { header: "SLA P3 (h)", value: (r) => r.sla_p3_hours, type: "number" },
  { header: "Visits / year", value: (r) => r.preventive_visits_per_year, type: "number" },
  { header: "Units", value: (r) => r.equipment_count, type: "number" },
  { header: "Previous version", value: (r) => r.previous_contract_number },
  { header: "Next version", value: (r) => r.next_contract_number },
  { header: "Terminated on", value: (r) => r.terminated_on, type: "date" },
  { header: "Termination reason", value: (r) => r.termination_reason, width: 40 },
];

export const renewalColumns: Column<Views["v_renewal_pipeline"]["Row"]>[] = [
  { header: "Window", value: (r) => (r.bucket ? RENEWAL_BUCKETS[r.bucket as keyof typeof RENEWAL_BUCKETS] : null) },
  { header: "Contract no.", value: (r) => r.contract_number, width: 20 },
  { header: "Customer", value: (r) => r.customer_name, width: 32 },
  { header: "Type", value: (r) => cType(r.contract_type) },
  { header: "Decision deadline", value: (r) => r.decision_deadline, type: "date" },
  { header: "Days to decision", value: (r) => r.days_to_decision, type: "number" },
  { header: "End", value: (r) => r.end_date, type: "date" },
  { header: "Auto-renew", value: (r) => r.auto_renew, type: "bool" },
  { header: "Annual value", value: (r) => r.annual_value_eur, type: "eur" },
];

export const ticketColumns: Column<Views["v_service_requests"]["Row"]>[] = [
  { header: "Ticket", value: (r) => r.ticket_number },
  { header: "Reported", value: (r) => r.reported_at, type: "datetime", width: 18 },
  { header: "Priority", value: (r) => r.priority },
  { header: "Status", value: (r) => (r.status ? TICKET_STATUSES[r.status as keyof typeof TICKET_STATUSES] : null) },
  { header: "Customer", value: (r) => r.customer_name, width: 32 },
  { header: "Site", value: (r) => r.site_name },
  { header: "Unit", value: (r) => `${r.manufacturer} ${r.model}`, width: 28 },
  { header: "Serial number", value: (r) => r.serial_number, width: 22 },
  { header: "Description", value: (r) => r.description, width: 48 },
  { header: "Technician", value: (r) => r.technician_name },
  { header: "Contract", value: (r) => r.covering_contract_number },
  { header: "Billable", value: (r) => r.is_billable, type: "bool" },
  { header: "SLA (h)", value: (r) => r.sla_hours, type: "number" },
  { header: "SLA due", value: (r) => r.sla_due_at, type: "datetime", width: 18 },
  { header: "First response", value: (r) => r.first_response_at, type: "datetime", width: 18 },
  { header: "Response (h)", value: (r) => r.response_hours, type: "number" },
  { header: "SLA status", value: (r) => (r.sla_status ? SLA_STATUSES[r.sla_status as keyof typeof SLA_STATUSES] : null) },
  { header: "Failure start", value: (r) => r.failure_start, type: "datetime", width: 18 },
  { header: "Failure end", value: (r) => r.failure_end, type: "datetime", width: 18 },
  { header: "Resolved", value: (r) => r.resolved_at, type: "datetime", width: 18 },
  { header: "Resolution", value: (r) => r.resolution_notes, width: 48 },
];

export const visitColumns: Column<Views["v_preventive_visits"]["Row"]>[] = [
  { header: "Contract no.", value: (r) => r.contract_number, width: 20 },
  { header: "Visit #", value: (r) => r.visit_number, type: "number" },
  { header: "Customer", value: (r) => r.customer_name, width: 32 },
  { header: "Due", value: (r) => r.due_date, type: "date" },
  { header: "Scheduled", value: (r) => r.scheduled_date, type: "date" },
  { header: "Technician", value: (r) => r.technician_name },
  { header: "Status", value: (r) => (r.is_overdue ? "Overdue" : r.status) },
  { header: "Done on", value: (r) => r.actual_date, type: "date" },
  { header: "Result", value: (r) => (r.result ? VISIT_RESULTS[r.result as keyof typeof VISIT_RESULTS] : null) },
  { header: "On time", value: (r) => (r.status === "DONE" ? r.done_on_time : null), type: "bool" },
  { header: "Observations", value: (r) => r.observations, width: 48 },
  { header: "Sites", value: (r) => r.sites, width: 48 },
];
