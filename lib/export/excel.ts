import "server-only";
import ExcelJS from "exceljs";

// Builds real .xlsx files: typed cells (dates are dates, money is a number in EUR
// format), bold frozen header, autofilter and sensible column widths.

export type CellType = "text" | "number" | "eur" | "date" | "datetime" | "percent" | "bool";

export type Column<T> = {
  header: string;
  value: (row: T) => string | number | boolean | null | undefined;
  type?: CellType;
  width?: number;
};

const FORMATS: Partial<Record<CellType, string>> = {
  eur: '#,##0.00 "€"',
  date: "dd.mm.yyyy",
  datetime: "dd.mm.yyyy hh:mm",
  percent: "0.0%",
  number: "#,##0.##",
};

// Excel has no time zones: timestamps are written as Berlin wall-clock time.
const berlinParts = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
});

function toBerlinWallClock(iso: string) {
  const p = Object.fromEntries(berlinParts.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return new Date(Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second));
}

function cellValue(v: string | number | boolean | null | undefined, type: CellType) {
  if (v == null || v === "") return null;
  if (type === "date") return new Date(String(v).slice(0, 10) + "T00:00:00Z");
  if (type === "datetime") return toBerlinWallClock(String(v));
  if (type === "bool") return v ? "Yes" : "No";
  if (type === "eur" || type === "number" || type === "percent") return Number(v);
  return String(v);
}

export function addSheet<T>(workbook: ExcelJS.Workbook, name: string, columns: Column<T>[], rows: T[]) {
  const sheet = workbook.addWorksheet(name.slice(0, 31), { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = columns.map((c) => ({
    header: c.header,
    width: c.width ?? Math.min(48, Math.max(12, c.header.length + 4)),
    style: FORMATS[c.type ?? "text"] ? { numFmt: FORMATS[c.type ?? "text"] } : {},
  }));
  for (const row of rows) sheet.addRow(columns.map((c) => cellValue(c.value(row), c.type ?? "text")));

  const header = sheet.getRow(1);
  header.font = { bold: true };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEDEDEA" } };
  header.alignment = { vertical: "middle" };
  if (rows.length) sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
  return sheet;
}

// "Info" sheet: who exported what, when, with which filters.
export function addInfoSheet(
  workbook: ExcelJS.Workbook,
  info: { title: string; exportedBy: string; filters: Record<string, string>; rows: number; note?: string },
) {
  const sheet = workbook.addWorksheet("Info");
  sheet.columns = [{ width: 22 }, { width: 70 }];
  const exportedAt = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" }).format(new Date());
  const filters = Object.entries(info.filters).filter(([, v]) => v).map(([k, v]) => `${k} = ${v}`).join(", ") || "none";
  sheet.addRows([
    ["CoverWatch export", info.title],
    ["Exported at", `${exportedAt} (Europe/Berlin)`],
    ["Exported by", info.exportedBy],
    ["Filters", filters],
    ["Rows", info.rows],
    ...(info.note ? [["Note", info.note]] : []),
  ]);
  sheet.getColumn(1).font = { bold: true };
}

export async function workbookResponse(workbook: ExcelJS.Workbook, filename: string) {
  const buffer = await workbook.xlsx.writeBuffer();
  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

export function newWorkbook() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "CoverWatch";
  workbook.created = new Date();
  return workbook;
}

export const stamp = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(new Date());
