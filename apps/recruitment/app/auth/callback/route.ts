import { NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase/server";
import { getAppOrigin } from "@/lib/supabase/config";
import { cookies } from "next/headers";
import { authReturnPath } from "@/lib/auth-return";
import { recruitmentPath } from "@/lib/site-paths";

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code");
  const client = await createSupabaseClient();
  const cookieStore = await cookies();
  const selected = cookieStore.get("alpha-opportunity")?.value;
  const choice = cookieStore.get("alpha-auth-destination")?.value;
  const destination = choice === "staff" ? "staff" : choice === "membership" ? "membership" : "apply";
  cookieStore.delete("alpha-opportunity");
  cookieStore.delete("alpha-auth-destination");
  if (code && client) {
    try {
      const { error } = await client.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(new URL(recruitmentPath(authReturnPath(destination, selected)), getAppOrigin()), { headers: { "Cache-Control": "private, no-store" } });
    } catch { /* Failed exchanges return to sign-in; no provider details leave the server. */ }
  }
  return NextResponse.redirect(new URL(recruitmentPath(authReturnPath(destination, selected, "failed")), getAppOrigin()), { headers: { "Cache-Control": "private, no-store" } });
}
