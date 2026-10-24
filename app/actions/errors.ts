"use server";

import { createClient } from "@/lib/supabase/server";

// Called by the error screen in the browser, so client-side errors also reach the log.
export async function logClientError(message: string, digest: string | undefined, path: string) {
  const supabase = await createClient();
  await supabase.rpc("log_app_error", { p_source: "client", p_path: path, p_message: message, p_digest: digest });
}
