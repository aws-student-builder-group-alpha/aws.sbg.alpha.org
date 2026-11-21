import Link from "next/link";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { loadApplicantDraft } from "@/recruitment/lib/server/drafts";
import { ApplicationContent } from "@/app/(recruitment)/recruitment/components/application-content";
import { ApplicantAccess } from "@/app/(recruitment)/recruitment/components/applicant-access";
import { Badge } from "@/app/(recruitment)/recruitment/components/ui";
import { formatDate } from "@/recruitment/lib/format-date";
import { AccessGuard } from "@/app/(recruitment)/recruitment/components/access-guard";
import { ApplicationPortal } from "./application-portal";
import { ApplicationSidebar } from "./application-sidebar";
import "./applications.css";
type ApplicationSearchParams = Promise<{ resume?: string | string[]; application?: string | string[] }>;

export default function ApplicationPage({ searchParams }: { searchParams: ApplicationSearchParams }) {
  return <Suspense fallback={<main id="main-content" className="container portal"><p role="status">Loading your application…</p></main>}><DraftPortal searchParams={searchParams} /></Suspense>;
}
async function DraftPortal({ searchParams }: { searchParams: ApplicationSearchParams }) {
  const result = await loadApplicantDraft();
  if (result.kind === "member") redirect("/recruitment/membership");
  if (result.kind === "staff") redirect("/recruitment/staff");
  if (result.kind !== "ready") return <ApplicantAccess redesign kind={result.kind} />;
  const params = await searchParams;
  if (result.draft && params.resume === "1") redirect("/recruitment/apply");
  const selected = typeof params.application === "string" ? result.applications.find(item => item.id === params.application) : undefined;
  if (params.application && !selected) notFound();
  const application = selected ?? (result.draft ? null : result.application);
  if (application) return <AccessGuard accountId={result.applicant.id} expected="applicant"><ApplicationPortal key={result.applicant.id + ":" + application.id} accountId={result.applicant.id} initialApplication={application} applications={result.applications} draft={result.draft} /></AccessGuard>;
  return (
    <AccessGuard accountId={result.applicant.id} expected="applicant"><main id="main-content" className="container portal workspace-redesign workspace-portal">
      <h1 className="sr-only">My applications</h1>
      <div className="applications-hub"><ApplicationSidebar applications={result.applications} draft={result.draft} />
      <div className="applications-detail"><div className="workspace-reading">
      <section className="panel">
        {result.draft && <Badge tone="orange">Draft</Badge>}
        <h2>{result.draft ? "Your saved draft" : "Start your application"}</h2>
        <p>{result.draft
          ? `Saved ${formatDate(result.draft.savedAt)} Philippine time. This draft is private to your account.`
          : "Create an application draft after reading the privacy notice and agreeing to recruitment processing."}</p>
        <Link href={result.draft ? "/recruitment/apply" : "/recruitment/apply?entry=1"} className="button button-orange">
          {result.draft ? "Continue my draft" : "Start my application"}
        </Link>
      </section>
      {result.draft && (
        <details className="panel submitted-details">
          <summary>View saved answers</summary>
          <ApplicationContent application={result.draft} />
        </details>
      )}
      </div></div></div>
    </main></AccessGuard>
  );
}
