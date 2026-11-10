import Link from "next/link";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { accountSession } from "@/lib/server/session";
import { listStaff } from "@/lib/server/staff";
import { AccessGuard } from "@/app/components/access-guard";
import { PageHeading } from "@/app/components/ui";
import { StaffManager } from "./staff-manager";
import { MemberAdministration,SecurityLog } from '@/app/components/member-administration';

export default function AdminPage() {
  return <Suspense fallback={<main id="main-content" className="container portal"><p role="status">Checking administrator access…</p></main>}><AdminContent /></Suspense>;
}
async function AdminContent() {
  const session = await accountSession();
  if (session.kind === "anonymous") redirect("/staff");
  if (session.kind === "applicant" || session.kind === "staff" && session.membership.role !== "administrator") notFound();
  if (session.kind === "staff" && (session.membership.status !== "active" || session.needsMfa)) redirect("/staff");
  if (session.kind === "staff") {
    const result = await listStaff(session.identity.id);
    if (result.ok) return <AccessGuard accountId={session.identity.id} expected="administrator"><div className="admin-page-stack"><StaffManager key={session.identity.id} accountId={session.identity.id} initialStaff={result.data} /><div className="container community-admin-extras"><MemberAdministration accountId={session.identity.id}/><SecurityLog accountId={session.identity.id}/></div></div></AccessGuard>;
  }
  return <main id="main-content" className="container portal narrow"><PageHeading title="Staff management is unavailable" description="Your access or staff details could not be verified. No changes have been confirmed." /><Link href="/staff" className="button button-orange">Check staff access</Link></main>;
}
