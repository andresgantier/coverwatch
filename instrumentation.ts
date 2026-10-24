import type { Instrumentation } from "next";
import { createServerClient, parseCookieHeader } from "@supabase/ssr";

export function register() {}

// Every server error is written to app_error_log (as the signed-in user, so no
// service key is needed). Errors of anonymous visitors are only printed to the log.
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const message = err instanceof Error ? err.message : String(err);
  const digest = typeof err === "object" && err !== null && "digest" in err ? String(err.digest) : undefined;
  if (digest?.startsWith("NEXT_")) return; // redirects and "not found" are not errors

  console.error(`[server error] ${request.method} ${request.path}: ${message}`);
  try {
    const cookieHeader = request.headers.cookie;
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll: () => parseCookieHeader(Array.isArray(cookieHeader) ? cookieHeader.join("; ") : cookieHeader ?? "")
            .map((c) => ({ name: c.name, value: c.value ?? "" })),
        },
      },
    );
    await supabase.rpc("log_app_error", {
      p_source: "server",
      p_path: request.path,
      p_message: message,
      p_digest: digest,
      p_details: { method: request.method, route: context.routePath, type: context.routeType },
    });
  } catch {
    // Logging must never break the request.
  }
};
