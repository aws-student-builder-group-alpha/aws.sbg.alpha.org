import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { accountSession } from "@/lib/server/session";
import { signIn, signOut } from "@/app/auth/actions";
import { Callout } from "@/app/components/ui";
import { MfaForm } from "./mfa-form";
import { AccessGuard } from "@/app/components/access-guard";
import { GoogleSignInButton } from "@/app/components/process-shell";

export default function StaffPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <Suspense fallback={<main id="main-content" className="container portal narrow"><p role="status">Checking staff access…</p></main>}><StaffEntry searchParams={searchParams} /></Suspense>;
}
async function StaffEntry({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const session = await accountSession();
  if (session.kind === "staff" && session.membership.status === "active" && !session.needsMfa) redirect(session.membership.role === "administrator" ? "/admin" : "/reviewer");
  if (session.kind === "staff" && session.membership.status === "active" && session.membership.role === "administrator") {
    const { data, error } = await session.client.auth.mfa.listFactors();
    return <AccessGuard accountId={session.identity.id} expected="administrator-mfa"><main id="main-content" className="container portal workspace-redesign workspace-auth"><h1 className="sr-only">Administrator verification</h1>
      <div className="workspace-auth-content"><p className="workspace-account">Signed in as <strong>{session.identity.email}</strong></p>
      {error || !data ? <Callout tone="warning">Authenticator details could not be loaded. Reload and try again.</Callout> : <MfaForm accountId={session.identity.id} factors={data.totp.map(factor => ({ id: factor.id, name: factor.friendly_name || "Authenticator" }))} />}
      </div>
    </main></AccessGuard>;
  }
  const unavailable = session.kind === "unavailable" || session.kind === "unconfigured";
  if (session.kind === "anonymous") return <main id="main-content" className="container portal workspace-redesign workspace-auth workspace-anonymous">
    <section className="panel workspace-auth-content">
      <h1>Staff sign-in</h1>
      <p>Use the Google account approved for your recruitment role.</p>
      {query.auth && <Callout tone="error" title="Sign-in needs attention" role="alert">Sign-in was cancelled or could not be completed. Please try again.</Callout>}
      <form action={signIn}><input type="hidden" name="destination" value="staff" /><GoogleSignInButton /></form>
      <details className="workspace-help"><summary>About staff access</summary><p>Sign in once before an administrator can add your staff access. Administrators also verify an authenticator code. Use a separate account if you want to apply.</p><p>Signing in creates an authentication account. Read the <Link href="/privacy">privacy notice</Link> or <a href="mailto:awslc.alpha@gmail.com">contact Alpha</a>.</p></details>
    </section>
  </main>;
  return <main id="main-content" className="container portal workspace-redesign workspace-auth"><h1 className="sr-only">Staff sign-in</h1>
    <section className="panel prose workspace-auth-content">
      <h2>{unavailable ? "Staff access is unavailable" : "Staff sign-in"}</h2>
      <p>{unavailable ? "Your access could not be verified. Reload or contact the Alpha project owner." : "Use the Google account approved for your recruitment role."}</p>
      {query.auth && <Callout tone="error" title="Something needs attention" role="alert">Sign-in was cancelled or could not be completed. Please try again.</Callout>}
      {session.kind === "applicant" && <><h2>Staff access has not been added</h2><p>Signed in as {session.identity.email}. Ask an administrator to add this Google account. Use a separate account if you also want to apply.</p></>}
      {session.kind === "staff" && <><h2>Staff access is {session.membership.status}</h2><p>This account cannot open staff or applicant workspaces. Contact an administrator to review your access.</p></>}
      {!unavailable && <form action={signIn}><input type="hidden" name="destination" value="staff"/><button type="submit" className="button button-orange">Use another Google account</button></form>}
      {unavailable && <form action={signOut}><button type="submit" className="button button-secondary">Sign out of this browser</button></form>}
      <p><a href="mailto:awslc.alpha@gmail.com">Contact Alpha</a> · <Link href="/privacy">Privacy notice</Link></p>
    </section>
  </main>;
}
