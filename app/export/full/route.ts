import { requireRole } from "@/lib/auth";
import {
  contractColumns, customerColumns, equipmentColumns, ticketColumns, visitColumns,
} from "@/lib/export/columns";
import { addSheet, newWorkbook, stamp, workbookResponse, type Column } from "@/lib/export/excel";
import { createClient } from "@/lib/supabase/server";

// GET /export/full -> one .xlsx with every table, readable without technical knowledge.
// For managers and viewers (read access to everything). Reads page by page, so it is complete.

type Row = Record<string, unknown>;

const SHEETS: [string, string][] = [
  ["Customers", "One row per customer, with counts and KPIs (contracts, units, SLA, availability)."],
  ["Sites", "Buildings of each customer, with address and on-site contact."],
  ["Equipment", "Installed units: serial number, type, capacity, warranty and the contract covering them today."],
  ["Contracts", "All contracts and their versions. Decision deadline = end date − notice period."],
  ["Covered equipment", "Which units each contract covers (one row per contract and unit)."],
  ["Service requests", "Breakdown tickets with response time, SLA result, failure times and resolution."],
  ["Preventive visits", "The maintenance plan: due date, technician, result and whether it was on time."],
  ["Users", "Team members and their role."],
  ["Change history", "Audit log of contracts and tickets: who changed what and when."],
];

export async function GET() {
  const user = await requireRole(["manager", "viewer"]);
  const supabase = await createClient();

  // PostgREST returns at most 1,000 rows per request: read in pages until done.
  async function all(table: string, select = "*", order = "id"): Promise<Row[]> {
    const out: Row[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.from(table as "customers").select(select).order(order).range(from, from + 999);
      if (error) throw new Error(`${table}: ${error.message}`);
      out.push(...(data as unknown as Row[]));
      if (data.length < 1000) return out;
    }
  }

  const [customers, sites, equipment, contracts, links, tickets, visits, users, audit] = await Promise.all([
    all("v_customer_summary", "*", "name"),
    all("sites", "*, customer:customers(name)", "name"),
    all("v_equipment", "*", "serial_number"),
    all("v_contracts", "*", "contract_number"),
    all("contract_equipment", "contract:contracts(contract_number), equipment:equipment(serial_number)", "contract_id"),
    all("v_service_requests", "*", "reported_at"),
    all("v_preventive_visits", "*", "due_date"),
    all("profiles", "full_name, email, role, is_active", "full_name"),
    all("v_audit_log", "*", "changed_at"),
  ]);

  const workbook = newWorkbook();
  const readme = workbook.addWorksheet("README");
  readme.columns = [{ width: 22 }, { width: 100 }];
  readme.addRows([
    ["CoverWatch full export", `Velden Klimatechnik GmbH · ${stamp()} · exported by ${user.fullName}`],
    ["", "Each sheet below is one part of the data. Filter or sort with the arrows in the first row."],
    ["", "Dates are in German time (Europe/Berlin). Amounts are in EUR."],
    [],
    ["Sheet", "What it contains"],
    ...SHEETS.map(([name, text]) => [name, text]),
  ]);
  readme.getRow(1).font = { bold: true, size: 14 };
  readme.getRow(5).font = { bold: true };

  addSheet(workbook, "Customers", customerColumns, customers as never[]);
  addSheet<Row>(workbook, "Sites", [
    { header: "Customer", value: (r) => (r.customer as { name: string } | null)?.name, width: 32 },
    { header: "Site", value: (r) => r.name as string },
    { header: "Street", value: (r) => r.street as string, width: 28 },
    { header: "Postal code", value: (r) => r.postal_code as string },
    { header: "City", value: (r) => r.city as string },
    { header: "Contact", value: (r) => r.contact_name as string },
    { header: "Phone", value: (r) => r.contact_phone as string },
    { header: "Email", value: (r) => r.contact_email as string, width: 28 },
    { header: "Active", value: (r) => r.is_active as boolean, type: "bool" },
  ] satisfies Column<Row>[], sites);
  addSheet(workbook, "Equipment", equipmentColumns, equipment as never[]);
  addSheet(workbook, "Contracts", contractColumns, contracts as never[]);
  addSheet<Row>(workbook, "Covered equipment", [
    { header: "Contract no.", value: (r) => (r.contract as { contract_number: string }).contract_number, width: 20 },
    { header: "Serial number", value: (r) => (r.equipment as { serial_number: string }).serial_number, width: 22 },
  ], links);
  addSheet(workbook, "Service requests", ticketColumns, tickets as never[]);
  addSheet(workbook, "Preventive visits", visitColumns, visits as never[]);
  addSheet<Row>(workbook, "Users", [
    { header: "Name", value: (r) => r.full_name as string, width: 24 },
    { header: "Email", value: (r) => r.email as string, width: 30 },
    { header: "Role", value: (r) => r.role as string },
    { header: "Active", value: (r) => r.is_active as boolean, type: "bool" },
  ], users);
  addSheet<Row>(workbook, "Change history", [
    { header: "When", value: (r) => r.changed_at as string, type: "datetime", width: 18 },
    { header: "Who", value: (r) => (r.changed_by_name as string) ?? "System" },
    { header: "Table", value: (r) => r.table_name as string },
    { header: "Action", value: (r) => r.action as string },
    { header: "Record id", value: (r) => r.record_id as string, width: 38 },
    { header: "Before", value: (r) => (r.old_data ? JSON.stringify(r.old_data) : null), width: 60 },
    { header: "After", value: (r) => (r.new_data ? JSON.stringify(r.new_data) : null), width: 60 },
  ], audit);

  return workbookResponse(workbook, `coverwatch-full-export-${stamp()}.xlsx`);
}
