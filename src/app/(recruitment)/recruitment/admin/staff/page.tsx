import { Suspense } from "react";
import { listStaff } from "@/recruitment/lib/server/staff";
import { AccessGuard } from "@/app/(recruitment)/recruitment/components/access-guard";
import { StaffManager } from "../staff-manager";
import { administratorSession, AdminLoading, AdminUnavailable } from "../access";

async function StaffContent() {
  const session = await administratorSession();
  if (!session) return <AdminUnavailable />;
  const result = await listStaff(session.identity.id);
  if (!result.ok) return <AdminUnavailable title="Staff management is unavailable" />;
  return <AccessGuard accountId={session.identity.id} expected="administrator"><StaffManager key={session.identity.id} accountId={session.identity.id} initialStaff={result.data} /></AccessGuard>;
}
export default function StaffPage() { return <Suspense fallback={<AdminLoading view="staff" />}><StaffContent /></Suspense>; }
