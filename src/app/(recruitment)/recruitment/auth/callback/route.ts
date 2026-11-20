import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authReturnPath } from "@/recruitment/lib/auth-return";
import { memberEntry } from "@/recruitment/lib/member-entry";
import { getAppOrigin } from "@/recruitment/lib/supabase/config";
import { createSupabaseClient } from "@/recruitment/lib/supabase/server";

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code");
  const cookieStore = await cookies();
  const selected = cookieStore.get("alpha-opportunity")?.value;
  const choice = cookieStore.get("alpha-auth-destination")?.value;
  const destination = choice === "staff" ? "staff" : choice === "membership" ? "membership" : "apply";
  cookieStore.delete("alpha-opportunity");
  cookieStore.delete("alpha-auth-destination");

  const headers = { "Cache-Control": "private, no-store" };
  const origin = getAppOrigin();
  const client = await createSupabaseClient();
  if (!client) return NextResponse.redirect(new URL(authReturnPath(destination, selected, "unconfigured"), origin), { headers });
  if (code) {
    try {
      const { error } = await client.auth.exchangeCodeForSession(code);
      if (!error) {
        const path = destination === "apply" && await memberEntry(client) === "membership"
          ? "/recruitment/membership" : authReturnPath(destination, selected);
        return NextResponse.redirect(new URL(path, origin), { headers });
      }
    } catch { /* Return to sign-in without exposing provider errors. */ }
  }
  return NextResponse.redirect(new URL(authReturnPath(destination, selected, "failed"), origin), { headers });
}
