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
