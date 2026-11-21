import { Suspense } from "react";
import { AccessGuard } from "@/app/(recruitment)/recruitment/components/access-guard";
import { SecurityLog } from "@/app/(recruitment)/recruitment/components/member-administration";
import { AdminPageHeader } from "@/app/(recruitment)/recruitment/components/admin-shell";
import { administratorSession, AdminLoading, AdminUnavailable } from "../access";

async function ActivityContent() {
  const session = await administratorSession();
  if (!session) return <AdminUnavailable />;
  return <AccessGuard accountId={session.identity.id} expected="administrator"><main id="main-content" className="admin-page"><AdminPageHeader title="Security activity" description="Inspect recent application, document, membership and delivery events." /><div className="community-admin-extras"><SecurityLog key={session.identity.id} accountId={session.identity.id} /></div></main></AccessGuard>;
}
export default function ActivityPage() { return <Suspense fallback={<AdminLoading view="activity" />}><ActivityContent /></Suspense>; }
