"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getOpportunity } from "@/lib/catalog";
import { authReturnPath } from "@/lib/auth-return";
import { createSupabaseClient } from "@/lib/supabase/server";
import { getAppOrigin } from "@/lib/supabase/config";
import { recruitmentBasePath, recruitmentPath } from "@/lib/site-paths";
import { googleSession } from "@/lib/server/session";

export async function startApplication(form: FormData) {
  const opportunity = form.get("opportunity");
  const returnPath = authReturnPath("apply", opportunity);
  if (recruitmentBasePath && process.env.ALPHA_PRACTICE_FORM === "1") redirect(returnPath);
  const session = await googleSession();
  if (session.kind === "authenticated") redirect(returnPath);
  if (session.kind === "unconfigured") redirect(authReturnPath("apply", opportunity, "unconfigured"));
  if (session.kind === "unavailable") redirect(authReturnPath("apply", opportunity, "failed"));
  await beginGoogleSignIn("apply", opportunity);
}

export async function signIn(form: FormData) {
  const destination = form.get("destination") === "staff" ? "staff" : form.get("destination") === "membership" ? "membership" : "apply";
  await beginGoogleSignIn(destination, form.get("opportunity"));
}

async function beginGoogleSignIn(destination: "apply" | "staff" | "membership", choice: FormDataEntryValue | null) {
  const client = await createSupabaseClient();
  if (!client) redirect(authReturnPath(destination, choice, "unconfigured"));
  const cookieStore = await cookies();
  const selected = destination === "apply" && typeof choice === "string" ? getOpportunity(choice) : undefined;
  cookieStore.set("alpha-auth-destination", destination, { httpOnly: true, sameSite: "lax", secure: getAppOrigin().startsWith("https:"), path: "/", maxAge: 600 });
  cookieStore.set("alpha-opportunity", selected?.id || "", { httpOnly: true, sameSite: "lax", secure: getAppOrigin().startsWith("https:"), path: "/", maxAge: selected ? 600 : 0 });
  let providerUrl: string | null = null;
  try {
    const { data, error } = await client.auth.signInWithOAuth({ provider: "google", options: { redirectTo: getAppOrigin() + recruitmentPath("/auth/callback"), scopes: "openid email profile", queryParams: { prompt: "select_account" } } });
    if (!error) providerUrl = data.url;
  } catch { /* Show the retryable access screen without exposing provider errors. */ }
  if (providerUrl) redirect(providerUrl);
  cookieStore.delete("alpha-opportunity");
  cookieStore.delete("alpha-auth-destination");
  redirect(authReturnPath(destination, selected?.id, "failed"));
}
export async function signOut() {
  const client = await createSupabaseClient();
  if (client) {
    let failed = false;
    try {
      const { error } = await client.auth.signOut({ scope: "local" });
      failed = Boolean(error);
    } catch { failed = true; }
    if (failed) redirect("/apply?auth=signout-failed");
  }
  redirect("/");
}
