"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { dbErrorToFormState } from "@/lib/db-errors";
import { parseForm, withValues, type FormState } from "@/lib/forms";
import { ticketCreateSchema, ticketEditSchema, ticketProgressSchema } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

// Coordinators and managers create and edit tickets. Technicians only record progress
// on their own tickets (RLS + a database trigger enforce which fields they may change).
const STAFF = ["manager", "coordinator"] as const;
const NOT_SAVED: FormState = { ok: false, formError: "You can't change this ticket, or it no longer exists." };

function revalidateTickets(id?: string) {
  revalidatePath("/service-requests");
  revalidatePath("/my-work");
  if (id) revalidatePath(`/service-requests/${id}`);
}

export async function createTicket(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole(STAFF);
  const parsed = parseForm(ticketCreateSchema, formData);
  if (parsed.error) return parsed.error;

  const supabase = await createClient();
  // Coverage and SLA are not sent: the database decides them from the unit and the report time.
  const { data, error } = await supabase.from("service_requests").insert(parsed.data).select("id").single();
  if (error) return withValues(dbErrorToFormState(error), formData);

  revalidateTickets();
  redirect(`/service-requests/${data.id}?created=1`);
}

export async function updateTicket(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole(STAFF);
  const parsed = parseForm(ticketEditSchema, formData);
  if (parsed.error) return parsed.error;

  const supabase = await createClient();
  const { data, error } = await supabase.from("service_requests").update(parsed.data).eq("id", id).select("id");
  if (error) return withValues(dbErrorToFormState(error), formData);
  if (!data.length) return NOT_SAVED;

  revalidateTickets(id);
  return { ok: true, message: "Ticket saved." };
}

export async function recordTicketProgress(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole([...STAFF, "technician"]);
  const parsed = parseForm(ticketProgressSchema, formData);
  if (parsed.error) return parsed.error;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("service_requests")
    .update(parsed.data)
    .eq("id", id)
    .neq("status", "CANCELLED")
    .select("id");
  if (error) return withValues(dbErrorToFormState(error), formData);
  if (!data.length) return NOT_SAVED;

  revalidateTickets(id);
  return { ok: true, message: parsed.data.status === "RESOLVED" ? "Ticket resolved." : "Progress saved." };
}

export async function cancelTicket(id: string): Promise<FormState> {
  await requireRole(STAFF);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("service_requests")
    .update({ status: "CANCELLED", resolved_at: null })
    .eq("id", id)
    .eq("status", "OPEN")
    .select("id");
  if (error) return dbErrorToFormState(error);
  if (!data.length) return { ok: false, formError: "Only open tickets can be cancelled." };

  revalidateTickets(id);
  return { ok: true, message: "Ticket cancelled." };
}
