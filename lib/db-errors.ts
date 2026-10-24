import "server-only";
import type { PostgrestError } from "@supabase/supabase-js";
import type { FormState } from "@/lib/forms";

// The database is the final judge. When it rejects a change, its constraint
// name tells us which field to blame; this table turns it into a clear message.
const CONSTRAINT_MESSAGES: Record<string, { field?: string; message: string }> = {
  customers_name_key: { field: "name", message: "A customer with this name already exists." },
  customers_name_check: { field: "name", message: "Name is required." },
  customers_contact_email_check: { field: "contact_email", message: "Enter a valid email address." },
  sites_customer_id_name_key: { field: "name", message: "This customer already has a site with this name." },
  sites_postal_code_check: { field: "postal_code", message: "German postal codes have exactly 5 digits." },
  sites_contact_email_check: { field: "contact_email", message: "Enter a valid email address." },
  sites_street_check: { field: "street", message: "Street is required." },
  sites_city_check: { field: "city", message: "City is required." },
  equipment_serial_number_key: { field: "serial_number", message: "This serial number is already registered." },
  equipment_check: { field: "warranty_end_date", message: "The warranty cannot end before the installation date." },
  equipment_cooling_capacity_kw_check: {
    field: "cooling_capacity_kw",
    message: "Capacity must be greater than 0 and at most 2,000 kW.",
  },
  contracts_contract_number_key: { field: "contract_number", message: "This contract number is already used." },
  contracts_dates_chk: { field: "end_date", message: "The contract must end after it starts." },
  contracts_notice_chk: { field: "notice_period_days", message: "The notice period must be between 0 and 365 days and shorter than the contract." },
  contracts_sla_chk: { field: "sla_p2_hours", message: "Response times must be P1 ≤ P2 ≤ P3." },
  contracts_terminated_on_chk: { field: "terminated_on", message: "The termination date must be within the contract period." },
  contract_equipment_no_overlap: {
    message: "At least one unit is already covered by another contract in this period. Remove it or change the dates.",
  },
  service_requests_response_chk: { field: "first_response_at", message: "The first response cannot be before the report." },
  service_requests_resolved_chk: { field: "resolved_at", message: "The resolution cannot be before the report." },
  service_requests_failure_chk: { field: "failure_end", message: "The failure cannot end before it started." },
  service_requests_status_chk: { field: "resolved_at", message: "A resolved ticket needs a resolution time (and only then)." },
  service_requests_description_check: { field: "description", message: "Description is required." },
};

export function dbErrorToFormState(error: PostgrestError): FormState {
  const constraint = /constraint "([^"]+)"/.exec(error.message)?.[1];
  const known = constraint ? CONSTRAINT_MESSAGES[constraint] : undefined;
  if (known?.field) return { ok: false, fieldErrors: { [known.field]: known.message } };
  if (known) return { ok: false, formError: known.message };

  // Row Level Security or missing privilege.
  if (error.code === "42501") return { ok: false, formError: "You don't have permission to make this change." };
  // Business rules raised by triggers already carry a readable message.
  if (error.code === "P0001") return { ok: false, formError: error.message };

  console.error("[db]", error.code, error.message);
  return { ok: false, formError: "The change could not be saved. Please try again." };
}
