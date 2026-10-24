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
