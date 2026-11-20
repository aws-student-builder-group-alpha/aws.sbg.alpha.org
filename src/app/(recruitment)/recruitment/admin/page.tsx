import { Suspense } from "react";
import { listEvaluations } from "@/recruitment/lib/server/evaluations";
import { listStaff } from "@/recruitment/lib/server/staff";
import { readIntake } from "@/recruitment/lib/server/intake";
import { AccessGuard } from "@/app/(recruitment)/recruitment/components/access-guard";
import { AdminOverview } from "./overview";
import { administratorSession, AdminLoading, AdminUnavailable } from "./access";

async function OverviewContent() {
  const session = await administratorSession();
  if (!session) return <AdminUnavailable />;
  const id = session.identity.id;
  const [applications, staff, intake] = await Promise.all([listEvaluations(id).catch(() => null), listStaff(id).catch(() => null), readIntake(id).catch(() => null)]);
  if ([applications, staff, intake].some(result => result && !result.ok && result.code !== "UNAVAILABLE")) return <AdminUnavailable />;
  return <AccessGuard accountId={id} expected="administrator"><AdminOverview key={id} applications={applications?.ok ? applications.data : null} staff={staff?.ok ? staff.data : null} intake={intake?.ok ? intake.data : null} /></AccessGuard>;
}
export default function AdminPage() { return <Suspense fallback={<AdminLoading />}><OverviewContent /></Suspense>; }
