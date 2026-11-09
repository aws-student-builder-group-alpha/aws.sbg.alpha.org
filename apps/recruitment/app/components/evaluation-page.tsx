import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { accountSession } from "@/lib/server/session";
import { listEvaluations } from "@/lib/server/evaluations";
import type { EvaluationRole } from "@/lib/evaluations";
import { AccessGuard } from "./access-guard";
import { EvaluationWorkspace } from "./evaluation-workspace";
import { PageHeading } from "./ui";

export async function EvaluationPageContent({ role }: { role: EvaluationRole }) {
  const session = await accountSession();
  if (session.kind === "anonymous") redirect("/staff");
  if (session.kind === "applicant" || session.kind === "staff" && session.membership.role !== role) notFound();
  if (session.kind === "staff" && (session.membership.status !== "active" || role === "administrator" && session.needsMfa)) redirect("/staff");
  if (session.kind === "staff") {
    const result = await listEvaluations(session.identity.id);
    if (result.ok && result.data.role === role) return <AccessGuard accountId={session.identity.id} expected={role}><EvaluationWorkspace key={session.identity.id} accountId={session.identity.id} initialList={result.data} redesign /></AccessGuard>;
  }
  return <main id="main-content" className="container portal narrow"><PageHeading title="Applications are unavailable" description="Your access or application details could not be verified. No changes have been confirmed." /><Link className="button button-orange" href="/staff">Check staff access</Link></main>;
}
