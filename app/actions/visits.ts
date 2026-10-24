"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { dbErrorToFormState } from "@/lib/db-errors";
import { parseForm, withValues, type FormState } from "@/lib/forms";
import { todayBerlin } from "@/lib/labels";
import { visitOutcomeSchema, visitPlanSchema } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

// Coordinators and managers plan visits (technician and date). Technicians record the
// outcome of their own visits only; the database enforces both (RLS + trigger).
const STAFF = ["manager", "coordinator"] as const;
const NOT_SAVED: FormState = { ok: false, formError: "You can't change this visit, or it no longer exists." };

function revalidateVisits() {
  revalidatePath("/visits");
  revalidatePath("/my-work");
  revalidatePath("/contracts/[id]", "page");
}

export async function planVisit(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole(STAFF);
  const parsed = parseForm(visitPlanSchema, formData);
  if (parsed.error) return parsed.error;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("preventive_visits")
    .update(parsed.data)
    .eq("id", id)
    .eq("status", "PLANNED")
    .select("id");
  if (error) return withValues(dbErrorToFormState(error), formData);
  if (!data.length) return NOT_SAVED;

  revalidateVisits();
  return { ok: true, message: "Visit planned." };
}

export async function recordVisitOutcome(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole([...STAFF, "technician"]);
  const parsed = parseForm(visitOutcomeSchema, formData);
  if (parsed.error) return parsed.error;
  if (parsed.data.actual_date > todayBerlin()) {
    return withValues({ ok: false, fieldErrors: { actual_date: "The visit date cannot be in the future." } }, formData);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("preventive_visits")
    .update({ ...parsed.data, status: "DONE" })
    .eq("id", id)
    .neq("status", "CANCELLED")
    .select("id");
  if (error) return withValues(dbErrorToFormState(error), formData);
  if (!data.length) return NOT_SAVED;

  revalidateVisits();
  return { ok: true, message: "Visit recorded." };
}

export async function cancelVisit(id: string): Promise<FormState> {
  await requireRole(STAFF);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("preventive_visits")
    .update({ status: "CANCELLED" })
    .eq("id", id)
    .eq("status", "PLANNED")
    .select("id");
  if (error) return dbErrorToFormState(error);
  if (!data.length) return { ok: false, formError: "Only planned visits can be cancelled." };

  revalidateVisits();
  return { ok: true, message: "Visit cancelled." };
}
