"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { dbErrorToFormState } from "@/lib/db-errors";
import type { FormState } from "@/lib/forms";
import { ROLES, type Role } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

// Managers change a person's role or deactivate them. The database blocks changes
// to your own account and to the shared demo logins.
export async function updateUserAccess(id: string, role: Role, isActive: boolean): Promise<FormState> {
  await requireRole(["manager"]);
  if (!ROLES.includes(role)) return { ok: false, formError: "Unknown role." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ role, is_active: isActive })
    .eq("id", id)
    .select("id");
  if (error) return dbErrorToFormState(error);
  if (!data.length) return { ok: false, formError: "You don't have permission to change this user." };

  revalidatePath("/users");
  return { ok: true, message: "Access updated." };
}
