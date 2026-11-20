import { AdminPageSkeleton, type AdminSkeletonView } from "@/app/(recruitment)/recruitment/components/workspace-skeleton";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { accountSession } from "@/recruitment/lib/server/session";
import { AdminPageHeader } from "@/app/(recruitment)/recruitment/components/admin-shell";

export async function administratorSession() {
  const session = await accountSession();
  if (session.kind === "anonymous") redirect("/recruitment/staff");
  if (session.kind === "applicant" || session.kind === "staff" && session.membership.role !== "administrator") notFound();
  if (session.kind === "staff" && (session.membership.status !== "active" || session.needsMfa)) redirect("/recruitment/staff");
  return session.kind === "staff" ? session : null;
}

export function AdminUnavailable({ title = "Administration is unavailable" }: { title?: string }) {
  return <main id="main-content" className="admin-page"><AdminPageHeader title={title} description="Your access or details could not be verified. No changes have been confirmed." /><section className="admin-surface"><Link href="/recruitment/staff" className="button button-orange">Check staff access</Link></section></main>;
}

export function AdminLoading({ view = "overview" }: { view?: AdminSkeletonView }) {
  return <AdminPageSkeleton view={view} />;
}
