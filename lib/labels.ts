// Display labels for database enums, and formatters used across the app.

export const SEGMENTS = {
  OFFICE: "Office",
  CLINIC: "Clinic",
  HOTEL: "Hotel",
  RETAIL: "Retail",
  SCHOOL: "School",
  SERVER_ROOM: "Server room",
  OTHER: "Other",
} as const;
export type Segment = keyof typeof SEGMENTS;

export const EQUIPMENT_TYPES = {
  SPLIT_AC: "Split AC",
  MULTI_SPLIT: "Multi-split",
  HEAT_PUMP: "Heat pump",
  VENTILATION: "Ventilation",
  CHILLER: "Chiller",
} as const;
export type EquipmentType = keyof typeof EQUIPMENT_TYPES;

export const options = (labels: Record<string, string>) =>
  Object.entries(labels).map(([value, label]) => ({ value, label }));

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Europe/Berlin" });
const eurFormat = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const numberFormat = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 });

// Dates from the database come as "YYYY-MM-DD" (date) or ISO strings (timestamptz).
export function formatDate(value: string | null | undefined) {
  if (!value) return "–";
  const d = value.length === 10 ? new Date(value + "T12:00:00Z") : new Date(value);
  return dateFormat.format(d);
}
export const formatEur = (value: number | null | undefined) => (value == null ? "–" : eurFormat.format(value));
export const formatNumber = (value: number | null | undefined) => (value == null ? "–" : numberFormat.format(value));

// "Today" in the company's time zone, as YYYY-MM-DD.
export const todayBerlin = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(new Date());

export const CONTRACT_TYPES = {
  FULL_SERVICE: "Full service",
  PREVENTIVE: "Preventive",
  ON_CALL: "On call",
} as const;
export type ContractType = keyof typeof CONTRACT_TYPES;

// Stored statuses plus EXPIRING_SOON, which the database calculates (v_contracts.display_status).
export const CONTRACT_STATUSES = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  EXPIRING_SOON: "Expiring soon",
  RENEWED: "Renewed",
  EXPIRED: "Expired",
  TERMINATED: "Terminated",
} as const;
export type ContractStatus = keyof typeof CONTRACT_STATUSES;

export const BILLING_FREQUENCIES = {
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  SEMI_ANNUAL: "Semi-annual",
  ANNUAL: "Annual",
} as const;
export type BillingFrequency = keyof typeof BILLING_FREQUENCIES;

export const RENEWAL_BUCKETS = {
  OVERDUE: "Decision overdue",
  DUE_30: "Within 30 days",
  DUE_60: "31–60 days",
  DUE_90: "61–90 days",
} as const;
export type RenewalBucket = keyof typeof RENEWAL_BUCKETS;

export const VISIT_RESULTS = {
  OK: "OK",
  ISSUES_FOUND: "Issues found",
  FOLLOW_UP_REQUIRED: "Follow-up required",
} as const;

// "in 12 days" / "3 days ago" / "today"
export function relativeDays(days: number | null | undefined) {
  if (days == null) return "–";
  if (days === 0) return "today";
  return days > 0 ? `in ${days} days` : `${-days} days ago`;
}

export const TICKET_PRIORITIES = {
  P1: "P1 · Urgent",
  P2: "P2 · High",
  P3: "P3 · Normal",
} as const;
export type TicketPriority = keyof typeof TICKET_PRIORITIES;

export const TICKET_STATUSES = {
  OPEN: "Open",
  RESOLVED: "Resolved",
  CANCELLED: "Cancelled",
} as const;
export type TicketStatus = keyof typeof TICKET_STATUSES;

// Calculated by the database (v_service_requests.sla_status).
export const SLA_STATUSES = {
  MET: "SLA met",
  BREACHED: "SLA breached",
  PENDING: "Within SLA",
  NO_SLA: "No contract",
} as const;
export type SlaStatus = keyof typeof SLA_STATUSES;

const dateTimeFormat = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin",
});
export const formatDateTime = (v: string | null | undefined) => (v ? dateTimeFormat.format(new Date(v)) : "–");

// timestamptz -> value for <input type="datetime-local"> in Berlin time ("2026-10-24T09:30").
const localParts = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});
export function toBerlinInput(v: string | null | undefined) {
  if (!v) return "";
  const p = Object.fromEntries(localParts.formatToParts(new Date(v)).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

// Hours as "25 min", "3.5 h" or "2 d 4 h".
export function formatHours(h: number | null | undefined) {
  if (h == null) return "–";
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 48) return `${Math.round(h * 10) / 10} h`;
  return `${Math.floor(h / 24)} d ${Math.round(h % 24)} h`;
}
