import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { listContracts, listCustomers, listEquipment, listRenewals, listTickets, listVisits } from "@/lib/data/lists";
import {
  contractColumns, customerColumns, equipmentColumns, renewalColumns, ticketColumns, visitColumns,
} from "@/lib/export/columns";
import { addInfoSheet, addSheet, newWorkbook, stamp, workbookResponse } from "@/lib/export/excel";
import { rolesFor } from "@/lib/navigation";

// Supabase returns at most 1,000 rows per request; the Info sheet says so if a list hits it.
const MAX_ROWS = 1000;

// GET /export/<list>?<same filters as the page> -> .xlsx
export async function GET(request: NextRequest, { params }: RouteContext<"/export/[list]">) {
  const { list } = await params;
  const sp = Object.fromEntries(request.nextUrl.searchParams);
  const workbook = newWorkbook();
  let title: string;
  let rows: number;
  let filters: Record<string, string> = {};

  switch (list) {
    case "customers": {
      const user = await requireRole(rolesFor("/customers"));
      const r = await listCustomers(sp);
      addSheet(workbook, "Customers", customerColumns, r.rows);
      ({ filters } = r); title = "Customers"; rows = r.rows.length;
      addInfoSheet(workbook, { title, exportedBy: user.fullName, filters, rows });
      break;
    }
    case "equipment": {
      const user = await requireRole(rolesFor("/equipment"));
      const r = await listEquipment(sp);
      addSheet(workbook, "Equipment", equipmentColumns, r.rows);
      ({ filters } = r); title = "Equipment"; rows = r.rows.length;
      addInfoSheet(workbook, { title, exportedBy: user.fullName, filters, rows });
      break;
    }
    case "contracts": {
      const user = await requireRole(rolesFor("/contracts"));
      const r = await listContracts(sp);
      addSheet(workbook, "Contracts", contractColumns, r.rows);
      ({ filters } = r); title = "Contracts"; rows = r.rows.length;
      addInfoSheet(workbook, { title, exportedBy: user.fullName, filters, rows });
      break;
    }
    case "renewals": {
      const user = await requireRole(rolesFor("/renewals"));
      const r = await listRenewals();
      addSheet(workbook, "Renewals", renewalColumns, r.rows);
      title = "Renewal pipeline"; rows = r.rows.length;
      addInfoSheet(workbook, { title, exportedBy: user.fullName, filters, rows });
      break;
    }
    case "service-requests": {
      const user = await requireRole(rolesFor("/service-requests"));
      const r = await listTickets(sp, MAX_ROWS);
      addSheet(workbook, "Service requests", ticketColumns, r.rows);
      ({ filters } = r); title = "Service requests"; rows = r.rows.length;
      addInfoSheet(workbook, {
        title, exportedBy: user.fullName, filters, rows,
        note: rows === MAX_ROWS ? `Limited to the latest ${MAX_ROWS} tickets; narrow the filters or use the full export.` : undefined,
      });
      break;
    }
    case "visits": {
      const user = await requireRole(rolesFor("/visits"));
      const r = await listVisits(sp, MAX_ROWS);
      addSheet(workbook, "Preventive visits", visitColumns, r.rows);
      ({ filters } = r); title = "Preventive visits"; rows = r.rows.length;
      addInfoSheet(workbook, { title, exportedBy: user.fullName, filters, rows });
      break;
    }
    default:
      return new Response("Unknown list", { status: 404 });
  }

  return workbookResponse(workbook, `coverwatch-${list}-${stamp()}.xlsx`);
}
