import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { accountSession } from "@/lib/server/session";
import { readIntake } from "@/lib/server/intake";
import { AccessGuard } from "@/app/components/access-guard";
import { IntakeWorkspace } from "@/app/components/intake-workspace";
import { PageHeading } from "@/app/components/ui";

async function IntakeContent() {
  const session = await accountSession();
  if (session.kind === "anonymous") redirect("/staff");
  if (session.kind === "applicant" || session.kind === "staff" && session.membership.role !== "administrator") notFound();
  if (session.kind === "staff" && (session.membership.status !== "active" || session.needsMfa)) redirect("/staff");
  if (session.kind === "staff") {
    const result = await readIntake(session.identity.id);
    if (result.ok) return <AccessGuard accountId={session.identity.id} expected="administrator"><IntakeWorkspace key={session.identity.id} accountId={session.identity.id} initialState={result.data} /></AccessGuard>;
  }
  return <main id="main-content" className="container portal narrow"><PageHeading title="Intake is unavailable" description="Administrator access or intake details could not be verified." /><Link href="/staff" className="button button-orange">Check staff access</Link></main>;
}
export default function IntakePage() {
  return <Suspense fallback={<main id="main-content" className="container portal"><p role="status">Checking administrator access...</p></main>}><IntakeContent /></Suspense>;
}
