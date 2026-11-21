import { AdminPageSkeleton } from "@/app/(recruitment)/recruitment/components/workspace-skeleton";
import { Suspense } from "react";
import { readIntake } from "@/recruitment/lib/server/intake";
import { AccessGuard } from "@/app/(recruitment)/recruitment/components/access-guard";
import { IntakeWorkspace } from "@/app/(recruitment)/recruitment/components/intake-workspace";
import { administratorSession, AdminUnavailable } from "../access";

async function IntakeContent() {
  const session = await administratorSession();
  if (session) {
    const result = await readIntake(session.identity.id);
    if (result.ok) return <AccessGuard accountId={session.identity.id} expected="administrator"><IntakeWorkspace key={session.identity.id} accountId={session.identity.id} initialState={result.data} /></AccessGuard>;
  }
  return <AdminUnavailable title="Intake is unavailable" />;
}
export default function IntakePage() {
  return <Suspense fallback={<AdminPageSkeleton view="intake" />}><IntakeContent /></Suspense>;
}
