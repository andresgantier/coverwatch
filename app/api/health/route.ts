import { createClient } from "@supabase/supabase-js";
import { connection } from "next/server";

// GET /api/health – checks that the app can reach the Supabase database.
export async function GET() {
  await connection(); // always run at request time, never prerendered

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const checkedAt = new Date().toISOString();

  if (!url || !key) {
    return Response.json(
      { ok: false, error: "Supabase environment variables are missing", checked_at: checkedAt },
      { status: 503 },
    );
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const started = performance.now();
  const { data, error } = await supabase.rpc("health_check");
  const latencyMs = Math.round(performance.now() - started);

  if (error) {
    console.error("[health] database check failed:", error.message);
    return Response.json(
      { ok: false, error: error.message, latency_ms: latencyMs, checked_at: checkedAt },
      { status: 503 },
    );
  }

  return Response.json(
    { ok: true, database: data, latency_ms: latencyMs, checked_at: checkedAt },
    { headers: { "Cache-Control": "no-store" } },
  );
}
