"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { dbErrorToFormState } from "@/lib/db-errors";
import { parseForm, withValues, type FormState } from "@/lib/forms";
import { contractSchema, renewalSchema, terminationSchema } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

// Contracts are managed by the service manager only (RLS and the database functions
// enforce the same). Status changes always go through the database actions
// (activate_contract, renew_contract, terminate_contract), never a plain update.
const MANAGER = ["manager"] as const;
const PDF_BUCKET = "contract-pdfs";
const MAX_PDF_BYTES = 4 * 1024 * 1024;

function revalidateContracts(id?: string) {
  revalidatePath("/contracts");
  revalidatePath("/renewals");
  if (id) revalidatePath(`/contracts/${id}`);
}

export async function createContract(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole(MANAGER);
  const parsed = parseForm(contractSchema, formData);
  if (parsed.error) return parsed.error;

  const supabase = await createClient();
  const { data, error } = await supabase.from("contracts").insert(parsed.data).select("id").single();
  if (error) return withValues(dbErrorToFormState(error), formData);

  revalidateContracts();
  redirect(`/contracts/${data.id}`);
}

export async function updateDraftContract(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole(MANAGER);
  const parsed = parseForm(contractSchema, formData);
  if (parsed.error) return parsed.error;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contracts")
    .update(parsed.data)
    .eq("id", id)
    .eq("status", "DRAFT")
    .select("id");
  if (error) return withValues(dbErrorToFormState(error), formData);
  if (!data.length) return { ok: false, formError: "Only draft contracts can be edited. Active contracts change through a renewal." };

  revalidateContracts(id);
  return { ok: true, message: "Draft saved." };
}

// Replaces the list of covered units of a draft.
export async function setContractEquipment(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole(MANAGER);
  const wanted = new Set(formData.getAll("equipment_id").map(String));

  const supabase = await createClient();
  const { data: current, error: readError } = await supabase
    .from("contract_equipment")
    .select("equipment_id")
    .eq("contract_id", id);
  if (readError) return dbErrorToFormState(readError);

  const have = new Set(current.map((r) => r.equipment_id));
  const toRemove = [...have].filter((e) => !wanted.has(e));
  const toAdd = [...wanted].filter((e) => !have.has(e));

  if (toRemove.length) {
    const { error } = await supabase.from("contract_equipment").delete().eq("contract_id", id).in("equipment_id", toRemove);
    if (error) return dbErrorToFormState(error);
  }
  if (toAdd.length) {
    const { error } = await supabase
      .from("contract_equipment")
      .insert(toAdd.map((equipment_id) => ({ contract_id: id, equipment_id })));
    if (error) return dbErrorToFormState(error);
  }

  revalidateContracts(id);
  return { ok: true, message: `${wanted.size} units covered.` };
}

export async function activateContract(id: string): Promise<FormState> {
  await requireRole(MANAGER);
  const supabase = await createClient();
  const { error } = await supabase.rpc("activate_contract", { p_contract_id: id });
  if (error) return dbErrorToFormState(error);

  revalidateContracts(id);
  return { ok: true, message: "Contract activated. The preventive plan was generated." };
}

export async function renewContract(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole(MANAGER);
  const parsed = parseForm(renewalSchema, formData);
  if (parsed.error) return parsed.error;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("renew_contract", {
    p_contract_id: id,
    p_new_contract_number: parsed.data.contract_number ?? undefined,
    p_annual_value_eur: parsed.data.annual_value_eur,
    p_duration_months: parsed.data.duration_months,
  });
  if (error) return withValues(dbErrorToFormState(error), formData);

  revalidateContracts(id);
  redirect(`/contracts/${data.id}?renewed=1`);
}

export async function terminateContract(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole(MANAGER);
  const parsed = parseForm(terminationSchema, formData);
  if (parsed.error) return parsed.error;

  const supabase = await createClient();
  const { error } = await supabase.rpc("terminate_contract", {
    p_contract_id: id,
    p_terminated_on: parsed.data.terminated_on,
    p_reason: parsed.data.reason,
  });
  if (error) return withValues(dbErrorToFormState(error), formData);

  revalidateContracts(id);
  return { ok: true, message: "Contract terminated. Later planned visits were cancelled." };
}

export async function uploadContractPdf(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole(MANAGER);
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, fieldErrors: { file: "Choose a PDF file." } };
  if (file.type !== "application/pdf") return { ok: false, fieldErrors: { file: "Only PDF files can be uploaded." } };
  if (file.size > MAX_PDF_BYTES) return { ok: false, fieldErrors: { file: "The file is larger than 4 MB." } };

  const supabase = await createClient();
  const path = `${id}/contract.pdf`;
  const { error: uploadError } = await supabase.storage
    .from(PDF_BUCKET)
    .upload(path, file, { contentType: "application/pdf", upsert: true });
  if (uploadError) return { ok: false, formError: `Upload failed: ${uploadError.message}` };

  const { error } = await supabase.from("contracts").update({ pdf_path: path }).eq("id", id);
  if (error) return dbErrorToFormState(error);

  revalidateContracts(id);
  return { ok: true, message: "PDF uploaded." };
}
