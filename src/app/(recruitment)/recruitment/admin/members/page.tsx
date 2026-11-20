import { Suspense } from "react";
import { AccessGuard } from "@/app/(recruitment)/recruitment/components/access-guard";
import { MemberAdministration } from "@/app/(recruitment)/recruitment/components/member-administration";
import { AdminPageHeader } from "@/app/(recruitment)/recruitment/components/admin-shell";
import { administratorSession, AdminLoading, AdminUnavailable } from "../access";

async function MembersContent() {
  const session = await administratorSession();
  if (!session) return <AdminUnavailable />;
  return <AccessGuard accountId={session.identity.id} expected="administrator"><main id="main-content" className="admin-page"><AdminPageHeader title="Organization members" description="Invite existing members and manage their Alpha membership access." /><div className="community-admin-extras"><MemberAdministration key={session.identity.id} accountId={session.identity.id} workspace /></div></main></AccessGuard>;
}
export default function MembersPage() { return <Suspense fallback={<AdminLoading view="members" />}><MembersContent /></Suspense>; }
