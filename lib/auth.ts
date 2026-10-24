import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { homeFor, type Role } from "@/lib/roles";

export type CurrentUser = {
  id: string;
  fullName: string;
  email: string;
  role: Role;
};

// Signed-in user with their role. Cached per request, so the layout and the page
// share one lookup. Must be called inside a <Suspense> boundary (it reads cookies).
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, is_active")
    .eq("id", data.claims.sub)
    .maybeSingle();

  // Deactivated or missing profile: end the session.
  if (!profile || !profile.is_active) redirect("/auth/signout?reason=inactive");

  return { id: profile.id, fullName: profile.full_name, email: profile.email, role: profile.role as Role };
});

// Page guard: users whose role may not open the page are sent to their home page.
// The data itself is protected by RLS in the database; this only keeps the UI tidy.
export async function requireRole(allowed: readonly Role[]) {
  const user = await getCurrentUser();
  if (!allowed.includes(user.role)) redirect(homeFor(user.role));
  return user;
}
