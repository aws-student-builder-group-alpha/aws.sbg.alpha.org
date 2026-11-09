import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseConfig } from "./config";
import type { Database } from "./schema";

export async function createSupabaseClient() {
  // Read the auth setup at request time so a preview built before it was
  // connected can render signed-in routes once the server is configured.
  await connection();
  const config = getSupabaseConfig();
  if (!config) return null;
  const cookieStore = await cookies();
  return createServerClient<Database>(config.url, config.key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(values) {
        try { for (const { name, value, options } of values) cookieStore.set(name, value, options); }
        catch { /* Server Components cannot write cookies; Proxy handles refresh. */ }
      },
    },
  });
}
