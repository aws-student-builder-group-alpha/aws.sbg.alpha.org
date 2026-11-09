import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getAppOrigin, getSupabaseConfig } from "@/lib/supabase/config";
import { recruitmentBasePath, recruitmentPath } from "@/lib/site-paths";
import type { Database } from "@/lib/supabase/schema";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const config = getSupabaseConfig();
  if (config) {
    const client = createServerClient<Database>(config.url, config.key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(values, headers) {
          for (const { name, value } of values) request.cookies.set(name, value);
          const previous = response;
          response = NextResponse.next({ request });
          for (const cookie of previous.cookies.getAll()) response.cookies.set(cookie);
          for (const { name, value, options } of values) response.cookies.set(name, value, options);
          if (headers) new Headers(headers).forEach((value, name) => response.headers.set(name, value));
        },
      },
    });
    try { await client.auth.getClaims(); } catch { /* Protected pages and actions verify identity again and fail closed. */ }
    // Page-level checks remain mandatory. This early GET gate also preserves a
    // real HTTP 404 before a Suspense shell starts streaming for a wrong role.
    const adminPath = request.nextUrl.pathname === "/admin" || request.nextUrl.pathname.startsWith("/admin/");
    if (["GET", "HEAD"].includes(request.method) && (adminPath || request.nextUrl.pathname === "/reviewer")) {
      const staffUrl = new URL(recruitmentPath("/staff"), recruitmentBasePath ? getAppOrigin() : request.url);
      const replace = (next: NextResponse) => {
        for (const cookie of response.cookies.getAll()) next.cookies.set(cookie);
        for (const name of ["cache-control", "expires", "pragma"]) {
          const value = response.headers.get(name);
          if (value) next.headers.set(name, value);
        }
        next.headers.set("Cache-Control", "private, no-store");
        response = next;
      };
      try {
        const { data: { user }, error } = await client.auth.getUser();
        if (error || !user || !user.email_confirmed_at || !user.identities?.some(identity => identity.provider === "google")) {
          replace(NextResponse.redirect(staffUrl));
        } else {
          const { data: membership, error: membershipError } = await client.from("staff_memberships").select("role,status").eq("user_id", user.id).maybeSingle();
          if (membershipError) replace(NextResponse.redirect(staffUrl));
          else if (!membership || membership.role !== (adminPath ? "administrator" : "evaluator")) {
            replace(NextResponse.rewrite(new URL(recruitmentPath("/404"), request.url), { status: 404, request: { headers: request.headers } }));
          } else if (membership.status !== "active") replace(NextResponse.redirect(staffUrl));
        }
      } catch { replace(NextResponse.redirect(staffUrl)); }
    }
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|brand/).*)"] };
