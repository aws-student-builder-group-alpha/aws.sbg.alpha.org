import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { isAvailability } from "@/lib/opportunity-availability";

export async function GET() {
  const config = getSupabaseConfig();
  const headers = { "Cache-Control": "no-store" };
  if (config) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      // Intentionally anonymous: this RPC exposes only catalog aggregates.
      const client = createClient(config.url, config.key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
      const { data, error } = await client.rpc("opportunity_availability").abortSignal(controller.signal);
      if (!error && isAvailability(data)) return Response.json({ updatedAt: data.updatedAt, items: data.items.map(({ id, capacity, remaining }) => ({ id, capacity, remaining })) }, { headers });
    } catch { /* Missing migration/configuration is an unavailable count, never zero. */ }
    finally { clearTimeout(timer); }
  }
  return Response.json({ message: "Vacancy counts are temporarily unavailable." }, { status: 503, headers });
}
