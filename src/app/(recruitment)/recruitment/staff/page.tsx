import { Suspense } from "react";
import { redirect } from "next/navigation";
import { accountSession } from "@/recruitment/lib/server/session";
import { Callout } from "@/app/(recruitment)/recruitment/components/ui";
import { MfaForm } from "./mfa-form";
import { AccessGuard } from "@/app/(recruitment)/recruitment/components/access-guard";
import { StaffAccessView, StaffAuthPage } from "./staff-access";

export default function StaffPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <Suspense fallback={<StaffAccessView kind="loading" />}><StaffEntry searchParams={searchParams} /></Suspense>;
}
async function StaffEntry({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const session = await accountSession();
  if (session.kind === "staff" && session.membership.status === "active" && !session.needsMfa) redirect(session.membership.role === "administrator" ? "/recruitment/admin" : "/recruitment/reviewer");
  if (session.kind === "staff" && session.membership.status === "active" && session.membership.role === "administrator") {
    const { data, error } = await session.client.auth.mfa.listFactors();
    return <AccessGuard accountId={session.identity.id} expected="administrator-mfa"><StaffAuthPage wide title="Administrator verification" titleHidden={!error && !!data}>
      <p className="workspace-account">Signed in as <strong>{session.identity.email}</strong></p>
      {error || !data ? <Callout tone="warning">Authenticator details could not be loaded. Reload and try again.</Callout> : <MfaForm accountId={session.identity.id} factors={data.totp.map(factor => ({ id: factor.id, name: factor.friendly_name || "Authenticator" }))} />}
    </StaffAuthPage></AccessGuard>;
  }
  return <StaffAccessView kind={session.kind} email={session.kind === "applicant" || session.kind === "staff" ? session.identity.email : undefined} status={session.kind === "staff" ? session.membership.status : undefined} authError={!!query.auth} />;
}
