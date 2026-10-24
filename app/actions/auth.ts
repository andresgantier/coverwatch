"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error: string | null };

// Demo accounts per role. The password stays on the server (DEMO_PASSWORD).
const DEMO_ACCOUNTS = {
  manager: "manager.demo@example.com",
  coordinator: "coordinator.demo@example.com",
  technician: "technician.demo@example.com",
} as const;

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Invalid email or password." };

  redirect("/");
}

export async function signInDemo(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const role = String(formData.get("role") ?? "");
  if (!(role in DEMO_ACCOUNTS)) return { error: "Choose a role for the demo." };

  const password = process.env.DEMO_PASSWORD;
  if (!password) return { error: "The demo is not configured on this server." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: DEMO_ACCOUNTS[role as keyof typeof DEMO_ACCOUNTS],
    password,
  });
  if (error) return { error: "The demo account is not available right now. Please try again later." };

  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
