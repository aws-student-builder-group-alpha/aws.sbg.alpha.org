import "server-only";
import { createSupabaseClient } from "@/lib/supabase/server";
import type { Applicant } from "@/lib/drafts";
import { membershipFromRow } from "@/lib/staff";

/** Identity is verified with Auth, never taken from the cookie's embedded user. */
export async function googleSession() {
  const client = await createSupabaseClient();
  if (!client) return { kind: "unconfigured" } as const;
  try {
    const { data: { user }, error } = await client.auth.getUser();
    if (!user) {
      if (error?.status && error.status >= 500) return { kind: "unavailable" } as const;
      return { kind: "anonymous" } as const;
    }
    if (error) return { kind: "unavailable" } as const;
    if (!user.email || !user.email_confirmed_at || !user.identities?.some(identity => identity.provider === "google")) return { kind: "anonymous" } as const;
    const identity: Applicant = { id: user.id, email: user.email, name: typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name.slice(0, 120) : "" };
    return { kind: "authenticated", client, identity } as const;
  } catch { return { kind: "unavailable" } as const; }
}

export async function accountSession() {
  const session = await googleSession();
  if (session.kind !== "authenticated") return session;
  try {
    const { data, error } = await session.client.from("staff_memberships").select("user_id,role,status,version").eq("user_id", session.identity.id).maybeSingle();
    if (error) return { kind: "unavailable" } as const;
    if (!data) return { ...session, kind: "applicant" } as const;
    const membership = membershipFromRow(data);
    if (!membership) return { kind: "unavailable" } as const;
    let needsMfa = membership.role === "administrator";
    if (membership.role === "administrator" && membership.status === "active") {
      const { data: claims, error: claimsError } = await session.client.auth.getClaims();
      if (claimsError || !claims || claims.claims.sub !== session.identity.id) return { kind: "unavailable" } as const;
      needsMfa = claims.claims.aal !== "aal2";
    }
    return { ...session, kind: "staff", membership, needsMfa } as const;
  } catch { return { kind: "unavailable" } as const; }
}

export async function applicantSession() {
  const session = await accountSession();
  if (session.kind === "applicant") return { kind: "authenticated", client: session.client, applicant: session.identity } as const;
  if (session.kind === "staff") return { kind: "staff" } as const;
  return session;
}
