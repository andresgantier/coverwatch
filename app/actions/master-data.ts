"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { dbErrorToFormState } from "@/lib/db-errors";
import { parseForm, withValues, type FormState } from "@/lib/forms";
import { customerSchema, equipmentSchema, siteSchema } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

// Master data can be changed by managers and coordinators (RLS enforces the same rule).
const EDITORS = ["manager", "coordinator"] as const;
const NOT_SAVED: FormState = { ok: false, formError: "You don't have permission to change this record, or it no longer exists." };

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------
export async function createCustomer(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole(EDITORS);
  const parsed = parseForm(customerSchema, formData);
  if (parsed.error) return parsed.error;

  const supabase = await createClient();
  const { data, error } = await supabase.from("customers").insert(parsed.data).select("id").single();
  if (error) return withValues(dbErrorToFormState(error), formData);

  revalidatePath("/customers");
  redirect(`/customers/${data.id}`);
}

export async function updateCustomer(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole(EDITORS);
  const parsed = parseForm(customerSchema, formData);
  if (parsed.error) return parsed.error;

  const supabase = await createClient();
  const { data, error } = await supabase.from("customers").update(parsed.data).eq("id", id).select("id");
  if (error) return withValues(dbErrorToFormState(error), formData);
  if (!data.length) return NOT_SAVED;

  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);
  return { ok: true, message: "Customer saved." };
}

export async function setCustomerActive(id: string, active: boolean): Promise<FormState> {
  await requireRole(EDITORS);
  const supabase = await createClient();
  const { data, error } = await supabase.from("customers").update({ is_active: active }).eq("id", id).select("id");
  if (error) return dbErrorToFormState(error);
  if (!data.length) return NOT_SAVED;

  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);
  return { ok: true, message: active ? "Customer reactivated." : "Customer deactivated." };
}

// ---------------------------------------------------------------------------
// Sites
// ---------------------------------------------------------------------------
export async function createSite(customerId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole(EDITORS);
  const parsed = parseForm(siteSchema, formData);
  if (parsed.error) return parsed.error;

  const supabase = await createClient();
  const { error } = await supabase.from("sites").insert({ ...parsed.data, customer_id: customerId });
  if (error) return withValues(dbErrorToFormState(error), formData);

  revalidatePath(`/customers/${customerId}`);
  return { ok: true, message: "Site added." };
}

export async function updateSite(id: string, customerId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole(EDITORS);
  const parsed = parseForm(siteSchema, formData);
  if (parsed.error) return parsed.error;

  const supabase = await createClient();
  const { data, error } = await supabase.from("sites").update(parsed.data).eq("id", id).select("id");
  if (error) return withValues(dbErrorToFormState(error), formData);
  if (!data.length) return NOT_SAVED;

  revalidatePath(`/customers/${customerId}`);
  return { ok: true, message: "Site saved." };
}

export async function setSiteActive(id: string, customerId: string, active: boolean): Promise<FormState> {
  await requireRole(EDITORS);
  const supabase = await createClient();
  const { data, error } = await supabase.from("sites").update({ is_active: active }).eq("id", id).select("id");
  if (error) return dbErrorToFormState(error);
  if (!data.length) return NOT_SAVED;

  revalidatePath(`/customers/${customerId}`);
  return { ok: true, message: active ? "Site reactivated." : "Site deactivated." };
}

// ---------------------------------------------------------------------------
// Equipment
// ---------------------------------------------------------------------------
function revalidateEquipment() {
  revalidatePath("/equipment");
  revalidatePath("/customers/[id]", "page");
}

export async function createEquipment(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole(EDITORS);
  const parsed = parseForm(equipmentSchema, formData);
  if (parsed.error) return parsed.error;

  const supabase = await createClient();
  const { error } = await supabase.from("equipment").insert(parsed.data);
  if (error) return withValues(dbErrorToFormState(error), formData);

  revalidateEquipment();
  return { ok: true, message: "Equipment added." };
}

export async function updateEquipment(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole(EDITORS);
  const parsed = parseForm(equipmentSchema, formData);
  if (parsed.error) return parsed.error;

  const supabase = await createClient();
  const { data, error } = await supabase.from("equipment").update(parsed.data).eq("id", id).select("id");
  if (error) return withValues(dbErrorToFormState(error), formData);
  if (!data.length) return NOT_SAVED;

  revalidateEquipment();
  return { ok: true, message: "Equipment saved." };
}

export async function setEquipmentStatus(id: string, status: "ACTIVE" | "DECOMMISSIONED"): Promise<FormState> {
  await requireRole(EDITORS);
  const supabase = await createClient();
  const { data, error } = await supabase.from("equipment").update({ status }).eq("id", id).select("id");
  if (error) return dbErrorToFormState(error);
  if (!data.length) return NOT_SAVED;

  revalidateEquipment();
  return { ok: true, message: status === "ACTIVE" ? "Equipment back in service." : "Equipment decommissioned." };
}
